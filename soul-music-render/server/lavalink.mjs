import { BASE, NODE, SOURCE_MAP, UNSUPPORTED_HINT } from './config.mjs';
import { makeToken } from './token.mjs';

async function request(path, { timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${BASE}${path}`, {
      headers: { Authorization: NODE.password, Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function nodeInfo() {
  const res = await request('/v4/info', { timeout: 8000 });
  if (!res.ok) throw new Error(`Lavalink responded ${res.status}`);
  return res.json();
}

/** @returns {{tracks: any[], unavailable: boolean, reason: string|null}} */
export async function loadTracks(identifier) {
  const res = await request(`/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`);
  if (!res.ok) return { tracks: [], unavailable: true, reason: `Node responded ${res.status}` };
  const data = await res.json();
  if (data.loadType === 'error') {
    return { tracks: [], unavailable: true, reason: data.data?.message || data.exception?.message || null };
  }
  if (data.loadType === 'empty') return { tracks: [], unavailable: false, reason: null };
  const list = data.loadType === 'playlist' ? data.data?.tracks || [] : data.data || [];
  return { tracks: list, unavailable: false, reason: null };
}

export function normalizeTrack(raw, sourceId) {
  const info = raw?.info || {};
  const meta = SOURCE_MAP.get(sourceId);
  return {
    id: raw.encoded,
    stream: makeToken({
      t: info.title,
      a: info.author,
      s: sourceId,
      u: info.uri,
      i: info.identifier,
    }),
    title: info.title || 'Unknown title',
    artist: info.author || 'Unknown artist',
    duration: Number(info.length) || 0,
    artwork: info.artworkUrl || null,
    source: sourceId,
    sourceName: meta?.name || info.sourceName || sourceId,
    uri: info.uri || null,
    encoded: raw.encoded || null,
    isStream: Boolean(info.isStream),
  };
}

export function unavailableMessage(sourceId) {
  const meta = SOURCE_MAP.get(sourceId);
  return `${meta?.name || sourceId} search is not available on this Lavalink node. ${UNSUPPORTED_HINT}`;
}

export async function resolveUrl(sourceId, url, limit = 20) {
  const result = await loadTracks(url);
  if (result.unavailable) return { tracks: [], unavailable: true, reason: result.reason };
  const tracks = result.tracks
    .map((raw) => normalizeTrack(raw, sourceId))
    .filter((track) => track.id && track.title)
    .slice(0, limit);
  return { tracks, unavailable: false, reason: null };
}

export async function searchLavalink(sourceId, query, limit = 12) {
  const meta = SOURCE_MAP.get(sourceId);
  if (!meta?.prefix) return { tracks: [], unavailable: true, reason: 'No search prefix' };
  const result = await loadTracks(`${meta.prefix}:${query}`);
  if (result.unavailable) {
    return { tracks: [], unavailable: true, reason: result.reason };
  }
  const tracks = result.tracks
    .map((raw) => normalizeTrack(raw, sourceId))
    .filter((track) => track.id && track.title)
    .slice(0, limit);
  return { tracks, unavailable: false, reason: null };
}

export async function fetchNodeLyrics(encoded) {
  if (!encoded) return null;
  try {
    const res = await request(`/v4/lyrics?track=${encodeURIComponent(encoded)}&skipTrackSource=false`, {
      timeout: 9000,
    });
    if (res.status !== 200) return null;
    const data = await res.json();
    const lines = Array.isArray(data.lines) ? data.lines : [];
    if (!lines.length && !data.text) return null;
    return {
      provider: data.provider || 'LavaLyrics',
      source: data.sourceName || 'lavalink',
      lines: lines.map((line) => ({
        time: Number(line.timestamp) || 0,
        duration: line.duration ?? null,
        text: String(line.line ?? ''),
      })),
      plain: data.text || '',
    };
  } catch {
    return null;
  }
}
