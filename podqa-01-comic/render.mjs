// Comic renderer: draws one panel per beat, encodes with ffmpeg, muxes the extract's audio.
//   node render.mjs --sheet=1,6,10,15 --cols=2 --w=760 --out=out/check/sheet.jpg
//   node render.mjs --fps=24 --to=44.57 --audio=out/extract.mp3 --out=out/extract.mp4
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  W, H, C, newsprint, withCam, camFor, setBoilFrame, ease, clamp, lerp,
  panelFrame, panelClip, panelInset,
} from './engine/comic.mjs';
import SHOTS from './shots/index.mjs';

const args = process.argv.slice(2);
const val = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = Number(val('fps', 24));

const SHOT_START = SHOTS[0].start;
const shotAt = (t) => SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];
const beatAt = (shot, lt) => shot.beats.find(b => lt >= b.a && lt < b.b) || shot.beats[shot.beats.length - 1];

const main = createCanvas(W, H), mctx = main.getContext('2d');
const scene = createCanvas(W, H), sctx = scene.getContext('2d');

function frame(t) {
  const shot = shotAt(t);
  const lt = t - shot.start;
  const beat = beatAt(shot, lt);
  const bp = clamp((lt - beat.a) / (beat.b - beat.a));

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, W, H);
  const cam = camFor(beat.panel, 1 + .055 * ease(bp));      // a slow push, so a held panel still breathes
  withCam(sctx, cam, () => {
    const p = beat.panel;
    panelFrame(sctx, p);
    panelClip(sctx, p);
    beat.draw(sctx, lt - beat.a, bp, t);
    panelInset(sctx, p);
  });

  // the sheet: newsprint, then the panel over it
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over';
  newsprint(mctx);
  mctx.drawImage(scene, 0, 0);

  // page furniture: the block label, bottom left, in the plate colour
  mctx.save();
  mctx.font = '26px Bebas'; mctx.fillStyle = C.ink; mctx.globalAlpha = .45;
  mctx.fillText(`${shot.id} · ${beatIdx(shot, beat) + 1}/${shot.beats.length}`, 22, H - 18);
  mctx.restore();
}

const beatIdx = (shot, beat) => shot.beats.indexOf(beat);

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
    setBoilFrame(Math.floor(t * FPS));
    frame(t);
    octx.drawImage(main, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
    octx.fillStyle = '#C2452C';
    octx.font = `${Math.round(tw * .03)}px sans-serif`;
    octx.fillText(`${(t + SHOT_START).toFixed(1)}s`, (i % cols) * tw + 8, Math.floor(i / cols) * th + th - 8);
  });
  const p = val('out', 'out/check/sheet.jpg');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, await out.encode('jpeg', 92));
  console.log(`sheet ${p}  ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s  (${((Date.now() - t0) / times.length).toFixed(0)} ms/frame)`);
  process.exit(0);
}

// ------------------------------------------------------------ encode ------
const from = Number(val('from', 0)), to = Number(val('to', SHOTS[SHOTS.length - 1].end - SHOT_START));
const outFile = val('out', 'out/extract.mp4');
const audio = val('audio', '');
mkdirSync(dirname(outFile), { recursive: true });

const ff = ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-'];
if (audio) ff.push('-i', audio);
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart');
if (audio) ff.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
ff.push(outFile);

const ffp = spawn(FFMPEG, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ffp.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));

const i0 = Math.round(from * FPS), i1 = Math.round(to * FPS);
const t0 = Date.now();
for (let i = i0; i < i1; i++) {
  const t = i / FPS;
  setBoilFrame(i);
  frame(t + SHOT_START);
  const buf = await main.encode('jpeg', 92);
  if (!ffp.stdin.write(buf)) await new Promise(r => ffp.stdin.once('drain', r));
  if ((i - i0) % 96 === 0) {
    const el = (Date.now() - t0) / 1000, d = i - i0 + 1, rest = (i1 - i0 - d) / (d / el);
    process.stdout.write(`\r  ${d}/${i1 - i0} frames  ${(el / d * 1000).toFixed(0)} ms/frame  eta ${Math.round(rest)}s   `);
  }
}
ffp.stdin.end();
await done;
console.log(`\n${outFile}  ${((i1 - i0) / FPS).toFixed(2)}s of video in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
