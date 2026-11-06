// serve.mjs — tiny static server for the watch page, with HTTP Range support.
// Seeking an MP4 (and Safari playback) needs 206 responses; python -m http.server
// only sends 200 for the whole file. No dependencies: node serve.mjs [port].
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? new URL('.', import.meta.url).pathname);
const PORT = +(process.argv[2] || process.env.PORT || 8000);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('bad url'); return; }
  let file = resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end('forbidden'); return; }
  let st;
  try { st = statSync(file); } catch { res.writeHead(404).end('not found'); return; }
  if (st.isDirectory()) { file = resolve(file, 'index.html'); try { st = statSync(file); } catch { res.writeHead(404).end('not found'); return; } }
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  const range = req.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let status = 200, start = 0, end = st.size - 1;
  if (m) {
    const a = m[1] === '' ? null : +m[1], b = m[2] === '' || m[2] === undefined ? null : +m[2];
    if (a === null && b !== null) { start = Math.max(0, st.size - b); end = st.size - 1; }
    else { start = a ?? 0; end = Math.min(b ?? st.size - 1, st.size - 1); }
    if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
    status = 206;
    head['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  head['Content-Length'] = end - start + 1;
  res.writeHead(status, head);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file, { start, end }).pipe(res);
});
server.listen(PORT, '0.0.0.0', () => console.log(`watch page → http://0.0.0.0:${PORT}/`));
