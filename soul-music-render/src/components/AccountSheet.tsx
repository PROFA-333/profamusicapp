import { Check, LogOut, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from '../account';
import { GoogleMark } from './BrandMarks';

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || 'A').slice(0, 1).toUpperCase();
  if (!url || broken) return <span className="account-initial">{initial}</span>;
  return (
    <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  );
}

export function AccountSheet() {
  const { accountOpen, closeAccount, user, data, signOut } = useAccount();

  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAccount();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [accountOpen, closeAccount]);

  if (!accountOpen || !user) return null;

  const liked = data.liked?.length ?? 0;
  const recent = data.recent?.length ?? 0;
  const playlists = data.playlists?.length ?? 0;
  const isGoogle = user.provider === 'google';

  return (
    <div className="account-screen" onClick={closeAccount} role="dialog" aria-modal="true">
      <div className="account-card" onClick={(event) => event.stopPropagation()}>
        <header className="account-head">
          <span>Account</span>
          <button className="icon-btn" onClick={closeAccount} aria-label="Close account">
            <X size={17} />
          </button>
        </header>

        <div className="account-hero">
          <span className="account-avatar">
            <Avatar url={user.avatar} name={user.name} />
          </span>
          <div className="account-identity">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="account-badge">
              {isGoogle ? <GoogleMark size={11} /> : <ShieldCheck size={12} />}
              {isGoogle ? 'Google account' : 'Local preview'}
            </span>
          </div>
        </div>

        <div className="account-stats">
          <div className="account-stat">
            <b>{liked}</b>
            <span>Liked</span>
          </div>
          <div className="account-stat">
            <b>{playlists}</b>
            <span>Playlists</span>
          </div>
          <div className="account-stat">
            <b>{recent}</b>
            <span>Recent</span>
          </div>
        </div>

        <dl className="account-details">
          <div className="account-detail">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="account-detail">
            <dt>Sign-in method</dt>
            <dd>{isGoogle ? 'Google' : 'Local preview'}</dd>
          </div>
          <div className="account-detail">
            <dt>Member since</dt>
            <dd>{formatDate(user.joinedAt)}</dd>
          </div>
          <div className="account-detail">
            <dt>Last sign in</dt>
            <dd>{formatDate(user.lastLoginAt)}</dd>
          </div>
          <div className="account-detail">
            <dt>Account ID</dt>
            <dd>{user.id.replace(/^google:/, '').slice(0, 18)}</dd>
          </div>
        </dl>

        <p className="account-saved">
          <Check size={14} /> Likes, playlists, history and volume are saved to this account.
        </p>

        <button className="account-signout" onClick={signOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
