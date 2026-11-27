import { ChevronDown, ListMusic, Pause, Play } from 'lucide-react';
import { usePlayer } from '../player';
import { cx, countLabel, formatTime } from '../utils';
import { Artwork } from './Artwork';
import { Equalizer } from './Equalizer';

export function QueueSheet() {
  const { queue, index, current, playing, toggle, playQueue, setOverlay, openArtist } = usePlayer();
  const upcoming = queue.slice(index + 1);
  const nextCards = upcoming.slice(0, 5);

  return (
    <div className="screen queue-sheet" onClick={() => setOverlay('none')}>
      <div className="queue-panel" onClick={(event) => event.stopPropagation()}>
        <div className="queue-handle" />
        <header className="queue-head">
          <div>
            <h2>Play queue</h2>
            <p>{countLabel(queue.length, 'track')}</p>
          </div>
          <button className="icon-btn" onClick={() => setOverlay('none')} aria-label="Close queue">
            <ChevronDown size={20} />
          </button>
        </header>

        {current && (
          <div className="queue-now">
            <Artwork src={current.artwork} alt={current.title} className="queue-art" />
            <div className="queue-meta">
              <span className="queue-label">Now playing</span>
              <span className="row-title">{current.title}</span>
              <button
                className="row-artist artist-link"
                onClick={() => {
                  setOverlay('none');
                  openArtist(current.artist);
                }}
              >
                {current.artist}
              </button>
            </div>
            <Equalizer playing={playing} />
            <button className="queue-toggle" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
          </div>
        )}

        {nextCards.length > 0 && (
          <section>
            <p className="queue-section-label">Next in queue</p>
            <div className="queue-cards">
              {nextCards.map((track, position) => (
                <button
                  key={`${track.id}-card-${position}`}
                  className="queue-card"
                  onClick={() => playQueue(queue, index + 1 + position)}
                >
                  <span className="queue-card-art">
                    <Artwork src={track.artwork} alt={track.title} />
                    <span className="queue-card-play">
                      <Play size={12} fill="currentColor" />
                    </span>
                  </span>
                  <span className="queue-card-title">{track.title}</span>
                  <span className="queue-card-artist">{track.artist}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="queue-next">
            <p className="queue-section-label">Next from: {current?.sourceName ?? 'your queue'}</p>
            <div className="queue-list">
              {upcoming.map((track, position) => (
                <button
                  key={`${track.id}-${position}`}
                  className={cx('queue-item')}
                  onClick={() => playQueue(queue, index + 1 + position)}
                >
                  <span className="queue-position">{position + 1}</span>
                  <Artwork src={track.artwork} alt={track.title} className="queue-art small" />
                  <span className="queue-meta">
                    <span className="row-title">{track.title}</span>
                    <span className="row-artist">{track.artist}</span>
                  </span>
                  <span className="queue-time">{formatTime(track.duration)}</span>
                  <Play size={14} fill="currentColor" />
                </button>
              ))}
            </div>
          </section>
        )}

        {!upcoming.length && (
          <div className="queue-empty">
            <ListMusic size={20} />
            <p>Nothing queued. Add songs from search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
