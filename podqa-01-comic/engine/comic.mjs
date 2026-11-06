// The comic engine: flat ink, halftone screens, panels, balloons, captions, sound effects.
// Deliberately a different medium from podqa-01-video: no washes, no boiling watercolour — solid
// black line, two spot inks, newsprint paper, and a 12 fps reseed so the ink still breathes.
//
// Everything is in page coordinates. A shot decides which panel it is looking at and applies the
// transform; the panel functions only ever draw inside their own rect.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  W, H, TAU, clamp, lerp, ease, easeOut, seg, hash, seed, rng, through, ellPts, rectPts, rrPts,
  blobPts, arcPts, setBoil, withCam, BOIL,
} from '../../podqa-01-video/engine/core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = join(here, '..', 'fonts');
GlobalFonts.registerFromPath(join(fonts, 'BebasNeue-Regular.ttf'), 'Bebas');
GlobalFonts.registerFromPath(join(fonts, 'ComicNeue-Bold.ttf'), 'Letter');
GlobalFonts.registerFromPath(join(fonts, 'ComicNeue-Regular.ttf'), 'LetterText');

// Newsprint, one black, and two spots. Nothing else: a comic with three inks prints itself.
export const C = {
  paper: '#F2E9D6',
  panel: '#FCF6E7',
  ink: '#1A1512',
  spot: '#C2452C',        // warm red plate
  spot2: '#3F5B6B',       // cold blue plate, always in shadow
  spot2lite: '#7C94A0',
};
export const sentence = (t, a, b) => clamp((t - a) / (b - a));
// deterministic jitter that follows the boil (12 fps), so ink moves like hand-drawn animation
let _rs = 1;
const rnd2 = () => { _rs = (_rs * 1664525 + 1013904223) >>> 0; return _rs / 4294967296; };

// ---------------------------------------------------------------- paper ----
let paperTex = null;
export function newsprint(ctx) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  if (!paperTex) {
    const s = 420, c = createCanvas(s, s), x = c.getContext('2d');
    const r = rng('news', 0);
    for (let i = 0; i < 900; i++) {
      x.globalAlpha = .02 + r() * .05;
      x.fillStyle = r() > .5 ? '#C9BC9E' : '#FFFCF2';
      x.beginPath(); x.arc(r() * s, r() * s, .6 + r() * 2.4, 0, TAU); x.fill();
    }
    paperTex = c;
  }
  ctx.save();
  ctx.globalAlpha = .55;
  const p = ctx.createPattern(paperTex, 'repeat');
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------- halftone ----
// One dot per tile, dots on the corners so the tile is seamless. Three densities is all a comic needs.
const tiles = new Map();
function dotTile(col, size, r) {
  const k = col + size + r;
  if (tiles.has(k)) return tiles.get(k);
  const c = createCanvas(size, size), x = c.getContext('2d');
  x.fillStyle = col;
  for (const [dx, dy] of [[0, 0], [size, 0], [0, size], [size, size]]) {
    x.beginPath(); x.arc(dx, dy, r, 0, TAU); x.fill();
  }
  tiles.set(k, c);
  return c;
}
const DENS = { light: 1.5, mid: 2.4, dense: 3.4, solid: 5.0 };
export function halftone(ctx, P, o = {}) {
  const { col = C.spot2, dens = 'mid', size = 8, angle = Math.PI / 4, op = 1, close = true, clip: clipR = null } = o;
  if (P.length < 3) return;
  const tile = dotTile(col, size, DENS[dens] ?? dense);
  path(ctx, P, close); ctx.save(); ctx.clip();
  if (clipR) { ctx.beginPath(); ctx.rect(clipR.x, clipR.y, clipR.w, clipR.h); ctx.clip(); }
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
  ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.globalAlpha = op;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(-4000, -4000, 8000, 8000);
  ctx.restore();
}

// ------------------------------------------------------------------ ink ----
export function path(ctx, P, close = true) {
  ctx.beginPath();
  P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (close) ctx.closePath();
}

// Uniform-weight ink with a hand wobble. Comics do not taper: the line is a felt pen, not a brush.
export function ink(ctx, P, o = {}) {
  const { w = 5, col = C.ink, op = 1, close = false, key = 'ink' } = o;
  if (P.length < 2) return;
  seed(key + '_' + P.length, boilNow());
  const base = through(P, 3, .5);
  const pts = base.map(([x, y]) => [x + (rnd2() - .5) * w * .55, y + (rnd2() - .5) * w * .55]);
  if (close) pts.push(pts[0]);
  ctx.save();
  ctx.globalAlpha = op; ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  path(ctx, pts, false);
  ctx.stroke();
  ctx.restore();
}
let _boil = 0;
const boilNow = () => _boil;

