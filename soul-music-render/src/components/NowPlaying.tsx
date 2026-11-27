import { useMemo } from 'react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Quote,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { usePlayer } from '../player';
import { cx, formatSeconds, rangeStyle } from '../utils';
import { Artwork } from './Artwork';
import { VolumeGlyph } from './VolumeGlyph';

const BAR_COUNT = 46;

/** Deterministic bar heights so the waveform belongs to the song, not to a random frame. */
function waveBars(seed: string, count = BAR_COUNT): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i += 1) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const noise = ((hash >>> 0) % 1000) / 1000;
    const envelope = Math.sin(((i + 0.5) / count) * Math.PI);
    bars.push(Math.round(16 + envelope * (0.35 + noise * 0.65) * 84));
  }
  return bars;
}

export function NowPlaying() {
  const {
    current,
    playing,
    loading,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    queue,
    isLiked,
    toggleLike,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setOverlay,
    openLyrics,
    openArtist,
  } = usePlayer();

  const bars = useMemo(() => waveBars(current?.id ?? 'aurora'), [current?.id]);

  if (!current) return null;
  const total = duration || current.duration / 1000;
  const liked = isLiked(current.id);
  const ratio = total > 0 ? Math.min(1, Math.max(0, progress / total)) : 0;

  return (
    <div className="screen np2">
      <div className="np2-bg-wrap" aria-hidden="true">
        <div
          className="np2-bg"
          style={current.artwork ? { backgroundImage: `url("${current.artwork}")` } : undefined}
        />
        <div className="np2-ambient" />
        <div className="np2-shade" />
      </div>

      <header className="np2-head">
        <button className="np2-head-btn" onClick={() => setOverlay('none')} aria-label="Close now playing">
          <ChevronDown size={22} />
        </button>
        <span className="np2-head-title">Now Playing</span>
        <button className="np2-head-btn" onClick={() => setOverlay('queue')} aria-label="Open queue">
          <ListMusic size={19} />
        </button>
      </header>

      <main className="np2-body">
        <div className={cx('np2-cover-wrap', playing && 'is-playing')}>
          <div
            className="np2-cover-glow"
            style={current.artwork ? { backgroundImage: `url("${current.artwork}")` } : undefined}
          />
          <div className="np2-cover">
            <Artwork src={current.artwork} alt={current.title} />
          </div>
        </div>

        <div className="np2-meta">
          <h1 className="np2-title">{current.title}</h1>
          <button className="np2-artist artist-link" onClick={() => openArtist(current.artist)}>
            {current.artist}
          </button>
          <button
            className={cx('np2-heart', liked && 'is-liked')}
            onClick={() => toggleLike(current)}
            aria-label={liked ? 'Remove from liked' : 'Like track'}
          >
            <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className={cx('np2-wave', playing && 'is-playing')} aria-hidden="true">
          {bars.map((height, bar) => (
            <span
              key={bar}
              className={cx('np2-bar', bar / bars.length <= ratio && 'is-past')}
              style={{
                height: `${height}%`,
                filter: `hue-rotate(${Math.round((bar / (bars.length - 1)) * 56 - 28)}deg)`,
                animationDelay: `${(bar % 12) * -0.13}s`,
              }}
            />
          ))}
        </div>

        <div className="np2-progress">
          <input
            type="range"
            min={0}
            max={Math.max(total, 1)}
            step={0.5}
            value={Math.min(progress, total || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            style={rangeStyle(total ? (progress / total) * 100 : 0)}
            aria-label="Seek"
          />
          <div className="np2-times">
            <span>{formatSeconds(progress)}</span>
            <span>{formatSeconds(total)}</span>
          </div>
        </div>

        <div className="np2-controls">
          <button
            className={cx('np2-ctrl', shuffle && 'is-on')}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle size={20} />
          </button>
          <button className="np2-ctrl" onClick={previous} aria-label="Previous">
            <SkipBack size={25} fill="currentColor" />
          </button>
          <button
            className={cx('np2-play', playing && 'is-playing')}
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {loading ? (
              <Loader2 size={27} className="spin" />
            ) : playing ? (
              <Pause size={27} fill="currentColor" />
            ) : (
              <Play size={27} fill="currentColor" />
            )}
          </button>
          <button className="np2-ctrl" onClick={next} aria-label="Next">
            <SkipForward size={25} fill="currentColor" />
          </button>
          <button
            className={cx('np2-ctrl', repeat !== 'off' && 'is-on')}
            onClick={cycleRepeat}
            aria-label="Repeat"
          >
            {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        <div className="np2-dock">
          <button className="np2-pill is-active" onClick={openLyrics}>
            <Quote size={16} />
            <span>Lyrics</span>
          </button>
          <button className="np2-pill" onClick={() => setOverlay('queue')}>
            <ListMusic size={16} />
            <span>Queue</span>
            <em>{queue.length}</em>
          </button>
          <div className="np2-vol">
            <button
              className={cx('np2-vol-btn', (muted || volume === 0) && 'is-muted')}
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              title={muted ? 'Unmute' : 'Mute'}
            >
              <VolumeGlyph level={volume} muted={muted} />
            </button>
            <input
              className="np2-vol-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              style={rangeStyle((muted ? 0 : volume) * 100)}
              aria-label="Volume"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
