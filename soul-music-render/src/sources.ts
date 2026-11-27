import type { Track } from './types';

export const SOURCES = [
  { id: 'ytmusic', name: 'YouTube Music', accent: ['#ff4d6d', '#ff9a5a'] as [string, string] },
  { id: 'spotify', name: 'Spotify', accent: ['#1ed760', '#0b6b35'] as [string, string] },
  { id: 'apple', name: 'Apple Music', accent: ['#fa2d48', '#8a0d2b'] as [string, string] },
  { id: 'soundcloud', name: 'SoundCloud', accent: ['#ff7700', '#ff3d00'] as [string, string] },
  { id: 'deezer', name: 'Deezer', accent: ['#a238ff', '#5b1fb8'] as [string, string] },
  { id: 'tidal', name: 'Tidal', accent: ['#00d3ff', '#045d8a'] as [string, string] },
  { id: 'qobuz', name: 'Qobuz', accent: ['#2f7bff', '#0a2f7a'] as [string, string] },
  { id: 'jiosaavn', name: 'JioSaavn', accent: ['#2bc48a', '#0c6b4f'] as [string, string] },
  { id: 'gaana', name: 'Gaana', accent: ['#e72c30', '#7d0f14'] as [string, string] },
  { id: 'amazon', name: 'Amazon Music', accent: ['#00a8e1', '#0a3e63'] as [string, string] },
  { id: 'yandex', name: 'Yandex Music', accent: ['#ffcc00', '#b36b00'] as [string, string] },
  { id: 'vk', name: 'VK Music', accent: ['#0077ff', '#042c6b'] as [string, string] },
];

const FALLBACK: [string, string] = ['#8b5cf6', '#4c1d95'];

export function sourceAccent(id: string): [string, string] {
  return SOURCES.find((source) => source.id === id)?.accent ?? FALLBACK;
}

export function sourceName(id: string): string {
  return SOURCES.find((source) => source.id === id)?.name ?? id;
}

export type { Track };
