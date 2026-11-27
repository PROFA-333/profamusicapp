import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Playlist, Track } from './types';

export type AccountProviderKind = 'google' | 'preview';

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  provider: AccountProviderKind;
  joinedAt: string;
  lastLoginAt: string;
}

export interface SavedData {
  liked?: Track[];
  recent?: Track[];
  volume?: number;
  playlists?: Playlist[];
  updatedAt?: string;
}

export interface AuthConfig {
  google: boolean;
  redirectUri: string;
  preview: boolean;
}

interface AccountValue {
  user: AccountUser | null;
  data: SavedData;
  ready: boolean;
  config: AuthConfig | null;
  authOpen: boolean;
  accountOpen: boolean;
  authBusy: boolean;
  authError: string | null;
  openAuth: () => void;
  closeAuth: () => void;
  openAccount: () => void;
  closeAccount: () => void;
  signInWithGoogle: (email?: string) => void;
  previewSignIn: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  save: (patch: SavedData) => void;
  clearAuthError: () => void;
}

const AccountContext = createContext<AccountValue | null>(null);

async function readJson(url: string): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [data, setData] = useState<SavedData>({});
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const userRef = useRef<AccountUser | null>(null);
  userRef.current = user;
  const pending = useRef<SavedData>({});
  const timer = useRef<number | null>(null);

  const save = useCallback((patch: SavedData) => {
    if (!userRef.current) return;
    pending.current = { ...pending.current, ...patch };
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const body = pending.current;
      pending.current = {};
      fetch('/api/me/data', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => undefined);
    }, 800);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([readJson('/api/auth/config'), readJson('/api/auth/me')]).then(([conf, session]) => {
      if (!alive) return;
      if (conf) setConfig(conf as AuthConfig);
      if (session?.user) {
        setUser(session.user as AccountUser);
        setData((session.data || {}) as SavedData);
      }
      setReady(true);
    });

    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('auth');
    if (outcome) {
      params.delete('auth');
      const rest = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`,
      );
      if (outcome === 'failed' || outcome === 'state') {
        setAuthError('Google sign-in did not complete. Please try again.');
        setAuthOpen(true);
      }
      if (outcome === 'cancelled') setAuthError('Sign-in was cancelled.');
      if (outcome === 'unconfigured') {
        setAuthError('Google sign-in is not configured on this server yet.');
        setAuthOpen(true);
      }
    }

    return () => {
      alive = false;
    };
  }, []);

  const signInWithGoogle = useCallback(
    (email?: string) => {
      if (!config?.google) {
        setAuthError(
          'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env, then restart the app.',
        );
        return;
      }
      setAuthError(null);
      const hint = email && email.includes('@') ? `?email=${encodeURIComponent(email.trim())}` : '';
      window.location.href = `/api/auth/google${hint}`;
    },
    [config],
  );

  const previewSignIn = useCallback(async (email?: string) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email || '' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Could not sign in.');
      setUser(body.user as AccountUser);
      setData((body.data || {}) as SavedData);
      setAuthOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = {};
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setData({});
    setAccountOpen(false);
  }, []);

  const openAuth = useCallback(() => {
    setAuthOpen(true);
    setAccountOpen(false);
  }, []);
  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    setAuthError(null);
  }, []);
  const openAccount = useCallback(() => {
    setAccountOpen(true);
    setAuthOpen(false);
  }, []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AccountValue>(
    () => ({
      user,
      data,
      ready,
      config,
      authOpen,
      accountOpen,
      authBusy,
      authError,
      openAuth,
      closeAuth,
      openAccount,
      closeAccount,
      signInWithGoogle,
      previewSignIn,
      signOut,
      save,
      clearAuthError,
    }),
    [
      user,
      data,
      ready,
      config,
      authOpen,
      accountOpen,
      authBusy,
      authError,
      openAuth,
      closeAuth,
      openAccount,
      closeAccount,
      signInWithGoogle,
      previewSignIn,
      signOut,
      save,
      clearAuthError,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used inside AccountProvider');
  return context;
}
