import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, COLLECTIONS, NODE, PLAYLISTS, SEARCHABLE, SOURCES } from './config.mjs';
import { nodeInfo, resolveUrl, searchLavalink, unavailableMessage } from './lavalink.mjs';
import { resolveAudio, searchSoundCloud, searchYouTube } from './audio.mjs';
import { ensureYtDlp, ytdlpStatus } from './ytdlp.mjs';
import { getLyrics } from './lyrics.mjs';
import { decodeToken } from './token.mjs';
import { accountRouter } from './account.mjs';
import { importPlaylist } from './imports.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const requestedPort = Number(process.env.API_PORT || process.env.PORT);
const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', accountRouter());

const memo = new Map();
function cached(key, ttl, producer) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = Promise.resolve()
    .then(producer)
    .catch((error) => {
      memo.delete(key);
      throw error;
    });
  memo.set(key, { at: Date.now(), value });
  return value;
}

// The free Lavalink node goes down now and then. yt-dlp can search YouTube on
// its own, so keep browsing usable while the node is unavailable instead of
// returning an empty page.
function youtubeFallback(query, limit) {
  return cached(`yt-dlp-search:${limit}:${query.toLowerCase()}`, 3 * 60_000, () =>
    searchYouTube(query, limit),
  );
}

async function fallbackSearch(query, limit) {
  try {
    const tracks = await youtubeFallback(query, Math.max(limit, 10));
    if (tracks.length) return { tracks: tracks.slice(0, limit), unavailable: false, reason: null };
  } catch {
    /* no fallback available either */
  }
  return null;
}

async function searchSource(sourceId, query, limit = 12) {
  if (sourceId === 'soundcloud') {
    try {
      const tracks = await searchSoundCloud(query, limit);
      return { tracks, unavailable: false, reason: null };
    } catch (error) {
      return (await fallbackSearch(query, limit)) || { tracks: [], unavailable: true, reason: error.message };
    }
  }
  try {
    const result = await searchLavalink(sourceId, query, limit);
    if (!result.unavailable && result.tracks.length) return result;
    return (await fallbackSearch(query, limit)) || result;
  } catch (error) {
    return (await fallbackSearch(query, limit)) || { tracks: [], unavailable: true, reason: error.message };
  }
}

