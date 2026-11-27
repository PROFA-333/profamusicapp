import crypto from 'node:crypto';
import express from 'express';
import {
  createSession,
  destroySession,
  getData,
  patchData,
  publicUser,
  sessionUser,
  upsertUser,
} from './store.mjs';

const SESSION_COOKIE = 'aurora_session';
const STATE_COOKIE = 'aurora_oauth_state';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function googleCredentials() {
  const id = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const secret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  return id && secret ? { id, secret } : null;
}

function cookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const piece of header.split(';')) {
    const split = piece.indexOf('=');
    if (split === -1) continue;
    const key = piece.slice(0, split).trim();
    try {
      out[key] = decodeURIComponent(piece.slice(split + 1).trim());
    } catch {
      out[key] = piece.slice(split + 1).trim();
    }
  }
  return out;
}

export function appOrigin(req) {
  const configured = String(process.env.APP_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (configured) return configured;
  const forwarded = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const proto = forwarded || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

function redirectUri(req) {
  return `${appOrigin(req)}/api/auth/google/callback`;
}

function cookieOptions(req, maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: appOrigin(req).startsWith('https://'),
    path: '/',
    maxAge,
  };
}

function sessionOf(req) {
  const user = sessionUser(cookies(req)[SESSION_COOKIE]);
  return user ? publicUser(user) : null;
}

function tidy(value, max = 400) {
  return String(value || '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

export function accountRouter() {
  const router = express.Router();

  router.get('/auth/config', (req, res) => {
    const creds = googleCredentials();
    res.json({
      google: Boolean(creds),
      redirectUri: redirectUri(req),
      preview: !creds,
    });
  });

  router.get('/auth/google', (req, res) => {
    const creds = googleCredentials();
    if (!creds) {
      return res.status(503).json({
        error: 'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.',
      });
    }
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, { ...cookieOptions(req, 10 * 60 * 1000) });
    const params = new URLSearchParams({
      client_id: creds.id,
      redirect_uri: redirectUri(req),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    const email = tidy(req.query.email, 160);
    if (email.includes('@')) params.set('login_hint', email);
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  router.get('/auth/google/callback', async (req, res) => {
    const creds = googleCredentials();
    const state = tidy(req.query.state);
    if (!creds) return res.redirect('/?auth=unconfigured');
    if (req.query.error) return res.redirect('/?auth=cancelled');
    if (!req.query.code || !state || state !== cookies(req)[STATE_COOKIE]) {
      return res.redirect('/?auth=state');
    }

    try {
      const tokenRes = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(req.query.code),
          client_id: creds.id,
          client_secret: creds.secret,
          redirect_uri: redirectUri(req),
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) return res.redirect('/?auth=failed');
      const tokens = await tokenRes.json();

      const infoRes = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      });
      if (!infoRes.ok) return res.redirect('/?auth=failed');
      const profile = await infoRes.json();
      if (!profile?.sub || !profile?.email) return res.redirect('/?auth=failed');

      const user = upsertUser({
        id: `google:${profile.sub}`,
        googleId: profile.sub,
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.picture || null,
        provider: 'google',
      });
      const token = createSession(user.id);
      res.cookie(SESSION_COOKIE, token, cookieOptions(req, 1000 * 60 * 60 * 24 * 30));
      res.clearCookie(STATE_COOKIE, { path: '/' });
      res.redirect('/?auth=ok');
    } catch {
      res.redirect('/?auth=failed');
    }
  });

  // Local-only fallback so the account screen and saved library can be tried
  // before Google OAuth credentials are configured.
  router.post('/auth/preview', (req, res) => {
    if (googleCredentials()) {
      return res.status(403).json({ error: 'Use Continue with Google to sign in.' });
    }
    const email = tidy(req.body?.email, 160).toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const address = valid ? email : 'preview@soul.local';
    const name = address
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const user = upsertUser({
      id: `preview:${crypto.createHash('sha1').update(address).digest('hex').slice(0, 12)}`,
      name,
      email: address,
      provider: 'preview',
    });
    const token = createSession(user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions(req, 1000 * 60 * 60 * 24 * 30));
    res.json({ user: publicUser(user), data: getData(user.id) });
  });

  router.get('/auth/me', (req, res) => {
    const user = sessionOf(req);
    if (!user) return res.json({ user: null, data: {} });
    res.json({ user, data: getData(user.id) });
  });

  router.post('/auth/logout', (req, res) => {
    destroySession(cookies(req)[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  router.patch('/me/data', (req, res) => {
    const token = cookies(req)[SESSION_COOKIE];
    const user = sessionUser(token);
    if (!user) return res.status(401).json({ error: 'Sign in to save your music.' });

    const patch = {};
    if (Array.isArray(req.body?.liked)) patch.liked = req.body.liked.slice(0, 500);
    if (Array.isArray(req.body?.recent)) patch.recent = req.body.recent.slice(0, 60);
    if (Array.isArray(req.body?.playlists)) {
      patch.playlists = req.body.playlists.slice(0, 60).filter((item) => item && item.id && item.name);
    }
    if (Number.isFinite(Number(req.body?.volume))) {
      patch.volume = Math.max(0, Math.min(1, Number(req.body.volume)));
    }
    if (!Object.keys(patch).length) return res.json({ ok: true, data: getData(user.id) });
    res.json({ ok: true, data: patchData(user.id, patch) });
  });

  return router;
}
