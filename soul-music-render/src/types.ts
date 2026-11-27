export interface Track {
  id: string;
  stream: string;
  title: string;
  artist: string;
  duration: number;
  artwork: string | null;
  source: string;
  sourceName: string;
  uri: string | null;
  encoded: string | null;
  isStream: boolean;
}

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  gradient: [string, string];
  artwork: string | null;
  tracks: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  artwork: string | null;
  tracks: Track[];
  source?: string;
  total?: number;
}

export interface Feed {
  category: string;
  categories: { id: string; label: string }[];
  collections: Collection[];
  popular: Track[];
  playlists: Playlist[];
}

export interface SearchResponse {
  tracks: Track[];
  top: Track | null;
  warning: string | null;
}

export interface ArtistData {
  name: string;
  artwork: string | null;
  tracks: Track[];
}

export interface LyricLine {
  time: number;
  duration: number | null;
  text: string;
}

export interface LyricsData {
  synced: boolean;
  provider: string | null;
  source: string | null;
  lines: LyricLine[];
  plain: string;
}

export interface Health {
  ok: boolean;
  node: string;
  version: string;
  sources: string[];
}
