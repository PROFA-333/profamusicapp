// Audio playback is resolved by yt-dlp (see server/audio.mjs). The Windows
// binary is bundled in bin/yt-dlp.exe, but Linux hosts (Render, a VPS) have no
// binary in the repo, so fetch the official release during `npm install`.
// Failure is non-fatal: the server still runs, only audio needs the binary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const target = path.join(root, 'bin', isWindows ? 'yt-dlp.exe' : 'yt-dlp');
const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${isWindows ? 'yt-dlp.exe' : 'yt-dlp'}`;

if (fs.existsSync(target)) {
  console.log(`[yt-dlp] already present at ${path.relative(root, target)}`);
  process.exit(0);
}

if (isWindows) {
  console.warn('[yt-dlp] bin/yt-dlp.exe is missing; run `npm run fetch:ytdlp` on Windows to restore it');
  process.exit(0);
}

try {
  console.log(`[yt-dlp] downloading ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1_000_000) throw new Error(`unexpected size ${bytes.length} bytes`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { mode: 0o755 });
  fs.chmodSync(target, 0o755);
  console.log(`[yt-dlp] installed ${path.relative(root, target)} (${(bytes.length / 1e6).toFixed(1)} MB)`);
} catch (error) {
  console.warn(`[yt-dlp] could not download the binary: ${error.message}`);
  console.warn('[yt-dlp] the app will run, but /api/stream will return 502 until it is available');
}
