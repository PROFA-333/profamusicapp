import { useEffect, useRef, useState } from 'react';
import { Home as HomeIcon, Library as LibraryIcon, Search as SearchIcon, UserRound, X } from 'lucide-react';
import { useAccount } from './account';
import { getFeed, getHealth } from './api';
import { AccountSheet } from './components/AccountSheet';
import { Artwork } from './components/Artwork';
import { ArtistView } from './components/ArtistView';
import { AuthSheet } from './components/AuthSheet';
import { Home } from './components/Home';
import { ImportSheet, type ImportSource } from './components/ImportSheet';
import { LibraryView } from './components/LibraryView';
import { LyricsScreen } from './components/LyricsScreen';
import { NowPlaying } from './components/NowPlaying';
import { PlayerBar } from './components/PlayerBar';
import { QueueSheet } from './components/QueueSheet';
import { SearchView } from './components/SearchView';
import { usePlayer } from './player';
import type { Feed, Health, Playlist } from './types';
import { cx, greeting } from './utils';

type View = 'home' | 'search' | 'library';

const PLAYLIST_KEY = 'aurora.playlists.v1';

function readPlaylists(): Playlist[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || '[]');
    return Array.isArray(stored) ? (stored as Playlist[]) : [];
  } catch {
    return [];
  }
}

const NAV: { id: View; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'search', label: 'Search', icon: SearchIcon },
  { id: 'library', label: 'Library', icon: LibraryIcon },
];

export default function App() {
  const { overlay, error, clearError, liked, playQueue } = usePlayer();
  const { user, data, save, openAuth, openAccount } = useAccount();
  const [view, setView] = useState<View>('home');
  const [category, setCategory] = useState('all');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [reload, setReload] = useState(0);
  const [imported, setImported] = useState<Playlist[]>(readPlaylists);
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFeedError(null);
    getFeed(category, controller.signal)
      .then(setFeed)
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setFeedError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, reload]);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 7000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  useEffect(() => {
    if (!user) {
      syncedUser.current = null;
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    if (Array.isArray(data.playlists)) setImported(data.playlists);
  }, [user, data]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify(imported));
    } catch {
      /* storage can be unavailable */
    }
    if (user && syncedUser.current === user.id) save({ playlists: imported });
  }, [imported, user, save]);

  const playlists = [...imported, ...(feed?.playlists ?? [])];

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true" />

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <img src="/soul-logo.png" alt="Soul Music" />
          </span>
          <span className="brand-copy">
            <span className="brand-line">
              <span className="brand-name">Soul</span>
              <span className="brand-tag">Music</span>
            </span>
            <span className="brand-credit">made by PROFA</span>
          </span>
        </div>

        <nav className="side-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={cx('side-link', view === item.id && 'is-active')}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="side-liked">
          <p className="side-label">Liked songs</p>
          {liked.slice(0, 4).map((track, position) => (
            <button key={track.id} className="side-track" onClick={() => playQueue(liked, position)}>
              <Artwork src={track.artwork} alt={track.title} className="side-art" />
              <span className="side-track-meta">
                <span className="side-track-title">{track.title}</span>
                <span className="side-track-artist">{track.artist}</span>
              </span>
            </button>
          ))}
          {!liked.length && <p className="side-empty">Heart a track and it lands here.</p>}
        </div>

        <button
          className="side-account"
          onClick={() => (user ? openAccount() : openAuth())}
          aria-label={user ? 'Open account' : 'Sign in'}
        >
          <span className="side-account-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="" referrerPolicy="no-referrer" />
            ) : user ? (
              user.name.slice(0, 1).toUpperCase()
            ) : (
              <UserRound size={15} />
            )}
          </span>
          <span className="side-account-meta">
            <span className="side-account-name">{user ? user.name : 'Sign in'}</span>
            <span className="side-account-mail">
              {user ? user.email : 'Save likes & playlists'}
            </span>
          </span>
        </button>

        <div className="side-node">
          <span className={cx('dot', health?.ok && 'is-live')} />
          <div>
            <span>{health?.ok ? `Lavalink ${health.version}` : 'Connecting to Lavalink…'}</span>
            <span className="side-node-sub">12 catalogs · streamed in app</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-brand">
          <span className="brand-mark">
            <img src="/soul-logo.png" alt="Soul Music" />
          </span>
          <span className="brand-copy">
            <span className="brand-line">
              <span className="brand-name">Soul</span>
              <span className="brand-tag">Music</span>
            </span>
            <span className="brand-credit">made by PROFA</span>
          </span>
        </div>

        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">{greeting()}</p>
            <h1>{view === 'home' ? 'Music Lover' : view === 'search' ? 'Find your sound' : 'Your Library'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn glass" onClick={() => setView('search')} aria-label="Search">
              <SearchIcon size={18} />
            </button>
            <button
              className={cx('avatar', user && 'has-user')}
              onClick={() => (user ? openAccount() : openAuth())}
              aria-label={user ? 'Open account' : 'Sign in'}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                user?.name.slice(0, 1).toUpperCase() || 'A'
              )}
            </button>
          </div>
        </header>

        {view === 'home' && (
          <Home
            feed={feed}
            loading={loading}
            error={feedError}
            category={category}
            onCategory={setCategory}
            onRetry={() => setReload((value) => value + 1)}
          />
        )}
        {view === 'search' && <SearchView />}
        {view === 'library' && (
          <LibraryView
            onBrowse={() => setView('search')}
            playlists={playlists}
            onImport={setImportSource}
          />
        )}
      </main>

      <PlayerBar />

      <nav className="bottom-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={cx('bottom-link', view === item.id && 'is-active')}
              onClick={() => setView(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {overlay === 'now' && <NowPlaying />}
      {overlay === 'lyrics' && <LyricsScreen />}
      {overlay === 'queue' && <QueueSheet />}
      {overlay === 'artist' && <ArtistView />}

      <AuthSheet />
      <AccountSheet />
      {importSource && (
        <ImportSheet
          source={importSource}
          onSource={setImportSource}
          onClose={() => setImportSource(null)}
          onImported={(playlist) =>
            setImported((prev) => [playlist, ...prev.filter((item) => item.id !== playlist.id)])
          }
        />
      )}

      {error && (
        <div className="toast">
          <span>{error}</span>
          <button onClick={clearError} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
