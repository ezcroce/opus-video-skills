// render.mjs — renders index.html in headless Chrome, frame by frame.
//
//   Look at it (open the images with your image viewer / Read tool):
//     node render.mjs --sheet=0.5,2,4.5,7 --cols=4 --w=480 --out=out/check/a.jpg   key frames
//     node render.mjs --strip=4.0:4.5 --cols=6 --w=320 --out=out/check/strip.jpg    every frame of a moment
//     node render.mjs --stills=2.0,9.5 --out=out/stills                            full-res PNGs
//   Make the video:
//     node render.mjs --frames --workers=4                                              JPEG frames -> out/frames
//     node render.mjs --encode --out=out/reel.mp4 [--audio=assets/score.m4a]           frames -> MP4
//     node render.mjs --clip --out=out/reel.mp4 [--audio=...]                           straight to MP4
//
//   Flags: --fps=30  --page=path  --chrome=<path to Chrome>  --soft-gl
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));

// A project scaffolded by scripts/new_project.sh drops a .env next to this
// file when Chrome is not on the PATH. Read it so the renderer works out of
// the box.
if (process.env.CHROME_PATH === undefined) {
  const envFile = resolve(HERE, '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*CHROME_PATH\s*=\s*(.+?)\s*$/);
      if (m) { process.env.CHROME_PATH = m[1]; break; }
    }
  }
}

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));

function playwrightChromes() {
  const dir = `${homedir()}/.cache/ms-playwright`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => b.split('-')[1] - a.split('-')[1])
    .map(n => `${dir}/${n}/chrome-linux64/chrome`);
}

/**
 * Find a Chrome/Chromium binary.
 *
 * Order: an explicit --chrome, $CHROME_PATH, the usual system locations, the
 * Playwright cache, and finally this repo's own sandbox toolchain — which is
 * found by walking up from the script, so it also works for a project that was
 * scaffolded outside the repository.
 */
function findChrome() {
  const candidates = [
    args.chrome, process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/chromium-browser/chromium',
    ...playwrightChromes(),
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  // the repo's sandbox toolchain: walk up looking for .tools/bin/chromium
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    for (const rel of ['.tools/bin/chromium', '.tools/bin/chrome']) {
      const p = resolve(d, rel);
      if (existsSync(p)) return p;
    }
    const parent = resolve(d, '..');
    if (parent === d) break;
    d = parent;
  }
  return null;
}

const CHROME = findChrome();

if (!CHROME) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }

const fps = +(args.fps || 30);
const FRAMES_DIR = args['frames-dir'] || 'out/frames';
const PAGE = args.page || 'index.html';
const OUT_W = 1080, OUT_H = 1920;

const run = (cmd, a) => new Promise((ok, bad) => {
  const p = spawn(cmd, a, { stdio: 'inherit' });
  p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok());
});
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);

// ---- encode ---------------------------------------------------------------------------------
if (args.encode) {
  const out = args.out || 'out/reel.mp4';
  const n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  const audio = args.audio;
  console.log(`encoding ${n} frames -> ${out}${audio ? ' with ' + audio : ''}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(fps),
    '-i', `${FRAMES_DIR}/f%05d.jpg`,
    ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out]);
  console.log('wrote ' + out);
  process.exit(0);
}

// ---- launch ---------------------------------------------------------------------------------
const gpu = args['soft-gl']
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : process.platform === 'win32' ? ['--use-angle=d3d11']
  : process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-gl=angle'];
const sandbox = process.platform === 'linux' ? ['--no-sandbox'] : [];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: [...sandbox, '--allow-file-access-from-files', '--ignore-gpu-blocklist', ...gpu,
    '--enable-gpu-rasterization', `--window-size=${OUT_W},${OUT_H}`,
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--disable-dev-shm-usage'],
});

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: OUT_W, height: OUT_H, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(pathToFileURL(resolve(PAGE)).href, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 20000 });
  const dur = await page.evaluate('window.DUR');
  return { page, dur };
}

const { page, dur } = await openPage();
console.log(`page ready · ${dur.toFixed(2)}s @ ${fps}fps`);

// Screenshot the canvas element only, at its native size. The page also
// carries a scrub bar, and a plain page.screenshot() would include it — and
// the viewport may be smaller than the canvas, which would crop the frame.
// So the canvas is scaled into a temporary canvas of exactly OUT_W x OUT_H
// and that element is screenshotted.
const CANVAS_BOX = await page.evaluate((W, H) => {
  const src = document.getElementById('out');
  let tmp = document.getElementById('__shot');
  if (!tmp) {
    tmp = document.createElement('canvas');
    tmp.id = '__shot';
    tmp.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;';
    document.body.appendChild(tmp);
  }
  tmp.width = W; tmp.height = H;
  const c = tmp.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, W, H);
  const r = tmp.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: W, height: H };
}, OUT_W, OUT_H);

async function shoot(t) {
  await page.evaluate((tt, W, H) => {
    window.renderFrame(tt);
    const src = document.getElementById('out');
    const tmp = document.getElementById('__shot');
    const c = tmp.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, W, H);
    c.drawImage(src, 0, 0, W, H);
  }, t, OUT_W, OUT_H);
  return page.screenshot({ type: 'jpeg', quality: 94, clip: CANVAS_BOX });
}

// ---- contact sheet ----------------------------------------------------------------------------
if (args.sheet) {
  const ts = times(args.sheet);
  const cols = +(args.cols || 4);
  const w = +(args.w || 480);
  const h = Math.round(w * OUT_H / OUT_W);
  const rows = Math.ceil(ts.length / cols);
  const shots = [];
  for (const t of ts) shots.push(await shoot(t));
  // tile them with ffmpeg
  mkdirSync(dirname(args.out || 'out/check/sheet.jpg'), { recursive: true });
  const tmp = 'out/.sheet';
  mkdirSync(tmp, { recursive: true });
  for (let i = 0; i < shots.length; i++) {
    writeFileSync(`${tmp}/s${String(i).padStart(3, '0')}.jpg`, shots[i]);
  }
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${tmp}/s%03d.jpg`,
    '-vf', `scale=${w}:${h},tile=${cols}x${rows}:padding=6:color=0x1a1a1a`,
    '-frames:v', '1', args.out || 'out/check/sheet.jpg']);
  console.log('wrote ' + (args.out || 'out/check/sheet.jpg'));
  await browser.close();
  process.exit(0);
}

