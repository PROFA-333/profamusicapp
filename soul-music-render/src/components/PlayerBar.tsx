import {
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

export function PlayerBar() {
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

  const total = duration || (current ? current.duration / 1000 : 0);
  const liked = current ? isLiked(current.id) : false;

  return (
    <>
      <div className={cx('player', !current && 'is-idle')}>
        <div className="player-track">
          <button className="player-art-btn" onClick={() => current && setOverlay('now')} aria-label="Open now playing">
            <Artwork src={current?.artwork} alt={current?.title ?? 'Nothing playing'} />
          </button>
          <div className="player-meta">
            <button className="player-title" onClick={() => current && setOverlay('now')}>
              {current?.title ?? 'Nothing playing'}
            </button>
            {current ? (
              <button className="player-artist artist-link" onClick={() => openArtist(current.artist)}>
                {current.artist}
              </button>
            ) : (
              <span className="player-artist">Pick a song to start</span>
            )}
          </div>
          {current && (
            <button
              className={cx('icon-btn', liked && 'is-liked')}
              onClick={() => toggleLike(current)}
              aria-label="Like track"
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button
              className={cx('icon-btn', shuffle && 'is-on')}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button className="icon-btn" onClick={previous} aria-label="Previous track">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button className={cx('play-btn', playing && 'is-playing')} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {loading ? (
                <Loader2 size={20} className="spin" />
              ) : playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>
            <button className="icon-btn" onClick={next} aria-label="Next track">
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              className={cx('icon-btn', repeat !== 'off' && 'is-on')}
              onClick={cycleRepeat}
              aria-label="Repeat"
            >
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>
          <div className="player-progress">
            <span>{formatSeconds(progress)}</span>
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
            <span>{formatSeconds(total)}</span>
          </div>
        </div>

        <div className="player-extra">
          <button className="lyrics-btn" onClick={openLyrics} aria-label="Lyrics">
            <Quote size={15} /> Lyrics
          </button>
          <div className="volume">
            <button
              className={cx('icon-btn volume-btn', (muted || volume === 0) && 'is-muted')}
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              <VolumeGlyph level={volume} muted={muted} />
            </button>
            <input
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
          <button className="icon-btn" onClick={() => setOverlay('queue')} aria-label="Queue">
            <ListMusic size={18} />
          </button>
        </div>
      </div>

      <div className={cx('mini', !current && 'is-idle')} onClick={() => current && setOverlay('now')}>
        <div className="mini-progress" style={{ width: `${total ? Math.min(100, (progress / total) * 100) : 0}%` }} />
        <Artwork src={current?.artwork} alt={current?.title ?? 'Nothing playing'} className="mini-art" />
        <div className="mini-meta">
          <span className="mini-title">{current?.title ?? 'Nothing playing'}</span>
          <span className="mini-artist">{current?.artist ?? 'Choose a song'}</span>
        </div>
        <button
          className="mini-btn"
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {loading ? (
            <Loader2 size={18} className="spin" />
          ) : playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
        <button
          className="mini-btn"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label="Next"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
      </div>
    </>
  );
}
