// Frame renderer: paints every frame, pipes JPEGs into ffmpeg, muxes the episode audio.
//   node render.mjs --sheet=4,14,30 --cols=3 --w=640 --out=out/check/a.jpg
//   node render.mjs --from=30 --to=34 --fps=24 --out=out/test.mp4 [--audio=...]
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { W, H, paper, grain, vignette, setBoil, bleedPts, PAL } from './engine/core.mjs';
import SHOTS from './shots/index.mjs';

const args = process.argv.slice(2);
const val = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const flag = (n) => args.includes(`--${n}`);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const FPS = Number(val('fps', 24));
const cues = JSON.parse(readFileSync('cues.json', 'utf8'));
const DUR = cues.duration;

const main = createCanvas(W, H);
const mctx = main.getContext('2d');
const scene = createCanvas(W, H);
const sctx = scene.getContext('2d');

paper(mctx);                                // warms the paper/grain textures once

function drawShot(t) {
  const shot = SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];
  const lt = t - shot.start;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, W, H);
  sctx.save();
  shot.draw(sctx, lt, t, shot);
  sctx.restore();
  return shot;
}

// Every seam gets a transition: the outgoing shot closes into an organic bleed, the incoming opens out of it.
function transitionAt(t) {
  const D = 0.62;                      // full close+open, half on each side of the cut
  for (let i = 1; i < SHOTS.length; i++) {
    const cut = SHOTS[i].start;
    if (t > cut - D / 2 && t < cut + D / 2) {
      const k = (t - (cut - D / 2)) / D;         // 0 -> 1 across the cut
      const r = k < .5 ? lerp(H * .95, 0, ease(k * 2)) : lerp(0, H * 1.35, ease((k - .5) * 2));
      return { k, r };
    }
  }
  return null;
}
const lerp = (a, b, x) => a + (b - a) * x;
const ease = x => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

function frame(t) {
  const shot = drawShot(t);
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.globalCompositeOperation = 'source-over';
  mctx.globalAlpha = 1;
  paper(mctx);                             // the sheet under the paint

  const tr = transitionAt(t);
  mctx.save();
  if (tr) {
    // bleed edge: the cut happens inside a wobbling watercolour shape
    const cx = W / 2, cy = H / 2;
    mctx.beginPath();
    const P = bleedPts(cx, cy, Math.max(1, tr.r), Math.floor(t * 12));
    P.forEach(([x, y], i) => i ? mctx.lineTo(x, y) : mctx.moveTo(x, y));
    mctx.closePath();
    mctx.clip();
  }
  mctx.drawImage(scene, 0, 0);
  mctx.restore();

  // tooth of the paper over the paint, so nothing looks digital
  grain(mctx, t, .5);

  // fade in and out on the sheet itself
  const fin = Math.min(1, t / .9), fout = Math.min(1, (DUR - t) / 1.6);
  const fade = Math.min(fin, fout);
  if (fade < 1) {
    mctx.save();
    mctx.globalAlpha = 1 - ease(fade);
    mctx.fillStyle = PAL.cream;
    mctx.fillRect(0, 0, W, H);
    mctx.restore();
  }
  vignette(mctx, .30);
  return shot;
}

// ------------------------------------------------------------ sheets ------
const sheetArg = val('sheet', '');
if (sheetArg) {
  const times = sheetArg.split(',').map(Number);
  const cols = Number(val('cols', 3));
  const tw = Number(val('w', 640)), th = Math.round(tw * H / W);
  const rows = Math.ceil(times.length / cols);
  const out = createCanvas(tw * cols, th * rows);
  const octx = out.getContext('2d');
  const t0 = Date.now();
  times.forEach((t, i) => {
    setBoil(Math.floor(t * FPS));
    frame(t);
    octx.drawImage(main, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
    octx.fillStyle = '#2E2421';
    octx.font = `${Math.round(tw * .028)}px sans-serif`;
    octx.fillText(`${t.toFixed(1)}s`, (i % cols) * tw + 8, Math.floor(i / cols) * th + th - 8);
  });
  const p = val('out', 'out/check/sheet.jpg');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, await out.encode('jpeg', 88));
  console.log(`sheet ${p}  ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s  (${((Date.now() - t0) / times.length).toFixed(0)} ms/frame)`);
  process.exit(0);
}

// ------------------------------------------------------------ encode ------
const from = Number(val('from', 0)), to = Number(val('to', DUR));
const outFile = val('out', 'out/podqa-01.mp4');
const audio = val('audio', '');
mkdirSync(dirname(outFile), { recursive: true });

const ff = [ '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-' ];
if (audio) ff.push('-i', audio);
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart');
if (audio) ff.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
ff.push(outFile);

const ffp = spawn(FFMPEG, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ffp.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));

let i0 = Math.round(from * FPS), i1 = Math.round(to * FPS);
let t0 = Date.now();
for (let i = i0; i < i1; i++) {
  const t = i / FPS;
  setBoil(i);
  frame(t);
  const buf = await main.encode('jpeg', 92);
  if (!ffp.stdin.write(buf)) await new Promise(r => ffp.stdin.once('drain', r));
  if ((i - i0) % 96 === 0) {
    const el = (Date.now() - t0) / 1000, done_ = i - i0 + 1, rest = (i1 - i0 - done_) / (done_ / el);
    process.stdout.write(`\r  ${done_}/${i1 - i0} frames  ${(el / done_ * 1000).toFixed(0)} ms/frame  eta ${Math.round(rest)}s   `);
  }
}
ffp.stdin.end();
await done;
const el = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${outFile}  ${(i1 - i0) / FPS}s of video in ${el}s  (${((i1 - i0) / 1 * 1000 / el).toFixed(1)} fps rendered)`);
