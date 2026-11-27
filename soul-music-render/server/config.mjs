import { loadEnv } from './env.mjs';

loadEnv();

// Lavalink node configuration. Defaults point at the hosted node from the
// public list; override with environment variables to use your own node.
export const NODE = {
  host: process.env.LAVALINK_HOST || 'freelavalinkvinster.in',
  port: Number(process.env.LAVALINK_PORT || 443),
  password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
  secure: String(process.env.LAVALINK_SECURE ?? 'true') !== 'false',
  label: process.env.LAVALINK_LABEL || 'freelavalinkvinster.in',
};

export const BASE = `${NODE.secure ? 'https' : 'http'}://${NODE.host}:${NODE.port}`;

export const SOURCES = [
  { id: 'ytmusic', name: 'YouTube Music', prefix: 'ytmsearch', accent: ['#ff4d6d', '#ff9a5a'], tag: 'YouTube' },
  { id: 'spotify', name: 'Spotify', prefix: 'spsearch', accent: ['#1ed760', '#0b6b35'], tag: 'Spotify' },
  { id: 'apple', name: 'Apple Music', prefix: 'amsearch', accent: ['#fa2d48', '#8a0d2b'], tag: 'Apple' },
  { id: 'soundcloud', name: 'SoundCloud', prefix: '', accent: ['#ff7700', '#ff3d00'], tag: 'SoundCloud' },
  { id: 'deezer', name: 'Deezer', prefix: 'dzsearch', accent: ['#a238ff', '#5b1fb8'], tag: 'Deezer' },
  { id: 'tidal', name: 'Tidal', prefix: 'tdsearch', accent: ['#00d3ff', '#045d8a'], tag: 'Tidal' },
  { id: 'qobuz', name: 'Qobuz', prefix: 'qzsearch', accent: ['#2f7bff', '#0a2f7a'], tag: 'Qobuz' },
  { id: 'jiosaavn', name: 'JioSaavn', prefix: 'jssearch', accent: ['#2bc48a', '#0c6b4f'], tag: 'JioSaavn' },
  { id: 'gaana', name: 'Gaana', prefix: 'gsearch', accent: ['#e72c30', '#7d0f14'], tag: 'Gaana' },
  { id: 'amazon', name: 'Amazon Music', prefix: 'amzsearch', accent: ['#00a8e1', '#0a3e63'], tag: 'Amazon' },
  { id: 'yandex', name: 'Yandex Music', prefix: 'ymsearch', accent: ['#ffcc00', '#b36b00'], tag: 'Yandex' },
  { id: 'vk', name: 'VK Music', prefix: 'vksearch', accent: ['#0077ff', '#042c6b'], tag: 'VK' },
  { id: 'youtube', name: 'YouTube', prefix: 'ytsearch', accent: ['#ff3b3b', '#8a0000'], tag: 'YouTube', hidden: true },
];

export const SOURCE_MAP = new Map(SOURCES.map((s) => [s.id, s]));

// Sources the hosted node can search natively (verified against the node).
export const SEARCHABLE = ['ytmusic', 'spotify', 'apple', 'soundcloud', 'deezer', 'jiosaavn'];

const SPOTIFY = 'https://open.spotify.com/playlist/';

export const CATEGORIES = [
  { id: 'all', label: 'All', playlist: `${SPOTIFY}37i9dQZF1DXcBWIGoYBM5M`, query: 'top hits', source: 'spotify' },
  { id: 'party', label: 'Party', playlist: `${SPOTIFY}37i9dQZF1DXaXB8fQg7xif`, query: 'party hits', source: 'spotify' },
  { id: 'newartists', label: 'New Artists', playlist: `${SPOTIFY}37i9dQZF1DX4JAvHpjipBk`, query: 'new music friday', source: 'spotify' },
  { id: 'pop', label: 'Pop', playlist: `${SPOTIFY}37i9dQZF1DWUa8ZRTfalHk`, query: 'pop hits', source: 'spotify' },
  { id: 'hiphop', label: 'Hip-Hop', playlist: `${SPOTIFY}37i9dQZF1DX0XUsuxWHRQd`, query: 'hip hop hits', source: 'spotify' },
  { id: 'chill', label: 'Chill', playlist: `${SPOTIFY}37i9dQZF1DX4WYpdgoIcn6`, query: 'chill r&b', source: 'spotify' },
  { id: 'workout', label: 'Workout', playlist: `${SPOTIFY}37i9dQZF1DX76Wlfdnj7AP`, query: 'workout energy', source: 'spotify' },
  { id: 'indie', label: 'Indie', query: 'indie hits', source: 'deezer' },
];

export const COLLECTIONS = [
  {
    id: 'midnight',
    title: 'Midnight Vibes',
    subtitle: 'Late-night R&B and slow jams',
    playlist: `${SPOTIFY}37i9dQZF1DX4WYpdgoIcn6`,
    query: 'midnight vibes r&b',
    source: 'spotify',
    gradient: ['#7c3aed', '#db2777'],
  },
  {
    id: 'indie',
    title: 'Indie Afterglow',
    subtitle: 'Dreamy guitars for golden hour',
    playlist: `${SPOTIFY}37i9dQZF1DX4E3UdUs7fUx`,
    query: 'indie afterglow',
    source: 'spotify',
    gradient: ['#0ea5e9', '#7c3aed'],
  },
  {
    id: 'neon',
    title: 'Neon Nights',
    subtitle: 'Synthwave for the drive home',
    playlist: `${SPOTIFY}37i9dQZF1DX4osfY3zybD2`,
    query: 'synthwave night drive',
    source: 'spotify',
    gradient: ['#f97316', '#be123c'],
  },
];

export const PLAYLISTS = [
  {
    id: 'rock',
    name: 'Rock Anthems',
    playlist: `${SPOTIFY}37i9dQZF1DWXRqgorJj26U`,
    query: 'rock anthems',
    source: 'spotify',
  },
  {
    id: 'acoustic',
    name: 'Chill Acoustic',
    playlist: `${SPOTIFY}37i9dQZF1DX4E3UdUs7fUx`,
    query: 'chill acoustic',
    source: 'spotify',
  },
];

export const UNSUPPORTED_HINT =
  'This free Lavalink node does not have that source enabled. Public nodes usually need their own API credentials for it — try Spotify, Apple Music, Deezer or YouTube Music instead.';