// ---- strip: every frame of a stretch -----------------------------------------------------------
if (args.strip) {
  const [a, b] = span(args.strip);
  const n = Math.max(2, Math.round((b - a) * fps));
  const cols = +(args.cols || 6);
  const w = +(args.w || 320);
  const h = Math.round(w * OUT_H / OUT_W);
  const rows = Math.ceil(n / cols);
  const tmp = 'out/.strip';
  mkdirSync(tmp, { recursive: true });
  for (let i = 0; i < n; i++) {
    const t = a + i / fps;
    const shot = await shoot(t);
    writeFileSync(`${tmp}/s${String(i).padStart(3, '0')}.jpg`, shot);
  }
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${tmp}/s%03d.jpg`,
    '-vf', `scale=${w}:${h},tile=${cols}x${rows}:padding=4:color=0x1a1a1a`,
    '-frames:v', '1', args.out || 'out/check/strip.jpg']);
  console.log('wrote ' + (args.out || 'out/check/strip.jpg'));
  await browser.close();
  process.exit(0);
}

// ---- stills ------------------------------------------------------------------------------------
if (args.stills) {
  const dir = args.out || 'out/stills';
  mkdirSync(dir, { recursive: true });
  for (const t of times(args.stills)) {
    const shot = await shoot(t);
    const name = `${dir}/t${t.toFixed(2).replace('.', '_')}.jpg`;
    writeFileSync(name, shot);
    console.log('wrote ' + name);
  }
  await browser.close();
  process.exit(0);
}

// ---- frames ------------------------------------------------------------------------------------
if (args.frames) {
  const workers = +(args.workers || 4);
  const total = Math.round(dur * fps);
  mkdirSync(FRAMES_DIR, { recursive: true });
  let done = 0;
  const t0 = Date.now();

  const ranges = [];
  const chunk = Math.ceil(total / workers);
  for (let w = 0; w < workers; w++) {
    const start = w * chunk, end = Math.min(total, start + chunk);
    if (start < end) ranges.push([start, end]);
  }

  await Promise.all(ranges.map(async ([start, end]) => {
    const p = await browser.newPage();
    await p.setViewport({ width: OUT_W, height: OUT_H, deviceScaleFactor: 1 });
    await p.goto(pathToFileURL(resolve(PAGE)).href, { waitUntil: 'load' });
    await p.waitForFunction('window.__ready === true', { timeout: 20000 });
    const box = await p.evaluate((W, H) => {
      let tmp = document.getElementById('__shot');
      if (!tmp) {
        tmp = document.createElement('canvas');
        tmp.id = '__shot';
        tmp.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;';
        document.body.appendChild(tmp);
      }
      tmp.width = W; tmp.height = H;
      const r = tmp.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), width: W, height: H };
    }, OUT_W, OUT_H);
    for (let i = start; i < end; i++) {
      const name = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      if (existsSync(name)) { done++; continue; }        // resumable
      await p.evaluate((tt, W, H) => {
        window.renderFrame(tt);
        const c = document.getElementById('__shot').getContext('2d');
        c.imageSmoothingEnabled = false;
        c.clearRect(0, 0, W, H);
        c.drawImage(document.getElementById('out'), 0, 0, W, H);
      }, i / fps, OUT_W, OUT_H);
      const shot = await p.screenshot({ type: 'jpeg', quality: 95, clip: box });
      writeFileSync(name, shot);
      done++;
      if (done % 60 === 0) process.stdout.write(`\r  ${done}/${total}`);
    }
    await p.close();
  }));

  const ms = Date.now() - t0;
  console.log(`\n${total} frames in ${(ms / 1000).toFixed(1)}s (${(ms / total).toFixed(0)} ms/frame)`);
  await browser.close();
  process.exit(0);
}

// ---- clip: straight to mp4 ----------------------------------------------------------------------
if (args.clip) {
  const out = args.out || 'out/reel.mp4';
  mkdirSync(dirname(out), { recursive: true });
  const tmp = 'out/.clip';
  mkdirSync(tmp, { recursive: true });
  const total = Math.round(dur * fps);
  for (let i = 0; i < total; i++) {
    const shot = await shoot(i / fps);
    writeFileSync(`${tmp}/f${String(i).padStart(5, '0')}.jpg`, shot);
  }
  const audio = args.audio;
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${tmp}/f%05d.jpg`,
    ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out]);
  console.log('wrote ' + out);
  await browser.close();
  process.exit(0);
}

console.log('nothing to do: pass --sheet, --strip, --stills, --frames or --clip');
await browser.close();
