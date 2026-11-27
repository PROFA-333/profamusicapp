import { Heart, Pause, Play } from 'lucide-react';
import type { Feed, Track } from '../types';
import { usePlayer } from '../player';
import { cx } from '../utils';
import { Artwork } from './Artwork';

interface HomeProps {
  feed: Feed | null;
  loading: boolean;
  error: string | null;
  category: string;
  onCategory: (id: string) => void;
  onRetry: () => void;
}

export function Home({ feed, loading, error, category, onCategory, onRetry }: HomeProps) {
  const { current, playing, toggle, playQueue, isLiked, toggleLike, openArtist, setOverlay } = usePlayer();

  const heroTracks = feed?.popular ?? [];

  return (
    <div className="view home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Your soundtrack</p>
          <h1>
            Enjoy Your <span>Favorite Music</span>
          </h1>
          <p className="hero-sub">Every source. Every mood. One player.</p>
          <button
            className="btn-primary"
            onClick={() => heroTracks.length && playQueue(heroTracks, 0)}
            disabled={!heroTracks.length}
          >
            <Play size={16} fill="currentColor" /> Start Listening
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className={cx('hero-cover', `hero-cover-${index}`)}>
              <Artwork src={heroTracks[index]?.artwork} alt="" />
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="notice">
          <div>
            <strong>Could not reach the music library.</strong>
            <p>{error}</p>
          </div>
          <button className="ghost-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      <section className="section">
        <header className="section-head">
          <h2>New Collections</h2>
          <span className="section-hint">Curated daily</span>
        </header>
        <div className="hscroll collections">
          {loading && !feed
            ? [0, 1, 2].map((index) => <div key={index} className="collection-card skeleton" />)
            : feed?.collections.map((collection) => (
                <button
                  key={collection.id}
                  className="collection-card"
                  style={{
                    backgroundImage: `linear-gradient(180deg, ${collection.gradient[0]}33, #120a22 78%)`,
                  }}
                  onClick={() => playQueue(collection.tracks, 0)}
                >
                  <div className="collection-art">
                    <Artwork src={collection.artwork} alt={collection.title} />
                  </div>
                  <div className="collection-body">
                    <span className="collection-pill">
                      <Play size={11} fill="currentColor" /> Start listening
                    </span>
                    <h3>{collection.title}</h3>
                    <p>{collection.subtitle}</p>
                  </div>
                </button>
              ))}
        </div>
      </section>

      <section className="section">
        <header className="section-head">
          <h2>Categories</h2>
        </header>
        <div className="chips">
          {feed?.categories.map((item) => (
            <button
              key={item.id}
              className={cx('chip', category === item.id && 'is-active')}
              onClick={() => onCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
          {!feed &&
            ['All', 'Party', 'New Artists', 'Pop', 'Chill'].map((label) => (
              <span key={label} className="chip is-ghost">
                {label}
              </span>
            ))}
        </div>
      </section>

      <section className="section">
        <header className="section-head">
          <h2>Popular Songs</h2>
          <span className="section-hint">{category === 'all' ? 'Trending now' : 'In this mood'}</span>
        </header>
        <div className="hscroll songs">
          {loading && !feed
            ? [0, 1, 2, 3, 4].map((index) => <div key={index} className="song-card skeleton" />)
            : feed?.popular.map((track) => {
                const active = current?.id === track.id;
                return (
                  <div key={track.id} className={cx('song-card', active && 'is-active')}>
                    <div className="song-art">
                      <Artwork src={track.artwork} alt={track.title} />
                      <button
                        className="song-play"
                        onClick={() => {
                          if (active) {
                            toggle();
                            return;
                          }
                          const start = feed.popular.findIndex((item) => item.id === track.id);
                          playQueue(feed.popular, Math.max(0, start));
                          setOverlay('now');
                        }}
                        aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}
                      >
                        {active && playing ? (
                          <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                      </button>
                    </div>
                    <div className="song-body">
                      <span className="song-title">{track.title}</span>
                      <button className="song-artist artist-link" onClick={() => openArtist(track.artist)}>
                        {track.artist}
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      <section className="section">
        <header className="section-head">
          <h2>Favorite Playlist</h2>
        </header>
        <div className="playlist-list">
          {loading && !feed
            ? [0, 1].map((index) => <div key={index} className="playlist-row skeleton" />)
            : feed?.playlists.map((playlist) => (
                <div key={playlist.id} className="playlist-row">
                  <Artwork src={playlist.artwork} alt={playlist.name} className="playlist-art" />
                  <div className="playlist-meta">
                    <span className="playlist-name">{playlist.name}</span>
                    <span className="playlist-sub">
                      {playlist.tracks.length} songs · {playlist.tracks[0]?.artist ?? 'Soul'}
                    </span>
                  </div>
                  <button
                    className="round-btn"
                    onClick={() => playQueue(playlist.tracks, 0)}
                    aria-label={`Play ${playlist.name}`}
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              ))}
        </div>
      </section>

      {feed?.popular.length ? (
        <section className="section">
          <header className="section-head">
            <h2>Quick Picks</h2>
            <span className="section-hint">Fresh picks</span>
          </header>
          <div className="quick-grid">
            {feed.popular.slice(0, 6).map((track: Track) => {
              const liked = isLiked(track.id);
              return (
                <div key={track.id} className="quick-card">
                  <Artwork src={track.artwork} alt={track.title} className="quick-art" />
                  <div className="quick-meta">
                    <span className="quick-title">{track.title}</span>
                    <button className="quick-artist artist-link" onClick={() => openArtist(track.artist)}>
                      {track.artist}
                    </button>
                  </div>
                  <button
                    className={cx('quick-like', liked && 'is-liked')}
                    onClick={() => toggleLike(track)}
                    aria-label="Like track"
                  >
                    <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="quick-play"
                    onClick={() => {
                      playQueue([track], 0);
                      setOverlay('now');
                    }}
                    aria-label="Play track"
                  >
                    <Play size={13} fill="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
