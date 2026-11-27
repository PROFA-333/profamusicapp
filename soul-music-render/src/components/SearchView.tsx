import { Loader2, Play, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { searchTracks } from '../api';
import { usePlayer } from '../player';
import { SOURCES, sourceAccent } from '../sources';
import type { SearchResponse } from '../types';
import { cx, countLabel } from '../utils';
import { Artwork } from './Artwork';
import { TrackRow } from './TrackRow';

const RECENT_KEY = 'aurora.searches.v1';

function readRecent(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]).slice(0, 6);
  } catch {
    return [];
  }
}

export function SearchView() {
  const { playQueue, openArtist } = usePlayer();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchTracks(trimmed, source, controller.signal)
        .then((response) => {
          setData(response);
          setRecent((prev) => {
            const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 6);
            try {
              localStorage.setItem(RECENT_KEY, JSON.stringify(next));
            } catch {
              /* ignore */
            }
            return next;
          });
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') setData({ tracks: [], top: null, warning: error.message });
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, source]);

  const tracks = data?.tracks ?? [];
  const activeSource = SOURCES.find((item) => item.id === source);

  return (
    <div className="view search">
      <div className="searchbar">
        <SearchIcon size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={source === 'all' ? 'Songs, artists, albums across 12 sources' : `Search ${activeSource?.name}`}
          aria-label="Search music"
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="chips source-chips">
        <button className={cx('chip', source === 'all' && 'is-active')} onClick={() => setSource('all')}>
          <Sparkles size={13} /> All sources
        </button>
        {SOURCES.map((item) => (
          <button
            key={item.id}
            className={cx('chip', source === item.id && 'is-active')}
            onClick={() => setSource(item.id)}
            style={
              source === item.id
                ? { background: `linear-gradient(120deg, ${item.accent[0]}, ${item.accent[1]})` }
                : { borderColor: `${item.accent[0]}44` }
            }
          >
            {item.name}
          </button>
        ))}
      </div>

      {!query.trim() && (
        <div className="search-intro">
          <header className="section-head">
            <h2>Browse all</h2>
            <span className="section-hint">12 sources</span>
          </header>
          <div className="source-grid">
            {SOURCES.map((item, index) => (
              <button
                key={item.id}
                className="source-tile"
                style={{
                  background: `linear-gradient(140deg, ${item.accent[0]}, ${item.accent[1]})`,
                  animationDelay: `${index * 18}ms`,
                }}
                onClick={() => {
                  setSource(item.id);
                  inputRef.current?.focus();
                }}
              >
                <span>{item.name}</span>
                <SearchIcon size={16} />
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <div className="recent">
              <header className="section-head">
                <h2>Recent searches</h2>
                <button className="link-btn" onClick={() => {
                  setRecent([]);
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {
                    /* ignore */
                  }
                }}>
                  Clear
                </button>
              </header>
              <div className="chips">
                {recent.map((item) => (
                  <button key={item} className="chip" onClick={() => setQuery(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {query.trim() && loading && !data && (
        <div className="search-loading">
          <Loader2 className="spin" size={22} /> Searching the catalogs…
        </div>
      )}

      {query.trim() && data?.warning && (
        <div className="notice">
          <div>
            <strong>{activeSource?.name ?? 'Source'} is unavailable</strong>
            <p>{data.warning}</p>
          </div>
          <button className="ghost-btn" onClick={() => setSource('ytmusic')}>
            Use YouTube Music
          </button>
        </div>
      )}

      {query.trim() && data && !data.warning && tracks.length === 0 && !loading && (
        <div className="empty">
          <SearchIcon size={26} />
          <h3>No results for “{query.trim()}”</h3>
          <p>Try a different spelling, or switch the source filter above.</p>
        </div>
      )}

      {tracks.length > 0 && data?.top && (
        <div className="search-results">
          <section className="top-result">
            <div className="top-art">
              <Artwork src={data.top.artwork} alt={data.top.title} />
            </div>
            <div className="top-copy">
              <span className="eyebrow">Top result</span>
              <h2>{data.top.title}</h2>
              <p>
                <button className="artist-link" onClick={() => openArtist(data.top!.artist)}>
                  {data.top.artist}
                </button>{' '}
                · <span style={{ color: sourceAccent(data.top.source)[0] }}>{data.top.sourceName}</span>
              </p>
              <button className="btn-primary" onClick={() => playQueue(tracks, 0)}>
                <Play size={15} fill="currentColor" /> Play all
              </button>
            </div>
          </section>

          <section className="section">
            <header className="section-head">
              <h2> Songs</h2>
              <span className="section-hint">{countLabel(tracks.length, 'result')}</span>
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
        </div>
      )}
    </div>
  );
}
