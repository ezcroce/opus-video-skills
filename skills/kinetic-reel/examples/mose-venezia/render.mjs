// render.mjs — draws the episode frame by frame on a 2D canvas (@napi-rs/canvas) and encodes with ffmpeg.
//
//   node render.mjs --sheet=2,9,16,25 --cols=4 --out=out/check/sheet.png     contact sheet of chosen times
//   node render.mjs --strip=16.0:18.0 --cols=6 --out=out/check/strip.png    every other frame in a stretch
//   node render.mjs --still=27.4 --out=out/check/f27.png                    one full-res frame
//   node render.mjs --frames [--range=0:62] --workers=4                     JPEG frames → out/frames
//   node render.mjs --encode [--audio=out/mix.wav] --out=out/mose.mp4       out/frames → MP4
//   node render.mjs --clip --audio=out/mix.wav --out=out/mose.mp4           straight to MP4
//
// Every frame is a pure function of t: draw(t) paints the whole frame, nothing is kept between frames.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync, existsSync, statSync, readdirSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
import { S, DUR, VO } from './src/cues.js';
import { draw, computeLayout } from './src/scene.js';

// toolchain: ffmpeg from PATH, or FFMPEG=/path; fonts from FONT_DIR (a fontsource checkout), or the local cache
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const FPS = +(args.fps || 24);
const W = 1920, H = 1080;
const FRAMES_DIR = 'out/frames';

// fonts: real files, no network, registered before the first frame
const FONTS = process.env.FONT_DIR || `${homedir()}/.cache/tooling/node_modules/@fontsource`;
const reg = [
  ['BarlowCond', `${FONTS}/barlow-condensed/files/barlow-condensed-latin-700-normal.woff`],
  ['BarlowCond', `${FONTS}/barlow-condensed/files/barlow-condensed-latin-500-normal.woff`],
  ['BarlowCond', `${FONTS}/barlow-condensed/files/barlow-condensed-latin-400-normal.woff`],
  ['ArchivoBlack', `${FONTS}/archivo-black/files/archivo-black-latin-400-normal.woff`],
  ['JetBrainsMono', `${FONTS}/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff`],
  ['JetBrainsMono', `${FONTS}/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff`],
  ['InstrumentSerif', `${FONTS}/instrument-serif/files/instrument-serif-latin-400-italic.woff`],
];
for (const [fam, path] of reg) {
  if (!existsSync(path)) {
    console.error(`missing font: ${path}\n  npm i @fontsource/barlow-condensed @fontsource/archivo-black @fontsource/jetbrains-mono @fontsource/instrument-serif\n  then re-run with FONT_DIR=<path to node_modules/@fontsource>`);
    process.exit(1);
  }
  GlobalFonts.registerFromPath(path, fam);
}

const layout = computeLayout(W, H);
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

const frame = t => { ctx.save(); draw(ctx, t, W, H, { VO, S, ...layout }); ctx.restore(); };
const jpeg = (t, q = 0.95) => { frame(t); return canvas.toBuffer('image/jpeg', q); };
const mpegFrame = t => { frame(t); return canvas.toBuffer('image/jpeg', 0.93); };
const png = t => { frame(t); return canvas.toBuffer('image/png'); };

// ---- contact sheet -------------------------------------------------------------------------
if (args.sheet || args.strip) {
  const times = args.strip ? span(args.strip) : String(args.sheet).split(',').map(Number);
  const cols = +(args.cols || (args.strip ? 6 : 4)), tw = +(args.w || (args.strip ? 320 : 640)), th = Math.round(tw * H / W);
  const rows = Math.ceil(times.length / cols), out = args.out || 'out/check/sheet.jpg';
  const sheet = createCanvas(tw * cols, th * rows), sc = sheet.getContext('2d');
  sc.fillStyle = '#111'; sc.fillRect(0, 0, sheet.width, sheet.height);
  times.forEach((t, i) => {
    frame(t);
    sc.drawImage(canvas, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
    sc.fillStyle = '#000a'; sc.fillRect((i % cols) * tw, Math.floor(i / cols) * th, 62, 20);
    sc.fillStyle = '#fff'; sc.font = '700 13px JetBrainsMono';
    sc.fillText(t.toFixed(1), (i % cols) * tw + 5, Math.floor(i / cols) * th + 15);
  });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, sheet.toBuffer('image/png'));
  console.log(`${out}  ${times.length} frames  ${sheet.width}×${sheet.height}`);
} else if (args.still) {
  const t = +args.still, out = args.out || `out/check/t${String(t).replace('.', '_')}.png`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png(t));
  console.log(`${out}`);
} else if (args.frames || args.clip) {
  const [a, b] = args.range ? args.range.split(':').map(Number) : [0, DUR];
  if (args.clip) {
    // one pass, frames piped into ffmpeg
    const out = args.out || 'out/mose.mp4';
    mkdirSync(dirname(out), { recursive: true });
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...(args.audio ? ['-i', args.audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((b - a) * FPS), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = mpegFrame(a + i / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 48 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - t0) / (i + 1)).toFixed(0)} ms/frame`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`wrote ${out}`);
  } else {
    // parallel + resumable
    const workers = +(args.workers || 4);
    mkdirSync(FRAMES_DIR, { recursive: true });
    const first = Math.round(a * FPS), last = Math.round(b * FPS) - 1;
    const todo = [];
    for (let i = first; i <= last; i++) {
      const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      if (!existsSync(f) || statSync(f).size < 800) todo.push(i);
    }
    console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), 1 canvas (2D is fast, no workers needed)`);
    const t0 = Date.now();
    todo.forEach((i, k) => {
      const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      writeFileSync(f + '.tmp', mpegFrame(i / FPS)); renameSync(f + '.tmp', f);
      if (k % 60 === 0 || k === todo.length - 1) console.log(`frame ${k + 1}/${todo.length}  ${((Date.now() - t0) / (k + 1)).toFixed(0)} ms/frame`);
    });
    void workers;
  }
} else if (args.encode) {
  const out = args.out || 'out/mose.mp4';
  const n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  console.log(`encoding ${n} frames → ${out}${args.audio ? ' with ' + args.audio : ''}`);
  await new Promise((ok, bad) => {
    const p = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-stats', '-framerate', String(FPS), '-i', `${FRAMES_DIR}/f%05d.jpg`,
      ...(args.audio ? ['-i', args.audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
    p.on('close', c => c ? bad(new Error('ffmpeg ' + c)) : ok());
  });
  console.log(`wrote ${out}`);
} else {
  console.log('nothing to do: see the usage notes at the top of render.mjs');
}

function span(s) {
  const [a, b] = String(s).split(':').map(Number);
  const out = [];
  for (let i = Math.round(a * FPS); i <= Math.round(b * FPS); i += 2) out.push(i / FPS);
  return out;
}
