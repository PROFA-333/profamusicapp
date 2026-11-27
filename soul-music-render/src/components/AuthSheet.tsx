import { ArrowRight, LockKeyhole, Radio, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAccount } from '../account';
import { GoogleMark } from './BrandMarks';

export function AuthSheet() {
  const {
    authOpen,
    closeAuth,
    config,
    authError,
    authBusy,
    signInWithGoogle,
    previewSignIn,
    clearAuthError,
  } = useAccount();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authOpen, closeAuth]);

  useEffect(() => {
    if (!authOpen) {
      setEmail('');
      clearAuthError();
    }
  }, [authOpen, clearAuthError]);

  if (!authOpen) return null;

  const configured = Boolean(config?.google);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (configured) signInWithGoogle(email);
    else previewSignIn(email);
  };

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="auth-card">
        <button className="auth-close" onClick={closeAuth} aria-label="Close sign in">
          <X size={17} />
        </button>

        <div className="auth-brand">
          <Radio size={13} />
          Soul Music
        </div>

        <h1 id="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account</p>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span className="auth-field-body">
              <span className="auth-field-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
                spellCheck={false}
              />
            </span>
            <button className="auth-arrow" type="submit" aria-label="Continue" disabled={authBusy}>
              <ArrowRight size={17} />
            </button>
          </label>
        </form>

        <div className="auth-or">
          <span>or</span>
        </div>

        <button className="auth-google" type="button" onClick={() => signInWithGoogle(email)}>
          <GoogleMark size={19} />
          <span>Continue with Google</span>
          <ArrowRight size={16} className="auth-google-arrow" />
        </button>

        <p className="auth-note">
          <LockKeyhole size={12} /> Only Google accounts can be connected
        </p>

        {authError && <p className="auth-error">{authError}</p>}

        {!configured && config && (
          <div className="auth-setup">
            <strong>One-time Google setup</strong>
            Create a Web OAuth client in Google Cloud Console, then add its keys to <code>.env</code>:
            <code>GOOGLE_CLIENT_ID=…</code>
            <code>GOOGLE_CLIENT_SECRET=…</code>
            Authorized redirect URI:
            <code>{config.redirectUri}</code>
            <button className="auth-preview" type="button" onClick={() => previewSignIn(email)}>
              {authBusy ? 'Opening your account…' : 'Or preview an account locally'}
            </button>
          </div>
        )}

        <p className="auth-foot">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => signInWithGoogle(email)}>
            Sign up
          </button>
        </p>

        <p className="auth-credit">made by PROFA</p>
      </div>
    </div>
  );
}
