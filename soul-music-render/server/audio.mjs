import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { makeToken } from './token.mjs';
import { ensureYtDlp } from './ytdlp.mjs';

// The bundled yt-dlp is a self-extracting binary; keep its temp files inside
// the project so it does not depend on the system temp drive having space.
const TEMP_DIR = path.resolve(process.cwd(), 'tmp', 'yt-dlp');
try {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
} catch {
  /* ignore */
}

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 3;
const MAX_CONCURRENT = 3;

let active = 0;
const waiting = [];

function acquire() {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  active -= 1;
  const next = waiting.shift();
  if (next) {
    active += 1;
    next();
  }
}

function spawnYtDlp(bin, args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      env: { ...process.env, TMP: TEMP_DIR, TEMP: TEMP_DIR, TMPDIR: TEMP_DIR },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Audio lookup timed out'));
    }, timeout);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim().split('\n').pop() || 'Audio lookup failed'));
    });
  });
}

async function runYtDlp(args, timeout = 30000) {
  const bin = await ensureYtDlp();
  try {
    return await spawnYtDlp(bin, args, timeout);
  } catch (error) {
    // The binary was resolved but vanished (or was replaced); heal once.
    if (error.code !== 'ENOENT') throw error;
    return spawnYtDlp(await ensureYtDlp({ force: true }), args, timeout);
  }
}

function directTarget(track) {
  const source = track.source;
  const uri = track.uri || '';
  if (source === 'soundcloud' && uri) return uri;
  if ((source === 'youtube' || source === 'ytmusic') && /^[\w-]{11}$/.test(track.identifier || '')) {
    return `https://www.youtube.com/watch?v=${track.identifier}`;
  }
  if (/\.(m4a|mp3|ogg|opus|webm|aac|flac)(\?|$)/i.test(uri)) return uri;
  return null;
}

function searchTarget(track) {
  const query = [track.artist, track.title].filter(Boolean).join(' ').trim();
  return `ytsearch1:${query || 'music'}`;
}

async function extract(target) {
  const stdout = await runYtDlp([
    '-g',
    '--no-warnings',
    '--no-playlist',
    '--no-progress',
    '-f',
    'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
    '--',
    target,
  ]);
  const urls = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//.test(line));
  if (!urls.length) throw new Error('No audio stream returned');
  return urls[urls.length - 1];
}

export async function resolveAudio(track) {
  const key = [track.source, track.identifier, track.title, track.artist, track.uri].join('|');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.url;

  await acquire();
  try {
    const direct = directTarget(track);
    let url;
    if (direct) {
      try {
        url = await extract(direct);
      } catch {
        url = await extract(searchTarget(track));
      }
    } else {
      url = await extract(searchTarget(track));
    }
    cache.set(key, { url, at: Date.now() });
    if (cache.size > 250) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    return url;
  } finally {
    release();
  }
}

export async function youtubePlaylist(url, limit = 60) {
  const stdout = await runYtDlp(
    [
      '-J',
      '--flat-playlist',
      '--no-warnings',
      '--ignore-errors',
      '--playlist-end',
      String(limit),
      '--',
      url,
    ],
    60000,
  );
  const data = JSON.parse(stdout);
  const entries = (Array.isArray(data.entries) ? data.entries : []).filter(
    (entry) => entry && entry.id && entry.title,
  );
  const tracks = entries.map((entry) => {
    const artist =
      String(entry.channel || entry.uploader || 'YouTube Music')
        .replace(/\s*-\s*Topic$/i, '')
        .replace(/\s*VEVO$/i, '')
        .trim() || 'YouTube Music';
    const thumbnails = Array.isArray(entry.thumbnails) ? entry.thumbnails : [];
    return {
      id: `ytm:${entry.id}`,
      stream: makeToken({
        t: entry.title,
        a: artist,
        s: 'ytmusic',
        u: `https://www.youtube.com/watch?v=${entry.id}`,
        i: entry.id,
      }),
      title: String(entry.title),
      artist,
      duration: Math.round((Number(entry.duration) || 0) * 1000),
      artwork: thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
      source: 'ytmusic',
      sourceName: 'YouTube Music',
      uri: `https://www.youtube.com/watch?v=${entry.id}`,
      encoded: null,
      isStream: false,
    };
  });
  return {
    name: String(data.title || 'YouTube Music playlist'),
    tracks,
    total: entries.length,
  };
}

// Search fallback used when the Lavalink node is unreachable: yt-dlp talks to
// YouTube directly, so browsing and playback keep working without a node.
export async function searchYouTube(query, limit = 10) {
  const stdout = await runYtDlp(
    ['-J', '--flat-playlist', '--no-warnings', '--ignore-errors', `ytsearch${Math.max(limit, 5)}:${query}`],
    30000,
  );
  const data = JSON.parse(stdout);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries
    .filter((entry) => entry && entry.id && entry.title)
    .slice(0, limit)
    .map((entry) => {
      const artist =
        String(entry.channel || entry.uploader || 'YouTube')
          .replace(/\s*-\s*Topic$/i, '')
          .replace(/\s*VEVO$/i, '')
          .trim() || 'YouTube';
      const thumbnails = Array.isArray(entry.thumbnails) ? entry.thumbnails : [];
      const uri = `https://www.youtube.com/watch?v=${entry.id}`;
      return {
        id: `yt:${entry.id}`,
        stream: makeToken({
          t: entry.title,
          a: artist,
          s: 'ytmusic',
          u: uri,
          i: entry.id,
        }),
        title: String(entry.title),
        artist,
        duration: Math.round((Number(entry.duration) || 0) * 1000),
        artwork: thumbnails[thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
        source: 'ytmusic',
        sourceName: 'YouTube Music',
        uri,
        encoded: null,
        isStream: false,
      };
    });
}

export async function searchSoundCloud(query, limit = 10) {
  const stdout = await runYtDlp(
    ['-J', '--flat-playlist', '--no-warnings', `scsearch${Math.max(limit, 5)}:${query}`],
    25000,
  );
  const data = JSON.parse(stdout);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  return entries
    .filter((entry) => entry && entry.title && entry.url)
    .slice(0, limit)
    .map((entry) => ({
      id: `sc:${entry.id}`,
      stream: makeToken({
        t: entry.title,
        a: entry.uploader || 'SoundCloud',
        s: 'soundcloud',
        u: entry.webpage_url || entry.url,
        i: entry.id,
      }),
      title: entry.title,
      artist: entry.uploader || 'SoundCloud',
      duration: Math.round((Number(entry.duration) || 0) * 1000),
      artwork: entry.thumbnails?.[0]?.url || null,
      source: 'soundcloud',
      sourceName: 'SoundCloud',
      uri: entry.webpage_url || entry.url,
      encoded: null,
      isStream: false,
    }));
}
