import { ChevronLeft, Loader2, Play, Shuffle, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getArtist } from '../api';
import { usePlayer } from '../player';
import type { ArtistData } from '../types';
import { countLabel, shuffleList } from '../utils';
import { Artwork } from './Artwork';
import { TrackRow } from './TrackRow';

export function ArtistView() {
  const { artist, closeArtist, playQueue } = usePlayer();
  const [data, setData] = useState<ArtistData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!artist) return;
    let alive = true;
    const controller = new AbortController();
    setStatus('loading');
    setData(null);
    getArtist(artist, controller.signal)
      .then((response) => {
        if (!alive) return;
        setData(response);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
      controller.abort();
    };
  }, [artist]);

  if (!artist) return null;
  const tracks = data?.tracks ?? [];
  const artwork = data?.artwork ?? tracks[0]?.artwork ?? null;

  return (
    <div className="screen artist-screen">
      <div
        className="screen-backdrop artist-backdrop"
        style={artwork ? { backgroundImage: `url("${artwork}")` } : undefined}
      />
      <div className="np-scrim" />

      <header className="artist-top">
        <button className="icon-btn" onClick={closeArtist} aria-label="Close artist">
          <ChevronLeft size={22} />
        </button>
        <span>Artist</span>
        <span className="artist-top-spacer" />
      </header>

      <div className="artist-body">
        <section className="artist-hero">
          <div className="artist-avatar">
            {artwork ? (
              <Artwork src={artwork} alt={artist} />
            ) : (
              <span className="artist-avatar-fallback">
                <UserRound size={40} />
              </span>
            )}
          </div>
          <div className="artist-hero-copy">
            <p className="eyebrow">Artist</p>
            <h1>{data?.name || artist}</h1>
            <p>{status === 'loading' ? 'Loading songs…' : countLabel(tracks.length, 'song')}</p>
          </div>
        </section>

        {tracks.length > 0 && (
          <div className="artist-actions">
            <button className="btn-primary" onClick={() => playQueue(tracks, 0)}>
              <Play size={15} fill="currentColor" /> Play all
            </button>
            <button className="ghost-btn artist-shuffle" onClick={() => playQueue(shuffleList(tracks), 0)}>
              <Shuffle size={14} /> Shuffle
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="search-loading">
            <Loader2 size={20} className="spin" /> Collecting songs by {artist}…
          </div>
        )}

        {status === 'error' && (
          <div className="empty">
            <UserRound size={24} />
            <h3>Could not load this artist</h3>
            <p>The catalogs did not answer. Try again in a moment.</p>
          </div>
        )}

        {status === 'ready' && tracks.length === 0 && (
          <div className="empty">
            <UserRound size={24} />
            <h3>No songs found</h3>
            <p>Search for {artist} to see everything available.</p>
          </div>
        )}

        {tracks.length > 0 && (
          <section className="section">
            <header className="section-head">
              <h2>Popular</h2>
              <span className="section-hint">{countLabel(tracks.length, 'song')}</span>
            </header>
            <div className="track-list">
              {tracks.map((track, position) => (
                <TrackRow
                  key={`${track.id}-${position}`}
                  track={track}
                  position={position + 1}
                  onPlay={() => playQueue(tracks, position)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
