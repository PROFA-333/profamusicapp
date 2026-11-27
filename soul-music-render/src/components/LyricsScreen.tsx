import { ChevronLeft, Loader2, Mic2, MoreHorizontal, Pause, Play, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getLyrics } from '../api';
import { usePlayer } from '../player';
import type { LyricsData } from '../types';
import { cx, formatSeconds, rangeStyle } from '../utils';
import { Artwork } from './Artwork';

type Status = 'loading' | 'ready' | 'empty' | 'error';

export function LyricsScreen() {
  const {
    current,
    progress,
    duration,
    playing,
    seek,
    toggle,
    setOverlay,
    karaokeOn,
    toggleKaraoke,
    openArtist,
  } = usePlayer();
  const [data, setData] = useState<LyricsData | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [menuOpen, setMenuOpen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    let alive = true;
    setStatus('loading');
    setData(null);
    const controller = new AbortController();
    getLyrics(current, controller.signal)
      .then((response) => {
        if (!alive) return;
        if (!response.lines.length && !response.plain) {
          setStatus('empty');
          return;
        }
        setData(response);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('empty'));
    return () => {
      alive = false;
      controller.abort();
    };
  }, [current, nonce]);

  const lines = data?.lines ?? [];
  const activeIndex = useMemo(() => {
    if (!data?.synced) return -1;
    const ms = progress * 1000;
    let index = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].time <= ms && lines[i].text.trim()) index = i;
    }
    return index;
  }, [data, lines, progress]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIndex]);

  if (!current) {
    return (
      <div className="screen lyrics-screen">
        <div className="lyrics-head">
          <button className="icon-btn" onClick={() => setOverlay('none')} aria-label="Close lyrics">
            <X size={20} />
          </button>
        </div>
        <div className="empty">
          <Mic2 size={26} />
          <h3>Nothing playing</h3>
          <p>Pick a song to see its lyrics here.</p>
        </div>
      </div>
    );
  }

  const total = duration || current.duration / 1000;
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : null;
  const fillDuration = activeLine?.duration ? activeLine.duration / 1000 : 4;

  return (
    <div className="screen lyrics-screen">
      <div
        className="screen-backdrop lyrics-bg"
        style={current.artwork ? { backgroundImage: `url("${current.artwork}")` } : undefined}
      />
      <div className="lyrics-scrim" />

      <div className="lyrics-head">
        <button className="icon-btn" onClick={() => setOverlay('now')} aria-label="Back to player">
          <ChevronLeft size={22} />
        </button>
        <Artwork src={current.artwork} alt={current.title} className="lyrics-thumb" />
        <div className="lyrics-head-meta">
          <span className="lyrics-title">{current.title}</span>
          <p className="lyrics-artist">
            <button className="artist-link" onClick={() => openArtist(current.artist)}>
              {current.artist}
            </button>
            {data?.provider ? ` · ${data.provider}` : ''}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Lyrics options"
        >
          <MoreHorizontal size={20} />
        </button>
        {menuOpen && (
          <div className="lyrics-menu">
            <button
              onClick={() => {
                setMenuOpen(false);
                setNonce((value) => value + 1);
              }}
            >
              Refresh lyrics
            </button>
            <button onClick={() => setOverlay('now')}>Back to player</button>
            <button onClick={() => setOverlay('none')}>Close</button>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="lyrics-status">
          <Loader2 size={20} className="spin" /> Syncing lyrics…
        </div>
      )}

      {status === 'empty' && (
        <div className="lyrics-status is-empty">
          <Mic2 size={24} />
          <p>No lyrics found for this track yet.</p>
        </div>
      )}

      {status === 'ready' && data && (
        <div className={cx('lyrics-list', data.synced && 'is-synced', karaokeOn && 'karaoke')} ref={listRef}>
          {!data.synced && <p className="lyrics-plain-note">Full lyrics · not time-synced</p>}
          {lines.map((line, index) => {
            const isActive = index === activeIndex;
            const distance = activeIndex >= 0 ? Math.abs(index - activeIndex) : 99;
            return (
              <button
                key={`${index}-${line.time}`}
                data-line={index}
                className={cx(
                  'lyric-line',
                  isActive && 'is-active',
                  !isActive && distance <= 1 && 'is-near',
                  !isActive && activeIndex > index && 'is-past',
                )}
                style={
                  isActive
                    ? ({
                        '--line-duration': `${fillDuration}s`,
                        animationPlayState: playing ? 'running' : 'paused',
                      } as CSSProperties)
                    : undefined
                }
                onClick={() => data.synced && seek(line.time / 1000)}
              >
                {line.text || '♪'}
              </button>
            );
          })}
        </div>
      )}

      <button
        className={cx('karaoke-fab', karaokeOn && 'is-on')}
        onClick={toggleKaraoke}
        aria-label="Toggle karaoke mode"
        title="Karaoke mode"
      >
        <Mic2 size={20} />
      </button>

      <div className="lyrics-footer">
        <div className="lyrics-controls">
          <button
            className={cx('lyrics-play', playing && 'is-playing')}
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>
          <div className="lyrics-track">
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
            <div className="lyrics-times">
              <span>{formatSeconds(progress)}</span>
              <span>-{formatSeconds(Math.max(0, total - progress))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
