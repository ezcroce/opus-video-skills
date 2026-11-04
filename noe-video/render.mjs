// render.mjs — parallel, resumable frame render + ffmpeg encode.
//   node render.mjs --workers=2
//   node render.mjs --encode-only
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const FPS = +(args.fps || 24);
const WORKERS = +(args.workers || 2);
const PORT = +(args.port || 8123);
const FRAMES = path.resolve(HERE, args.frames || 'out/frames');
const OUT = path.resolve(HERE, args.out || 'out/video.mp4');
const AUDIO = path.resolve(HERE, args.audio || 'audio/mix.wav');
const CHROME = path.resolve(HERE, 'chromiumtest/package/bin/chromium');
const RENDER_SCALE = +(args.renderScale || 1.0);
const SHADOWS = args.shadows === '0' ? '0' : '1';
const query = `?samples=0&type=byte&scale=${RENDER_SCALE}&shadows=${SHADOWS}`;
const RANGE = args.range ? String(args.range).split(':').map(Number) : null;
const server = await startServer(PORT);
let canvasSize = { w: 1920, h: 1080 };

function ffmpegPath() {
  try {
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
  } catch { return 'ffmpeg'; }
}
const FFMPEG = ffmpegPath();

async function encode(total) {
  const hasAudio = fs.existsSync(AUDIO);
  const vf = args.outScale ? `scale=${args.outScale}:flags=lanczos` : 'scale=3840:2160:flags=lanczos';
  const cmd = [FFMPEG, '-y', '-loglevel', 'error', '-stats', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.jpg')];
  if (hasAudio) cmd.push('-i', AUDIO);
  cmd.push('-map', '0:v');
  if (hasAudio) cmd.push('-map', '1:a');
  cmd.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-vf', vf);
  if (hasAudio) cmd.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  cmd.push('-movflags', '+faststart', OUT);
  console.log('encoding:', cmd.join(' '));
  execFileSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
  console.log('wrote', OUT);
}

if (args['encode-only']) {
  const n = fs.readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length;
  console.log('frames:', n);
  await encode(n / FPS);
  server.close();
  process.exit(0);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--window-size=1920,1080', '--disable-dev-shm-usage', '--font-render-hinting=none', '--in-process-gpu', '--no-zygote', '--single-process'],
});
async function openPage(tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: canvasSize.w, height: canvasSize.h, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log(`[page${tag}]`, e.message.slice(0, 400)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.ready === true', { timeout: 180000 });
  return page;
}
const probe = await openPage('#probe');
const total = await probe.evaluate(() => window.DUR);
canvasSize = await probe.evaluate(() => ({ w: document.getElementById('c').width, h: document.getElementById('c').height }));
console.log('canvas', canvasSize);
const scenes = await probe.evaluate(() => window.SCENES);
console.log('GPU:', await probe.evaluate(() => window.getInfo().gpu));
console.log('duration:', total, 'scenes:', scenes.map(s => `${s.id}:${s.duration}`).join(' '));
await probe.close();
const n = RANGE ? Math.min(RANGE[1], Math.round(total * FPS)) - RANGE[0] : Math.round(total * FPS);
const offset = RANGE ? RANGE[0] : 0;
fs.mkdirSync(FRAMES, { recursive: true });
let next = 0;
const start = Date.now();
const pages = await Promise.all(Array.from({ length: WORKERS }, (_, i) => openPage('#' + i)));
let done = 0;
await Promise.all(pages.map(async (page, w) => {
  while (next < n) {
    const i = offset + next++;
    const file = path.join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`);
    if (fs.existsSync(file)) { done++; continue; }
    const t = i / FPS;
    await page.evaluate(t => window.renderFrame(t), t);
    const shot = await page.screenshot({ type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: canvasSize.w, height: canvasSize.h } });
    fs.writeFileSync(file, shot);
    done++;
    if (done % 50 === 0 || done === n) {
      const el = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`frame ${done}/${n}  t=${t.toFixed(2)}s  elapsed=${el}s`);
    }
  }
}));
await browser.close();
server.close();
console.log(`rendered ${n} frames in ${((Date.now() - start) / 1000).toFixed(0)}s`);
if (!args['no-encode']) await encode(total);
