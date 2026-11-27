import { Loader2, Link2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { importPlaylist } from '../api';
import type { Playlist } from '../types';
import { countLabel } from '../utils';
import { SpotifyMark, YoutubeMusicMark } from './BrandMarks';

export type ImportSource = 'spotify' | 'ytmusic';

interface ImportSheetProps {
  source: ImportSource;
  onSource: (source: ImportSource) => void;
  onClose: () => void;
  onImported: (playlist: Playlist) => void;
}

const PLACEHOLDER: Record<ImportSource, string> = {
  spotify: 'https://open.spotify.com/playlist/…',
  ytmusic: 'https://music.youtube.com/playlist?list=…',
};

export function ImportSheet({ source, onSource, onClose, onImported }: ImportSheetProps) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; added: number; total: number } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchSource = (next: ImportSource) => {
    if (next === source) return;
    onSource(next);
    setUrl('');
    setError(null);
    setResult(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Paste a playlist link first.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const playlist = await importPlaylist(trimmed);
      onImported(playlist);
      setResult({
        name: playlist.name,
        added: playlist.tracks.length,
        total: playlist.total ?? playlist.tracks.length,
      });
      setUrl('');
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not import that playlist.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-screen import-screen" onClick={onClose} role="dialog" aria-modal="true">
      <div className="import-card" onClick={(event) => event.stopPropagation()}>
        <header className="account-head">
          <span>Add a playlist</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close import">
            <X size={17} />
          </button>
        </header>

        <h2 className="import-title">Bring your playlists over</h2>
        <p className="import-sub">
          Paste a public playlist link. Soul matches every song to playable audio and saves the
          playlist to your library.
        </p>

        <div className="import-sources">
          <button
            className={`import-source${source === 'spotify' ? ' is-active' : ''}`}
            onClick={() => switchSource('spotify')}
          >
            <SpotifyMark size={22} />
            <span>
              Spotify
              <small>Playlist link</small>
            </span>
          </button>
          <button
            className={`import-source${source === 'ytmusic' ? ' is-active' : ''}`}
            onClick={() => switchSource('ytmusic')}
          >
            <YoutubeMusicMark size={22} />
            <span>
              YouTube Music
              <small>Playlist link</small>
            </span>
          </button>
        </div>

        <form className="import-form" onSubmit={submit}>
          <label className="import-input">
            <Link2 size={15} />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={PLACEHOLDER[source]}
              spellCheck={false}
              disabled={busy}
            />
          </label>
          <button className="import-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : 'Import'}
          </button>
        </form>

        {busy && (
          <p className="import-status">
            Resolving tracks on YouTube Music — this can take a few seconds for longer playlists.
          </p>
        )}
        {error && <p className="auth-error">{error}</p>}
        {result && (
          <div className="import-result">
            <strong>{result.name}</strong>
            <span>
              Saved {countLabel(result.added, 'song')}
              {result.total > result.added ? ` of ${result.total} requested` : ''} to your library.
            </span>
            <button onClick={onClose}>Done</button>
          </div>
        )}

        <p className="import-hint">
          Only public playlists work. Spotify songs are matched to the closest YouTube Music track,
          so a few may differ from the original.
        </p>
      </div>
    </div>
  );
}
