import { fetchNodeLyrics } from './lavalink.mjs';

const LRCLIB = 'https://lrclib.net/api';
const USER_AGENT = 'SoulMusic/1.0 (Lavalink music app)';

function parseLrc(lrc) {
  const lines = [];
  for (const raw of String(lrc).split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
      lines.push({ time: Math.round((minutes * 60 + seconds + fraction) * 1000), duration: null, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLrclib(track) {
  const params = new URLSearchParams({ artist_name: track.artist, track_name: track.title });
  if (track.duration) params.set('duration', String(Math.round(track.duration / 1000)));
  try {
    const res = await fetch(`${LRCLIB}/get?${params}`, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return res.json();
  } catch {
    /* fall through to search */
  }
  try {
    const res = await fetch(`${LRCLIB}/search?${new URLSearchParams({ q: `${track.title} ${track.artist}` })}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || !results.length) return null;
    return results.find((item) => item.syncedLyrics) || results[0];
  } catch {
    return null;
  }
}

function fromLrclib(item) {
  const synced = item.syncedLyrics ? parseLrc(item.syncedLyrics) : [];
  const plain = item.plainLyrics || '';
  if (synced.length) {
    return { synced: true, provider: 'LRCLIB', source: 'lrclib', lines: synced, plain };
  }
  return {
    synced: false,
    provider: 'LRCLIB',
    source: 'lrclib',
    lines: plain
      ? plain.split(/\r?\n/).map((text) => ({ time: 0, duration: null, text }))
      : [],
    plain,
  };
}

export async function getLyrics(track) {
  const node = await fetchNodeLyrics(track.encoded);
  if (node && node.lines.length) {
    const meaningful = node.lines.filter((line) => line.text.trim()).length;
    if (meaningful >= 2) {
      return {
        synced: node.lines.some((line) => line.time > 0),
        provider: node.provider,
        source: node.source,
        lines: node.lines,
        plain: node.plain,
      };
    }
  }
  const lrclib = await fetchLrclib(track);
  if (lrclib) {
    const parsed = fromLrclib(lrclib);
    if (parsed.lines.length) return parsed;
  }
  if (node) {
    return {
      synced: false,
      provider: node.provider,
      source: node.source,
      lines: node.lines,
      plain: node.plain,
    };
  }
  return { synced: false, provider: null, source: null, lines: [], plain: '' };
}
