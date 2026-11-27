import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Track } from './types';
import { useAccount } from './account';
import { applyPalette, paletteFor, resetTheme } from './theme';
import { shuffleList } from './utils';

type Repeat = 'off' | 'one' | 'all';
export type Overlay = 'none' | 'now' | 'lyrics' | 'queue' | 'artist';

const STORE_KEY = 'aurora.player.v1';

interface Stored {
  volume?: number;
  liked?: Track[];
  recent?: Track[];
}

function readStored(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Stored;
  } catch {
    return {};
  }
}

interface PlayerContextValue {
  current: Track | null;
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  error: string | null;
  overlay: Overlay;
  karaokeOn: boolean;
  artist: string | null;
  liked: Track[];
  recent: Track[];
  isLiked: (id: string) => boolean;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (track: Track) => void;
  toggleKaraoke: () => void;
  setOverlay: (overlay: Overlay) => void;
  openLyrics: () => void;
  openArtist: (name: string) => void;
  closeArtist: () => void;
  addToQueue: (track: Track) => void;
  clearError: () => void;
  audioTime: () => number;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(readStored, []);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(stored.volume ?? 0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>('off');
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [karaokeOn, setKaraokeOn] = useState(true);
  const [artist, setArtist] = useState<string | null>(null);
  const [liked, setLiked] = useState<Track[]>(stored.liked ?? []);
  const [recent, setRecent] = useState<Track[]>(stored.recent ?? []);

  const { user, data, save } = useAccount();
  const syncedUser = useRef<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advanceRef = useRef<(auto: boolean) => void>(() => {});
  const overlayRef = useRef<Overlay>(overlay);
  const artistFromRef = useRef<Overlay>('now');
  overlayRef.current = overlay;
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  volumeRef.current = volume;
  mutedRef.current = muted;

  useEffect(() => {
    let disposed = false;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onReady = () => setLoading(false);
    const onEnded = () => advanceRef.current(true);
    const onError = () => {
      if (disposed) return;
      setLoading(false);
      setPlaying(false);
      setError('Could not stream this track. Try another result.');
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('playing', onReady);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      disposed = true;
      audio.pause();
      audio.removeAttribute('src');
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ volume, liked, recent }));
    } catch {
      /* storage can be unavailable */
    }
  }, [volume, liked, recent]);

  useEffect(() => {
    if (!user) {
      syncedUser.current = null;
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    if (Array.isArray(data.liked)) setLiked(data.liked);
    if (Array.isArray(data.recent)) setRecent(data.recent);
    if (Number.isFinite(data.volume)) {
      const restored = Math.max(0, Math.min(1, Number(data.volume)));
      setVolumeState(restored);
      if (audioRef.current) audioRef.current.volume = restored;
    }
  }, [user, data]);

  useEffect(() => {
    if (!user || syncedUser.current !== user.id) return;
    save({ liked, recent, volume });
  }, [liked, recent, volume, user, save]);

  useEffect(() => {
    let alive = true;
    if (!current?.artwork) {
      resetTheme();
      return;
    }
    paletteFor(current.artwork).then((palette) => {
      if (!alive) return;
      if (palette) applyPalette(palette);
      else resetTheme();
    });
    return () => {
      alive = false;
    };
  }, [current?.artwork]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setError(null);
    setLoading(true);
    setProgress(0);
    setDuration(current.duration > 0 ? current.duration / 1000 : 0);
    audio.src = `/api/stream?t=${encodeURIComponent(current.stream)}`;
    audio.load();
    audio.play().catch(() => setLoading(false));
    setRecent((prev) => [current, ...prev.filter((item) => item.id !== current.id)].slice(0, 24));

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.sourceName,
        artwork: current.artwork ? [{ src: current.artwork, sizes: '512x512' }] : [],
      });
      navigator.mediaSession.playbackState = 'playing';
    }
  }, [current]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = clamped;
    setProgress(clamped);
  }, []);

  const advance = useCallback(
    (auto: boolean) => {
      const audio = audioRef.current;
      if (!audio || !queue.length) return;
      if (auto && repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        return;
      }
      let nextIndex = index + 1;
      if (shuffle && queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === index);
      }
      if (nextIndex >= queue.length) {
        if (repeat === 'off') {
          if (auto) {
            setPlaying(false);
            audio.pause();
            return;
          }
          nextIndex = 0;
        } else {
          nextIndex = 0;
        }
      }
      setIndex(nextIndex);
      setCurrent(queue[nextIndex]);
      setPlaying(true);
    },
    [index, queue, repeat, shuffle],
  );

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [current]);

  const next = useCallback(() => advance(false), [advance]);
  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queue.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIndex = index - 1 < 0 ? queue.length - 1 : index - 1;
    setIndex(prevIndex);
    setCurrent(queue[prevIndex]);
    setPlaying(true);
  }, [index, queue]);

  const playQueue = useCallback((tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return;
    const safeIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    setQueue(tracks);
    setIndex(safeIndex);
    setCurrent(tracks[safeIndex]);
    setPlaying(true);
  }, []);

  const playTrack = useCallback((track: Track) => playQueue([track], 0), [playQueue]);

  const setVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, value));
    if (audio) audio.volume = clamped;
    setVolumeState(clamped);
    if (clamped > 0 && mutedRef.current) {
      setMuted(false);
      if (audio) audio.muted = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !mutedRef.current;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      if (!prev && queue.length > 1) {
        const remaining = queue.filter((_, i) => i !== index);
        const shuffled = shuffleList(remaining);
        const reordered = [queue[index], ...shuffled];
        setQueue(reordered);
        setIndex(0);
      }
      return !prev;
    });
  }, [index, queue]);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const toggleLike = useCallback((track: Track) => {
    setLiked((prev) =>
      prev.some((item) => item.id === track.id)
        ? prev.filter((item) => item.id !== track.id)
        : [track, ...prev],
    );
  }, []);

  const addToQueue = useCallback(
    (track: Track) => {
      if (!current) {
        playQueue([track], 0);
        return;
      }
      setQueue((prev) => (prev.length ? [...prev, track] : [track]));
    },
    [current, playQueue],
  );

  const toggleKaraoke = useCallback(() => setKaraokeOn((prev) => !prev), []);
  const openLyrics = useCallback(() => setOverlay('lyrics'), []);
  const openArtist = useCallback((name: string) => {
    if (!name) return;
    const from = overlayRef.current;
    artistFromRef.current = from === 'artist' ? 'none' : from;
    setArtist(name);
    setOverlay('artist');
  }, []);
  const closeArtist = useCallback(() => {
    setOverlay(artistFromRef.current === 'artist' ? 'none' : artistFromRef.current);
  }, []);
  const audioTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);
  const isLiked = useCallback((id: string) => liked.some((track) => track.id === id), [liked]);
  const clearError = useCallback(() => setError(null), []);

  const value: PlayerContextValue = {
    current,
    queue,
    index,
    playing,
    loading,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    error,
    overlay,
    karaokeOn,
    artist,
    liked,
    recent,
    isLiked,
    playQueue,
    playTrack,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleLike,
    toggleKaraoke,
    setOverlay,
    openLyrics,
    openArtist,
    closeArtist,
    addToQueue,
    clearError,
    audioTime,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
