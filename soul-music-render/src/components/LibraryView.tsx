import { Heart, History, ListMusic, Play, Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { usePlayer } from '../player';
import type { Playlist } from '../types';
import { cx, countLabel } from '../utils';
import { Artwork } from './Artwork';
import { PlaylistSourceMark, SpotifyMark, YoutubeMusicMark } from './BrandMarks';
import type { ImportSource } from './ImportSheet';

type Tab = 'playlists' | 'liked' | 'recent';

interface LibraryViewProps {
  onBrowse: () => void;
  playlists: Playlist[];
  onImport: (source: ImportSource) => void;
}

export function LibraryView({ onBrowse, playlists, onImport }: LibraryViewProps) {
  const { liked, recent, playQueue, setOverlay } = usePlayer();
  const [tab, setTab] = useState<Tab>('playlists');
  const tracks = tab === 'liked' ? liked : recent;
  const list = tab === 'playlists' ? playlists : tracks;

  return (
    <div className="view library">
      <header className="library-head">
        <div>
          <p className="eyebrow">Your collection</p>
          <h1>
            {tab === 'playlists' ? 'Your Playlists' : tab === 'liked' ? 'Liked Songs' : 'Recently Played'}
          </h1>
          <p className="library-sub">
            {tab === 'playlists'
              ? `${countLabel(playlists.length, 'playlist')} made and saved for you`
              : `${countLabel(tracks.length, 'track')} saved on this device`}
          </p>
        </div>
        <div className="library-badge">
          {tab === 'playlists' ? (
            <ListMusic size={22} />
          ) : tab === 'liked' ? (
            <Heart size={22} fill="currentColor" />
          ) : (
            <History size={22} />
          )}
        </div>
      </header>

      <div className="tabs">
        <button className={cx('tab', tab === 'playlists' && 'is-active')} onClick={() => setTab('playlists')}>
          <ListMusic size={14} /> Playlists
        </button>
        <button className={cx('tab', tab === 'liked' && 'is-active')} onClick={() => setTab('liked')}>
          <Heart size={14} /> Liked
        </button>
        <button className={cx('tab', tab === 'recent' && 'is-active')} onClick={() => setTab('recent')}>
          <History size={14} /> Recent
        </button>
        {list.length > 0 && (
          <button
            className="play-all"
            onClick={() =>
              tab === 'playlists'
                ? playQueue(playlists.flatMap((playlist) => playlist.tracks), 0)
                : playQueue(tracks, 0)
            }
          >
            <Play size={14} fill="currentColor" /> Play
          </button>
        )}
      </div>

      {tab === 'playlists' && (
        <div className="library-import">
          <span className="library-import-label">Add from a link</span>
          <button className="library-import-btn is-spotify" onClick={() => onImport('spotify')}>
            <SpotifyMark size={15} /> Spotify playlist
          </button>
          <button className="library-import-btn is-youtube" onClick={() => onImport('ytmusic')}>
            <YoutubeMusicMark size={15} /> YouTube Music
          </button>
        </div>
      )}

      {!list.length ? (
        <div className="empty">
          {tab === 'playlists' ? (
            <ListMusic size={26} />
          ) : tab === 'liked' ? (
            <Heart size={26} />
          ) : (
            <History size={26} />
          )}
          <h3>
            {tab === 'playlists'
              ? 'Playlists are on the way'
              : tab === 'liked'
                ? 'Songs you like live here'
                : 'Nothing played yet'}
          </h3>
          <p>
            {tab === 'playlists'
              ? 'Import a Spotify or YouTube Music playlist link above, or start from the home feed.'
              : tab === 'liked'
                ? 'Tap the heart on any track to build your collection.'
                : 'Start a song and it will show up in this list.'}
          </p>
          <button className="btn-primary" onClick={onBrowse}>
            <SearchIcon size={15} /> Find music
          </button>
        </div>
      ) : tab === 'playlists' ? (
        <div className="library-playlists">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              className="library-playlist"
              onClick={() => playQueue(playlist.tracks, 0)}
            >
              <span className="library-playlist-art">
                <Artwork src={playlist.artwork} alt={playlist.name} />
                {playlist.source && (
                  <span className={cx('library-playlist-source', `is-${playlist.source}`)}>
                    <PlaylistSourceMark source={playlist.source} size={12} />
                  </span>
                )}
                <span className="library-playlist-play">
                  <Play size={14} fill="currentColor" />
                </span>
              </span>
              <span className="library-playlist-name">{playlist.name}</span>
              <span className="library-playlist-sub">
                {countLabel(playlist.tracks.length, 'song')} ·{' '}
                {playlist.source === 'spotify'
                  ? 'Spotify'
                  : playlist.source === 'ytmusic'
                    ? 'YouTube Music'
                    : playlist.tracks[0]?.artist ?? 'Soul'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="library-grid">
          {tracks.map((track, position) => (
            <div key={track.id} className="library-item">
              <Artwork src={track.artwork} alt={track.title} className="library-art" />
              <div className="library-meta">
                <span className="row-title">{track.title}</span>
                <span className="row-artist">{track.artist}</span>
              </div>
              <button
                className="round-btn small"
                onClick={() => {
                  playQueue(tracks, position);
                  setOverlay('now');
                }}
                aria-label="Play"
              >
                <Play size={13} fill="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
