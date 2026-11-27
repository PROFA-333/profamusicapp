import type { ArtistData, Feed, Health, LyricsData, Playlist, SearchResponse, Track } from './types';

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; warning?: string };
      message = body.error || body.warning || message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function getFeed(category: string, signal?: AbortSignal): Promise<Feed> {
  return request<Feed>(`/api/feed?category=${encodeURIComponent(category)}`, signal);
}

export function searchTracks(query: string, source: string, signal?: AbortSignal): Promise<SearchResponse> {
  return request<SearchResponse>(
    `/api/search?q=${encodeURIComponent(query)}&source=${encodeURIComponent(source)}`,
    signal,
  );
}

export function getArtist(name: string, signal?: AbortSignal): Promise<ArtistData> {
  return request<ArtistData>(`/api/artist?name=${encodeURIComponent(name)}`, signal);
}

export function getLyrics(track: Track, signal?: AbortSignal): Promise<LyricsData> {
  const params = new URLSearchParams({
    title: track.title,
    artist: track.artist,
    duration: String(track.duration || 0),
  });
  if (track.encoded) params.set('encoded', track.encoded);
  return request<LyricsData>(`/api/lyrics?${params.toString()}`, signal);
}

export function getHealth(): Promise<Health> {
  return request<Health>('/api/health');
}

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    /* keep default body */
  }
  if (!res.ok) throw new Error(body?.error || body?.warning || `Request failed (${res.status})`);
  return body as T;
}

export function importPlaylist(url: string): Promise<Playlist> {
  return send<{ playlist: Playlist }>('/api/import/playlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  }).then((body) => body.playlist);
}