function dedupeKey(track) {
  return `${track.title}|${track.artist}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
}

async function searchEverywhere(query) {
  const limit = 8;
  const batches = await Promise.all(
    SEARCHABLE.map(async (source) => {
      const result = await searchSource(source, query, limit);
      return result.tracks;
    }),
  );
  const merged = [];
  const seen = new Set();
  for (let index = 0; index < limit; index += 1) {
    for (const batch of batches) {
      const track = batch[index];
      if (!track) continue;
      const key = dedupeKey(track);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(track);
      if (merged.length >= 30) return merged;
    }
  }
  return merged;
}

async function resolveFeedItem(item, limit) {
  if (item.playlist) {
    try {
      const resolved = await resolveUrl('spotify', item.playlist, limit);
      if (resolved.tracks.length) return resolved;
    } catch {
      /* fall back to a text search */
    }
  }
  return searchSource(item.source, item.query, limit);
}

async function buildFeed(categoryId) {
  const category = CATEGORIES.find((item) => item.id === categoryId) || CATEGORIES[0];
  const [collectionResults, popular, playlistResults] = await Promise.all([
    Promise.all(
      COLLECTIONS.map(async (collection) => {
        const result = await resolveFeedItem(collection, 16);
        return {
          id: collection.id,
          title: collection.title,
          subtitle: collection.subtitle,
          gradient: collection.gradient,
          artwork: result.tracks[0]?.artwork || null,
          tracks: result.tracks,
        };
      }),
    ),
    resolveFeedItem(category, 16),
    Promise.all(
      PLAYLISTS.map(async (playlist) => {
        const result = await resolveFeedItem(playlist, 12);
        return {
          id: playlist.id,
          name: playlist.name,
          artwork: result.tracks[0]?.artwork || null,
          tracks: result.tracks,
        };
      }),
    ),
  ]);

  return {
    category: category.id,
    categories: CATEGORIES.map(({ id, label }) => ({ id, label })),
    collections: collectionResults.filter((collection) => collection.tracks.length > 0),
    popular: popular.tracks,
    playlists: playlistResults.filter((playlist) => playlist.tracks.length > 0),
    sources: SOURCES.filter((source) => !source.hidden).map(({ id, name, accent, tag }) => ({
      id,
      name,
      accent,
      tag,
    })),
  };
}

let nodeDownUntil = 0;
let nodeError = null;

async function nodeHealth() {
  if (Date.now() < nodeDownUntil) return { ok: false, error: nodeError || 'Lavalink node unreachable' };
  try {
    const info = await cached('node-info', 60_000, nodeInfo);
    nodeDownUntil = 0;
    nodeError = null;
    return { ok: true, version: info.version?.semver || '4.x' };
  } catch (error) {
    nodeDownUntil = Date.now() + 60_000;
    nodeError = error.message;
    return { ok: false, error: error.message };
  }
}

app.get('/api/health', async (_req, res) => {
  const sources = SOURCES.filter((source) => !source.hidden).map((source) => source.name);
  const node = await nodeHealth();
  if (node.ok) {
    return res.json({
      ok: true,
      mode: 'lavalink',
      node: NODE.label,
      version: node.version,
      sources,
      ytdlp: ytdlpStatus(),
    });
  }
  const direct = ytdlpStatus().ok || (await ensureYtDlp().then(() => true).catch(() => false));
  if (direct) {
    return res.json({
      ok: true,
      mode: 'ytdlp',
      node: NODE.label,
      version: 'direct',
      sources,
      ytdlp: ytdlpStatus(),
      nodeError: node.error,
    });
  }
  res.status(503).json({ ok: false, node: NODE.label, error: node.error, ytdlp: ytdlpStatus() });
});

app.post('/api/import/playlist', async (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Paste a full playlist link starting with https://' });
  }
  try {
    const playlist = await cached(`import:${url}`, 10 * 60_000, () => importPlaylist(url));
    res.json({ playlist });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/feed', async (req, res) => {
  const category = String(req.query.category || 'all');
  try {
    const feed = await cached(`feed:${category}`, 5 * 60_000, () => buildFeed(category));
    res.json(feed);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const source = String(req.query.source || 'all');
  if (!query) return res.json({ tracks: [], top: null, warning: null });

  try {
    if (source === 'all' || source === '') {
      const tracks = await searchEverywhere(query);
      return res.json({ tracks, top: tracks[0] || null, warning: null });
    }
    const result = await cached(`search:${source}:${query.toLowerCase()}`, 3 * 60_000, () =>
      searchSource(source, query, 24),
    );
    res.json({
      tracks: result.tracks,
      top: result.tracks[0] || null,
      warning: result.unavailable ? unavailableMessage(source) : null,
    });
  } catch (error) {
    res.status(502).json({ tracks: [], top: null, warning: error.message });
  }
});

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\.?.*$/, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildArtist(name) {
  const wanted = normalizeName(name);
  const results = await Promise.all([
    searchSource('ytmusic', name, 30),
    searchSource('spotify', name, 20),
  ]);

  const seen = new Set();
  const unique = [];
  for (const track of results.flatMap((result) => result.tracks)) {
    const key = dedupeKey(track);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(track);
  }

  const matches = wanted
    ? unique.filter((track) => {
        const performer = normalizeName(track.artist);
        if (!performer) return false;
        if (performer === wanted || performer.includes(wanted) || wanted.includes(performer)) return true;
        return performer.split(' ').some((part) => part.length > 3 && wanted.includes(part));
      })
    : [];

  const tracks = [...matches, ...unique.filter((track) => !matches.includes(track))].slice(0, 24);
  return {
    name,
    artwork: matches[0]?.artwork || tracks[0]?.artwork || null,
    tracks,
  };
}

app.get('/api/artist', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'missing artist name' });
  try {
    const data = await cached(`artist:${name.toLowerCase()}`, 10 * 60_000, () => buildArtist(name));
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/lyrics', async (req, res) => {
  const track = {
    encoded: req.query.encoded ? String(req.query.encoded) : null,
    title: String(req.query.title || ''),
    artist: String(req.query.artist || ''),
    duration: Number(req.query.duration || 0),
  };
  if (!track.title) return res.status(400).json({ error: 'missing title' });
  try {
    const key = `lyrics:${track.encoded || `${track.title}|${track.artist}`}`;
    const lyrics = await cached(key, 30 * 60_000, () => getLyrics(track));
    res.json(lyrics);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/stream', async (req, res) => {
  const token = String(req.query.t || '');
  const track = decodeToken(token);
  if (!track) return res.status(400).send('Invalid track token');

  try {
    const url = await resolveAudio(track);
    const headers = { 'User-Agent': UA, Accept: '*/*' };
    if (req.headers.range) headers.Range = req.headers.range;

    let upstream = await fetch(url, { headers, redirect: 'follow' });
    if (upstream.status === 403 || upstream.status === 410) {
      upstream = await fetch(url, { headers, redirect: 'follow' });
    }
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).send(`Upstream audio error ${upstream.status}`);
    }

    res.status(upstream.status);
    for (const header of [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ]) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    res.setHeader('Cache-Control', 'no-store');

    if (!upstream.body) return res.end();
    const stream = Readable.fromWeb(upstream.body);
    stream.on('error', () => res.destroy());
    req.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) {
    console.error('[stream]', error.message);
    if (!res.headersSent) res.status(502).send('Could not resolve audio for this track');
  }
});

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// 127.0.0.1 keeps the dev server private. Set HOST=0.0.0.0 to let phones on
// the same Wi-Fi reach the app (needed for the Android build).
// Default to 0.0.0.0 so the app is reachable from phones on the same Wi-Fi
// (and from cloud hosts, which inject PORT and expect a public bind).
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[api] Soul music server on http://${HOST}:${PORT}`);
  console.log(`[api] Lavalink node: ${NODE.label} (${NODE.secure ? 'https' : 'http'}://${NODE.host}:${NODE.port})`);
});

// Playback needs yt-dlp, and hosts like Render do not ship it. Resolve (or
// download) it at boot so the first play does not have to wait for 30 MB.
ensureYtDlp().catch((error) => {
  console.warn(`[yt-dlp] unavailable: ${error.message}`);
  console.warn('[yt-dlp] /api/stream will fail until the binary can be installed');
});
