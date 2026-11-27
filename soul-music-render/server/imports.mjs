import { youtubePlaylist } from './audio.mjs';
import { loadTracks, normalizeTrack } from './lavalink.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function spotifyPlaylistId(value) {
  const match =
    String(value).match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]+)/i) ||
    String(value).match(/spotify:playlist:([A-Za-z0-9]+)/i);
  return match ? match[1] : null;
}

function youtubeListId(value) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/i.test(parsed.hostname)) return null;
  return parsed.searchParams.get('list');
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length).fill(null);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function resolveSpotify(id) {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Spotify returned ${res.status} for that playlist.`);
  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Could not read that Spotify playlist. Make sure the link is public.');
  const parsed = JSON.parse(match[1]);
  const entity = parsed?.props?.pageProps?.state?.data?.entity;
  const entries = (Array.isArray(entity?.trackList) ? entity.trackList : []).filter(
    (entry) =>
      entry &&
      entry.title &&
      (entry.entityType === undefined || entry.entityType === 'track'),
  );
  if (!entries.length) throw new Error('That Spotify playlist has no tracks available.');

  const wanted = entries.slice(0, 40);
  const resolved = await mapLimit(wanted, 5, async (entry) => {
    const artist = String(entry.subtitle || '')
      .split(',')[0]
      .trim();
    const query = [entry.title, artist].filter(Boolean).join(' ');
    const result = await loadTracks(`ytmsearch:${query}`);
    if (result.unavailable || !result.tracks.length) return null;
    const track = normalizeTrack(result.tracks[0], 'ytmusic');
    return track.id && track.title ? track : null;
  });
  const tracks = resolved.filter(Boolean);
  if (!tracks.length) throw new Error('Could not match any Spotify tracks to playable audio.');

  return {
    id: `spotify:${id}`,
    name: String(entity.name || 'Spotify playlist'),
    artwork: entity.coverArt?.sources?.[0]?.url || tracks[0]?.artwork || null,
    source: 'spotify',
    total: wanted.length,
    tracks,
  };
}

async function resolveYoutube(listId) {
  const data = await youtubePlaylist(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`, 60);
  if (!data.tracks.length) throw new Error('That YouTube Music playlist is empty or private.');
  return {
    id: `ytmusic:${listId}`,
    name: data.name,
    artwork: data.tracks[0]?.artwork || null,
    source: 'ytmusic',
    total: data.total,
    tracks: data.tracks,
  };
}

export async function importPlaylist(url) {
  const spotify = spotifyPlaylistId(url);
  if (spotify) return resolveSpotify(spotify);
  const list = youtubeListId(url);
  if (list) return resolveYoutube(list);
  throw new Error('Paste a Spotify playlist link or a YouTube Music playlist link.');
}
