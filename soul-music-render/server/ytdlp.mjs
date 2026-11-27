// Locates the yt-dlp binary the audio resolver needs, and installs it on first
// use when the host has none. Hosts like Render do not ship yt-dlp, and the
// build step / PATH is not guaranteed, so the server heals itself at startup.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const isWindows = process.platform === 'win32';
const exe = isWindows ? 'yt-dlp.exe' : 'yt-dlp';

const RELEASE_URLS = [
  `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${exe}`,
  `https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/${exe}`,
];

const MIN_BYTES = 1_000_000;
const RETRY_AFTER_MS = 60_000;

let state = null; // { path } | { error, at }
let pending = null;

function isBinary(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size >= MIN_BYTES;
  } catch {
    return false;
  }
}

function localCandidates() {
  const list = [];
  if (process.env.YTDLP_PATH) list.push(path.resolve(process.env.YTDLP_PATH));
  for (const base of [ROOT, process.cwd()]) {
    list.push(path.join(base, 'bin', exe));
    list.push(path.join(base, 'node_modules', '.bin', exe));
    list.push(path.join(base, 'node_modules', 'yt-dlp', exe));
  }
  if (process.env.DATA_DIR) list.push(path.join(process.env.DATA_DIR, 'bin', exe));
  return [...new Set(list)];
}

function installDirs() {
  const list = [];
  if (process.env.DATA_DIR) list.push(path.join(process.env.DATA_DIR, 'bin'));
  list.push(path.join(ROOT, 'bin'), path.join(process.cwd(), 'bin'), path.join(os.tmpdir(), 'soul-ytdlp'));
  return [...new Set(list)];
}

function onPath() {
  // `yt-dlp --version` is cheap and only succeeds when the command exists.
  const probe = spawnSync(exe, ['--version'], { windowsHide: true, timeout: 15_000, encoding: 'utf8' });
  if (probe.status === 0) return exe;
  return null;
}

async function download() {
  const errors = [];
  for (const dir of installDirs()) {
    for (const url of RELEASE_URLS) {
      try {
        const res = await fetch(url, {
          redirect: 'follow',
          headers: { 'User-Agent': 'soul-music-server' },
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length < MIN_BYTES) throw new Error(`unexpected size ${bytes.length} bytes`);
        fs.mkdirSync(dir, { recursive: true });
        const target = path.join(dir, exe);
        fs.writeFileSync(target, bytes, { mode: 0o755 });
        try {
          fs.chmodSync(target, 0o755);
        } catch {
          /* ignore */
        }
        return target;
      } catch (error) {
        errors.push(`${url}: ${error.message}`);
      }
    }
  }
  throw new Error(`could not download yt-dlp (${errors[0] || 'no mirror reachable'})`);
}

async function resolveBinary() {
  for (const candidate of localCandidates()) {
    if (!isBinary(candidate)) continue;
    try {
      fs.chmodSync(candidate, 0o755);
    } catch {
      /* ignore */
    }
    return candidate;
  }
  const fromPath = onPath();
  if (fromPath) return fromPath;
  if (isWindows) {
    throw new Error('bin/yt-dlp.exe is missing; run `npm run fetch:ytdlp`');
  }
  return download();
}

export function ensureYtDlp({ force = false } = {}) {
  if (state?.path && isBinary(state.path) === true) return Promise.resolve(state.path);
  if (state?.path) state = null; // the file disappeared since last use
  if (state?.error && !force && Date.now() - state.at < RETRY_AFTER_MS) {
    return Promise.reject(new Error(state.error));
  }
  if (pending) return pending;

  pending = resolveBinary()
    .then((found) => {
      state = { path: found };
      console.log(`[yt-dlp] using ${found}`);
      return found;
    })
    .catch((error) => {
      state = { error: error.message, at: Date.now() };
      throw error;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function ytdlpStatus() {
  if (state?.path) return { ok: true, path: state.path };
  if (state?.error) return { ok: false, error: state.error };
  return { ok: false, error: 'not resolved yet' };
}
