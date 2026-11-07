// Exodus renderer: one panel per audio window, then the encode.
//   node render.mjs --sheet=4,12,22 --cols=3 --w=560 --out=out/check/sheet.jpg
//   node render.mjs --fps=24 --out=out/film.mp4 --audio=audio/narration.m4a
import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { W, H, C, newsprint, withCam, camFor, setBoilFrame, ease, clamp, panelFrame, panelClip, panelInset } from './engine/comic.mjs';
import SHOTS from './shots/index.mjs';

const args = process.argv.slice(2);
const val = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = Number(val('fps', 24));
const DUR = Number(val('to', JSON.parse(readFileSync('timeline.json', 'utf8')).duration));

const shotAt = (t) => SHOTS.find(s => t >= s.start && t < s.end) || SHOTS[SHOTS.length - 1];

const main = createCanvas(W, H), mctx = main.getContext('2d');
const scene = createCanvas(W, H), sctx = scene.getContext('2d');

function frame(t) {
  const shot = shotAt(t);
  const beat = shot.beats[0];
  const lt = t - shot.start;
  const bp = clamp(lt / (shot.end - shot.start));

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, W, H);
  const cam = camFor(beat.panel, 1 + .05 * ease(bp));
  withCam(sctx, cam, () => {
    panelFrame(sctx, beat.panel);
    panelClip(sctx, beat.panel);
    beat.draw(sctx, lt, bp, t);
    panelInset(sctx, beat.panel);
  });

  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over';
  newsprint(mctx);
  mctx.drawImage(scene, 0, 0);
  mctx.save();
  mctx.font = '22px Bebas'; mctx.fillStyle = C.ink; mctx.globalAlpha = .16;
  mctx.fillText(shot.id.toUpperCase(), H - 210, H - 16);   // a printer's mark in the corner
  mctx.restore();
}

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
    octx.fillStyle = C.spot;
    octx.font = `${Math.round(tw * .03)}px sans-serif`;
    octx.fillText(`${t.toFixed(1)}s`, (i % cols) * tw + 8, Math.floor(i / cols) * th + th - 8);
  });
  const p = val('out', 'out/check/sheet.jpg');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, await out.encode('jpeg', 92));
  console.log(`sheet ${p}  ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}

const from = Number(val('from', 0)), to = DUR;
const outFile = val('out', 'out/film.mp4');
const audio = val('audio', 'audio/narration.m4a');
mkdirSync(dirname(outFile), { recursive: true });

const ff = ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-'];
if (audio) ff.push('-i', audio);
ff.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
if (audio) ff.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
ff.push(outFile);

const ffp = spawn(FFMPEG, ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ffp.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));

const i0 = Math.round(from * FPS), i1 = Math.round(to * FPS);
const t0 = Date.now();
for (let i = i0; i < i1; i++) {
  setBoilFrame(i);
  frame(i / FPS);
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
