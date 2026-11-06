// poster.mjs: 3000×3000 cover art from the master waveform — no text, no image model, just the episode's own shape.
//
//   node lib/poster.mjs [--size=3000] [--out=out/cover.png] [--palette=mineral|risograph|night] [--dial=ring|bar]
//
// Two devices, both read off the audio: a chapter dial whose arc lengths are the chapter durations, and the waveform
// itself. Same episode → same poster, so a series stays coherent without a designer.
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Canvas } from './png.mjs';
import { readWav, mono } from './wav.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SIZE = +(args.size || 3000);
const OUT = args.out || 'out/cover.png';
const PALETTES = {
  mineral:   { paper: [243, 237, 226], ink: [34, 40, 44], accent: [196, 88, 60], soft: [204, 199, 186] },
  risograph: { paper: [249, 244, 233], ink: [24, 52, 84], accent: [226, 96, 54], soft: [214, 202, 184] },
  night:     { paper: [20, 24, 30], ink: [236, 230, 214], accent: [206, 214, 92], soft: [46, 54, 64] },
};
const P = PALETTES[args.palette || 'mineral'] || PALETTES.mineral;

if (!existsSync('out/master.wav')) {
  console.log('no out/master.wav yet: run node lib/build.mjs first (the poster is drawn from the finished audio)');
  process.exit(1);
}
const wav = readWav('out/master.wav');
const x = mono(wav);
const tl = existsSync('out/timeline.json') ? JSON.parse(readFileSync('out/timeline.json', 'utf8')) : null;
const duration = x.length / wav.rate;

const c = new Canvas(SIZE, SIZE, P.paper);
const S = SIZE;

// corner marks: short L-shaped ticks, the only furniture on the page
const m = Math.round(S * 0.055), len = Math.round(S * 0.035);
for (const [px, py, sx, sy] of [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]]) {
  for (let i = 0; i < len; i++) { c.px(px + i * sx, py, P.soft); c.px(px, py + i * sy, P.soft); }
}

// ---- chapter dial ---------------------------------------------------------------------------
const chapters = (tl?.chapters || []).filter(ch => typeof ch.time === 'number');
const segments = chapters.map((ch, i) => ({
  title: ch.title,
  start: ch.time,
  end: chapters[i + 1]?.time ?? duration,
}));
const cx = S / 2, cy = S * 0.375;
const dialR = S * 0.232, thickness = Math.round(S * 0.016);

function dottedRing(cx, cy, r, color, dots, alpha = 1, size = 2) {
  for (let d = 0; d < dots; d++) {
    const a = (d / dots) * Math.PI * 2;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    for (let k = 0; k < size; k++) for (let j = 0; j < size; j++) c.px(px + k, py + j, color, alpha);
  }
}
// faint measurement rings
for (const r of [0.55, 0.75, 0.92]) dottedRing(cx, cy, dialR * r, P.soft, Math.round(dialR * r * 0.9), 0.9, 2);

// the dial: each chapter is an arc; gap of 1.5° between chapters, starts at 12 o'clock
const gapDeg = 1.6;
let cursor = -90;
segments.forEach((s, i) => {
  const sweep = Math.max(3, ((s.end - s.start) / duration) * 360 - gapDeg);
  const longest = s.end - s.start === Math.max(...segments.map(q => q.end - q.start));
  const steps = Math.round(sweep * 4);
  for (let k = 0; k <= steps; k++) {
    const a = ((cursor + (sweep * k) / steps) * Math.PI) / 180;
    for (let r = 0; r <= thickness; r++) {
      c.px(cx + Math.cos(a) * (dialR + r), cy + Math.sin(a) * (dialR + r), longest ? P.accent : P.ink);
    }
  }
  // a tick pointing inward at each chapter boundary
  const ba = (cursor * Math.PI) / 180;
  for (let r = -Math.round(S * 0.022); r < 0; r++) c.px(cx + Math.cos(ba) * (dialR + r), cy + Math.sin(ba) * (dialR + r), P.ink);
  cursor += sweep + gapDeg;
});

// centre: the episode's loudness over time as a small radial profile
{
  const cols = 1400, rBase = dialR * 0.60, maxH = dialR * 0.26;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2 - Math.PI / 2;
    const t0 = Math.floor((i / cols) * x.length), t1 = Math.max(t0 + 1, Math.floor(((i + 1) / cols) * x.length));
    let rms = 0;
    for (let j = t0; j < t1; j++) rms += x[j] * x[j];
    rms = Math.sqrt(rms / (t1 - t0));
    const h = Math.max(2, Math.min(1, Math.log1p(rms * 40) / Math.log(41)) * maxH);
    for (let r = 0; r < h; r += 1) c.px(cx + Math.cos(a) * (rBase + r), cy + Math.sin(a) * (rBase + r), P.ink, 0.75);
  }
  dottedRing(cx, cy, rBase - 6, P.soft, Math.round(rBase * 1.5), 0.8, 1);
}

// ---- waveform -------------------------------------------------------------------------------
const bandY = S * 0.735, bandH = S * 0.085, inner = Math.round(S * 0.075);
const cols = S - inner * 2;
const step = x.length / cols;
for (let i = 0; i < cols; i++) {
  let lo = 0, hi = 0, rms = 0;
  const a = Math.floor(i * step), b = Math.min(x.length, Math.floor((i + 1) * step));
  for (let j = a; j < b; j++) { lo = Math.min(lo, x[j]); hi = Math.max(hi, x[j]); rms += x[j] * x[j]; }
  rms = Math.sqrt(rms / Math.max(1, b - a));
  const comp = v => Math.log1p(Math.abs(v) * 22) / Math.log(23);
  const up = comp(hi) * bandH, down = comp(lo) * bandH;
  for (let y = 0; y < up; y++) c.px(inner + i, bandY - y, P.ink, 0.9);
  for (let y = 0; y < down; y++) c.px(inner + i, bandY + y, P.ink, 0.9);
  const e = Math.min(1, Math.log1p(rms * 45) / Math.log(46)) * bandH * 0.55;
  for (let y = -e; y < e; y++) c.px(inner + i, bandY + y, P.accent, 0.95);
}
for (let i = inner; i < S - inner; i++) c.px(i, bandY, P.ink);

// chapter ticks just above the band, height by chapter length
for (const s of segments) {
  const px = Math.round(inner + (s.start / duration) * cols);
  const h = Math.round(bandH * (0.25 + 0.5 * Math.min(1, (s.end - s.start) / Math.max(1, duration / 3))));
  for (let y = 0; y < h; y++) c.px(px, bandY - bandH - 8 - y, P.accent);
  for (let y = 0; y < S * 0.008; y++) c.px(px, bandY - bandH - 8 - h - 10 - y, P.soft);
}

mkdirSync(dirname(OUT), { recursive: true });
c.save(OUT);
console.log(`${OUT}  ${SIZE}×${SIZE}  palette ${args.palette || 'mineral'}  (${(duration / 60).toFixed(1)} min, ${Math.max(segments.length, 1) + 1} chapters)`);
