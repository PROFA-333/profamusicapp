import { Heart, Play } from 'lucide-react';
import type { Track } from '../types';
import { usePlayer } from '../player';
import { cx, formatTime } from '../utils';
import { sourceAccent } from '../sources';
import { Artwork } from './Artwork';
import { Equalizer } from './Equalizer';

interface TrackRowProps {
  track: Track;
  position?: number;
  onPlay: () => void;
  compact?: boolean;
}

export function TrackRow({ track, position, onPlay, compact }: TrackRowProps) {
  const { current, playing, toggle, isLiked, toggleLike, openArtist, setOverlay } = usePlayer();
  const active = current?.id === track.id;
  const liked = isLiked(track.id);

  return (
    <div className={cx('track-row', active && 'is-active', compact && 'is-compact')}>
      <button
        className="row-index"
        onClick={() => {
          if (active) toggle();
          else onPlay();
          setOverlay('now');
        }}
        aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {active && playing ? <Equalizer /> : <Play size={14} />}
        {position !== undefined && <span className="row-number">{position}</span>}
      </button>
      <Artwork src={track.artwork} alt={track.title} className="row-art" />
      <div className="row-meta">
        <span className="row-title">{track.title}</span>
        <button className="row-artist artist-link" onClick={() => openArtist(track.artist)}>
          {track.artist}
        </button>
      </div>
      <span className="row-source" style={{ color: sourceAccent(track.source)[0] }}>
        {track.sourceName}
      </span>
      <span className="row-time">{formatTime(track.duration)}</span>
      <button
        className={cx('row-like', liked && 'is-liked')}
        onClick={() => toggleLike(track)}
        aria-label={liked ? 'Remove from liked songs' : 'Add to liked songs'}
      >
        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