// Straight-line ink: no spline, no overshoot. Panels, rulers, boxes and machines are drawn with this —
// through() is for organic shapes only, and a rectangle passed through it grows a pointed tip.
export function sharp(ctx, P, o = {}) {
  const { fill = C.panel, line = C.ink, w = 6, close = true, key = 'sharp', dens = null, tone = C.spot2,
    angle = Math.PI / 4, wob = .6 } = o;
  if (P.length < 3) return;
  seed(key + P.length, boilNow());
  const pts = P.map(([x, y]) => [x + (rnd2() - .5) * wob, y + (rnd2() - .5) * wob]);
  if (fill) { path(ctx, pts, close); ctx.fillStyle = fill; ctx.fill(); }
  if (dens) halftone(ctx, pts, { col: tone, dens, angle });
  if (w > 0) {
    ctx.save();
    ctx.strokeStyle = line; ctx.lineWidth = w; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    path(ctx, close ? [...pts, pts[0]] : pts, false); ctx.stroke();
    ctx.restore();
  }
}
export function box(ctx, o) {
  // note the naming: w/h are the box, lw is the line. (Passing w twice silently shrinks the box.)
  const { x, y, w, h, r = 3, lw = 6, ...rest } = o;
  const P = [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r],
    [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]];
  sharp(ctx, P, { ...rest, w: lw, key: (rest.key || 'box') });
}

// flat fill + outline: the workhorse
export function shape(ctx, P, o = {}) {
  const { fill = C.panel, line = C.ink, w = 5, dens = null, tone = C.spot2, angle = Math.PI / 4, key = 'sh' } = o;
  if (P.length < 3) return;
  path(ctx, P); ctx.fillStyle = fill; ctx.fill();
  if (dens) halftone(ctx, P, { col: tone, dens, angle });
  if (w > 0) ink(ctx, P, { w, col: line, close: true, key: key + 'i' });
}

// Text ---------------------------------------------------------------------
export function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- panels ----
// A panel is a rect with a hard black frame and a spot-colour shadow, drawn on the newsprint page.
export function panel(ctx, { x, y, w, h, shadow = 16, tone = C.spot2, tilt = 0 }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt); ctx.translate(-w / 2, -h / 2);
  // shadow: flat spot plate, offset, no blur — printed, not dropped
  ctx.fillStyle = tone; ctx.globalAlpha = .55;
  ctx.fillRect(shadow, shadow, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
export function panelFrame(ctx, { x, y, w, h, shadow = 16, tone = C.spot2, tilt = 0, lw = 7 }) {
  panel(ctx, { x, y, w, h, shadow, tone, tilt });
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt); ctx.translate(-w / 2, -h / 2);
  path(ctx, rectPts(0, 0, w, h, 1.2));
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.stroke();
  ctx.restore();
}
export function panelClip(ctx, { x, y, w, h, tilt = 0 }) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt); ctx.translate(-w / 2, -h / 2);
  path(ctx, rectPts(0, 0, w, h, 1.2)); ctx.clip();
  ctx.translate(-x, -y);              // back to page coordinates, now clipped
}
export function panelInset(ctx, { x, y, w, h, tilt = 0 }) {
  ctx.translate(-x, -y);
  ctx.restore();
}

// -------------------------------------------------------------- balloons ----
export function balloon(ctx, o) {
  const {
    x, y, w, h, text = '', size = 34, tail = null, p = 1, font = 'Letter',
    fill = C.panel, inkW = 5, col = C.ink, key = 'bal',
  } = o;
  if (p <= .01) return;
  const k = easeOut(clamp(p));

  // One closed outline for balloon and tail: splice the tail's three points into the oval, so the
  // join can never leave a seam, a hollow triangle or a doubled border.
  const oval = blobPts(0, 0, 1, 9, .05, 44).map(([px, py]) => [x + w / 2 + px * w / 2, y + h / 2 + py * h / 2]);
  let P = oval;
  if (tail) {
    let bi = 0, bd = 1e9;
    oval.forEach(([px, py], i2) => {
      const d = Math.hypot(px - tail[0], py - tail[1]);
      if (d < bd) { bd = d; bi = i2; }
    });
    const a = oval[bi], b = oval[(bi + 1) % oval.length];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dir = [mid[0] - (x + w / 2), mid[1] - (y + h / 2)];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    const nrm = [-dir[1] / len, dir[0] / len];
    const spread = Math.min(w, h) * .16;
    const b1 = [mid[0] + nrm[0] * spread, mid[1] + nrm[1] * spread];
    const b2 = [mid[0] - nrm[0] * spread, mid[1] - nrm[1] * spread];
    P = [...oval.slice(0, bi + 1), b1, tail, b2, ...oval.slice(bi + 1)];
  }

  ctx.save();
  ctx.globalAlpha = clamp(p * 2);
  path(ctx, P);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = inkW; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();

  if (!text) return;
  ctx.save();
  ctx.fillStyle = col;
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = wrap(ctx, text, w - size * 1.1);
  const lh = size * 1.12;
  let ty = y + h / 2 - (lines.length - 1) * lh / 2;
  for (const line of lines) { ctx.fillText(line, x + w / 2, ty); ty += lh; }
  ctx.restore();
}

