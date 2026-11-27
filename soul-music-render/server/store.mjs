import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(root, 'data');
const file = path.join(dataDir, 'account.json');
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

let db = null;

function load() {
  if (db) return db;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    db = {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
      data: parsed.data && typeof parsed.data === 'object' ? parsed.data : {},
    };
  } catch {
    db = { users: {}, sessions: {}, data: {} };
  }
  return db;
}

function persist() {
  const state = load();
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state));
  fs.renameSync(temp, file);
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    provider: user.provider,
    joinedAt: user.joinedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function upsertUser(profile) {
  const state = load();
  const now = new Date().toISOString();
  const existing = state.users[profile.id];
  const user = {
    id: profile.id,
    name: profile.name || existing?.name || 'Listener',
    email: profile.email || existing?.email || '',
    avatar: profile.avatar ?? existing?.avatar ?? null,
    provider: profile.provider || existing?.provider || 'google',
    googleId: profile.googleId ?? existing?.googleId ?? null,
    joinedAt: existing?.joinedAt || now,
    lastLoginAt: now,
    logins: (existing?.logins || 0) + 1,
  };
  state.users[user.id] = user;
  persist();
  return user;
}

export function createSession(userId) {
  const state = load();
  const token = crypto.randomBytes(32).toString('hex');
  state.sessions[token] = { userId, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL };
  persist();
  return token;
}

export function sessionUser(token) {
  if (!token) return null;
  const state = load();
  const session = state.sessions[token];
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    delete state.sessions[token];
    persist();
    return null;
  }
  return state.users[session.userId] || null;
}

export function destroySession(token) {
  if (!token) return;
  const state = load();
  if (!state.sessions[token]) return;
  delete state.sessions[token];
  persist();
}

export function getData(userId) {
  const state = load();
  const data = state.data[userId];
  return data && typeof data === 'object' ? data : {};
}

export function patchData(userId, patch) {
  const state = load();
  const current = getData(userId);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  state.data[userId] = next;
  persist();
  return next;
}