export function caption(ctx, o) {
  const { x, y, w, text = '', size = 30, p = 1, fill = C.spot, col = C.panel, h = null } = o;
  if (p <= .01) return;
  ctx.save();
  ctx.font = `${size}px Letter`;
  const lines = wrap(ctx, text, w - size * 1.3);
  const hh = h ?? (lines.length * size * 1.2 + size * .8);
  const k = easeOut(clamp(p * 2));
  ctx.globalAlpha = k;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, hh);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, hh);
  ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let ty = y + hh / 2 - (lines.length - 1) * size * .6;
  for (const line of lines) { ctx.fillText(line, x + size * .62, ty); ty += size * 1.2; }
  ctx.restore();
}

// Sound effect: chunky outline, offset shadow, slight rotation, jittering 12 fps.
export function sfx(ctx, o) {
  const {
    text, x, y, size = 150, rot = -.06, p = 1, fill = C.spot, shadow = C.ink,
    jitter = 3, key = 'sfx',
  } = o;
  if (p <= .01) return;
  const k = easeOut(clamp(p * 1.6));
  const j = () => (hash(hash(boilNow() * 7.7 + key.length) + Math.random()) - .5) * jitter;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(.7 + .3 * k + (1 - k) * .12, .7 + .3 * k + (1 - k) * .12);
  ctx.font = `${size}px Bebas`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = shadow; ctx.globalAlpha = .55;
  ctx.fillText(text, size * .045, size * .07);
  ctx.globalAlpha = 1;
  ctx.lineWidth = size * .10; ctx.strokeStyle = C.ink;
  ctx.strokeText(text, j(), j());
  ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  ctx.restore();
}

// -------------------------------------------------------------- effects ----
export function speedLines(ctx, o) {
  const { x, y, w, h, n = 26, col = C.ink, op = .8, ang = -.35, len = 1 } = o;
  const r = rng('spd' + n, 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = op; ctx.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    const yy = (r() - .5) * h, l = (40 + r() * 220) * len, x0 = r() * w;
    ctx.lineWidth = 1.6 + r() * 3.4;
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + l, yy); ctx.stroke();
  }
  ctx.restore();
}
export function impact(ctx, o) {
  const { x, y, r = 120, spikes = 14, p = 1 } = o;
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * TAU, rr = i % 2 ? r : r * (1.5 + .22 * Math.sin(i * 2.1));
    pts.push([x + Math.cos(a) * rr * (.6 + .4 * p), y + Math.sin(a) * rr * (.6 + .4 * p)]);
  }
  shape(ctx, pts, { fill: C.spot, line: C.ink, w: 6, dens: null });
}
export function dots(ctx, { x, y, w, h, n = 40, col = C.ink, size = 3, key = 'dots' }) {
  const r = rng(key, 0);
  ctx.save(); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = .25 + r() * .6;
    ctx.beginPath(); ctx.arc(x + r() * w, y + r() * h, size * (.4 + r()), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// --------------------------------------------------------------- camera ----
export function camFor(p, zoom = 1) {
  // the panel fills the frame with a thin newsprint margin: the page is always visible around it
  return { cx: p.x + p.w / 2, cy: p.y + p.h / 2, zoom: Math.min(W * .88 / p.w, H * .88 / p.h) * zoom };
}
export function setBoilFrame(i) { _boil = Math.floor(i / BOIL); }

export { W, H, TAU, clamp, lerp, ease, easeOut, seg, hash, seed, rng, through, ellPts, rectPts, rrPts, blobPts, arcPts, withCam };
