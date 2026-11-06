// Painted-animation core, ported to a headless Skia canvas (@napi-rs/canvas).
// The p5/p5.brush engine in ../../skills/painted-animation/template needs a browser; this sandbox has no
// Chrome, so the same medium is rebuilt here: watercolour washes, boiling ink lines, flat 2D, no text.
import { createCanvas, Path2D } from '@napi-rs/canvas';

export const W = 1920, H = 1080;
export const TAU = Math.PI * 2;
export const BOIL = 12;                     // linework reseeds 12x a second, like hand-drawn animation

export const PAL = {
  paper: '#E9DFC9',
  cream: '#F5EDDC',
  ink: '#211A17',
  inkSoft: '#4B3B33',
  // a muted, pigment-led range: nothing candy, nothing pure
  ochre: '#C0914E', terracotta: '#AE5F4A', plum: '#6B4650', olive: '#6F7A4E',
  sky: '#8FA3B0', sea: '#4E6A75', rust: '#984A38', mars: '#A75B48',
  moss: '#53664A', dusk: '#232B3A', rose: '#C68C7C', sand: '#CDB894',
  lamp: '#E7BE74', steel: '#77828A', leaf: '#879669', skin: '#E3C3A6', hair: '#3B2A2A',
};

// What the voice is doing this frame. The renderer fills this from envelope.mjs before each frame;
// the cast reads it so the mouth is driven by the actual audio, not by a timer.
export const VOICE = { open: 0, spread: 0 };

// ---------------------------------------------------------------- math ----
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, x) => a + (b - a) * x;
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = x => Math.pow(clamp(x), 3);
export const backOut = x => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
export const elasticOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (TAU / 3)) + 1; };
export const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const frac = x => x - Math.floor(x);
export const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
export const kf = (t, keys, e = ease) => {          // keys = [[time, value], ...]
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, e((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
};
export const arcPt = (p0, p1, h, k) => [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];
export const spring = (t, t0, k = 6, w = 18) => t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0));
export const shake = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - .5) * 2 * amt, (hash(f * 2.3 + 9) - .5) * 2 * amt]; };

// ------------------------------------------------------------- random -----
// Deterministic per (key, boil frame): the same drawing wobbles 12 times a second, nothing more.
let _s = 1;
export const seed = (key, boil = 0) => {
  let h = 2166136261;
  for (const c of key + '|' + boil) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  _s = (h >>> 0) || 1;
};
const rnd = () => { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; };
export const rng = (key, boil = 0) => { seed(key, boil); return () => rnd(); };
export const jit = (a, boil = 0) => (rnd() * 2 - 1) * a;   // call after seed()/rng()

// ------------------------------------------------------------- shapes -----
export function ellPts(cx, cy, rx, ry, n = 26, j = 0, rot = 0) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot;
    const k = 1 + (j ? (hash(i * 3.7 + cx * .01) - .5) * 2 * j : 0);
    P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return P;
}
export function rectPts(x, y, w, h, j = 0) {
  const n = 4, P = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  return j ? P.map((p, i) => [p[0] + (hash(i * 5.1 + w) - .5) * 2 * j, p[1] + (hash(i * 7.3 + h) - .5) * 2 * j]) : P;
}
export function rrPts(x, y, w, h, r, j = 0) {
  const P = [], per = 5;
  const corner = (cx, cy, a0) => { for (let i = 0; i <= per; i++) { const a = a0 + (i / per) * (Math.PI / 2); P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return j ? P.map((p, i) => [p[0] + (hash(i * 2.9 + x) - .5) * 2 * j, p[1] + (hash(i * 4.1 + y) - .5) * 2 * j]) : P;
}
export function blobPts(cx, cy, r, lobes = 5, amp = .12, n = 30, rot = 0) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 + Math.sin(a * lobes + rot) * amp);
    P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return P;
}
export function arcPts(cx, cy, r, a0, a1, n = 14, ry = null) {
  const P = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (ry ?? r)]);
  }
  return P;
}
// Catmull-Rom resample: P into n points (df = 0 keeps the corners, 1 smoothes hard).
export function through(P, n = 6, df = .5) {
  if (P.length < 2) return P.slice();
  const out = [];
  const pts = [P[0], ...P, P[P.length - 1]];
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t * df * 2 + (2 * a - 5 * b + 4 * c - d) * t2 * df + (-a + 3 * b - 3 * c + d) * t3 * df);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
export function ribbonPts(P, w0, w1 = w0) {         // offset polyline -> closed shape (a ribbon)
  if (P.length < 2) return P.slice();
  const left = [], right = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, w = lerp(w0, w1, i / (P.length - 1)) / 2;
    left.push([P[i][0] + nx * w, P[i][1] + ny * w]);
    right.unshift([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  return [...left, ...right];
}
const shift = (P, dx, dy) => P.map(p => [p[0] + dx, p[1] + dy]);
const scaleP = (P, cx, cy, k) => P.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);

// -------------------------------------------------------------- brush -----
let BOILN = 0;
export const setBoil = (frame) => { BOILN = Math.floor(frame / BOIL); };
export const boilFrame = () => BOILN;

function pathOf(ctx, P) {
  const p = new Path2D();
  P.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
  p.closePath();
  return p;
}

// Watercolour fill: several low-alpha passes of an irregular edge, so pigment pools unevenly,
// plus a darker wet edge. Pure pigment-mixing: layers multiply naturally through alpha.
export function paint(ctx, P, o = {}) {
  if (P.length < 3) return;
  const col = o.wash ?? PAL.rose;
  const op = o.washOp ?? 1;                       // 0..1 (255-scale alpha lives inside)
  const layers = o.layers ?? 4;
  const key = o.key ?? 'w' + P[0][0].toFixed(0) + P[0][1].toFixed(0) + P.length;
  const cx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const cy = P.reduce((a, p) => a + p[1], 0) / P.length;

  ctx.save();
  seed(key, BOILN);
  for (let l = 0; l < layers; l++) {
    const k = 1 + (l - layers / 2) * .008 + (rnd() - .5) * .012;
    const dx = (rnd() - .5) * 6, dy = (rnd() - .5) * 6;
    ctx.globalAlpha = clamp((o.alpha ?? .17) * op * (0.75 + rnd() * .5));
    ctx.fillStyle = col;
    ctx.fill(pathOf(ctx, shift(scaleP(P, cx, cy, k), dx, dy)));
  }
  // granulation: pigment settling in specks inside the wash
  if (o.edge !== false) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const [x, y] of P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const area = (maxx - minx) * (maxy - miny);
    const n = Math.min(140, Math.round(area / 2600));
    for (let i = 0; i < n; i++) {
      const px = minx + rnd() * (maxx - minx), py = miny + rnd() * (maxy - miny);
      ctx.globalAlpha = clamp(.10 * op * (.4 + rnd()));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, .8 + rnd() * 2.6, 0, TAU);
      ctx.fill();
    }
  }
  // wet edge, twice: a wide soft rim and a darker inner line, so shapes have weight
  if (o.edge !== false) {
    seed(key + 'e', BOILN);
    ctx.globalAlpha = clamp((o.edgeOp ?? .16) * op);
    ctx.strokeStyle = o.edgeCol ?? darken(col, o.edgeDark ?? .45);
    ctx.lineWidth = o.edgeW ?? 12;
    ctx.lineJoin = 'round';
    ctx.stroke(pathOf(ctx, scaleP(P, cx, cy, .975)));
    ctx.globalAlpha = clamp((o.edgeOp ?? .16) * op * .8);
    ctx.lineWidth = (o.edgeW ?? 12) * .42;
    ctx.stroke(pathOf(ctx, scaleP(P, cx, cy, .955)));
  }
  // optional ink outline, always boiling
  if (o.ink) ink(ctx, P, { w: o.sw ?? 2.2, col: o.ink, close: true, key: key + 'i' });
  ctx.restore();
}

// Ink: a tapered, variable-width strip with a faint bleed pass. Boils with the rest of the linework.
export function ink(ctx, P, o = {}) {
  if (P.length < 2) return;
  const pts = through(P, o.res ?? 3, o.df ?? .5);
  const w = o.w ?? 2.2, col = o.col ?? PAL.ink;
  const key = o.key ?? 'l' + P[0][0].toFixed(0) + P[0][1].toFixed(0);
  ctx.save();
  seed(key, BOILN);
  const jittered = pts.map(([x, y]) => [x + jit(w * .35), y + jit(w * .35)]);
  const strip = ribbonPts(jittered, w, w);
  // taper the ends so strokes look laid down, not extruded
  const n = strip.length, half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const k = Math.min(1, Math.min(i, half - 1 - i) / Math.max(1, half * .18) + .25);
    for (const j of [i, n - 1 - i]) {
      strip[j] = [lerp(jittered[Math.min(i, n - 1 - i)]?.[0] ?? strip[j][0], strip[j][0], k), lerp(jittered[0][1], strip[j][1], k)];
    }
  }
  ctx.globalAlpha = o.op ?? .95;
  ctx.fillStyle = col;
  ctx.fill(pathOf(ctx, strip));
  if (o.bleed !== false) {                     // ink bleeding into the paper
    ctx.globalAlpha = .18;
    ctx.strokeStyle = col;
    ctx.lineWidth = w * 2.1;
    ctx.lineJoin = 'round';
    ctx.stroke(pathOf(ctx, through(jittered, 2)));
  }
  ctx.restore();
}

// Light is additive, never a wash: washes mix like pigment and go grey/green over blue.
export function glow(ctx, x, y, r, col = PAL.lamp, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(col, .85 * a));
  g.addColorStop(.45, hexA(col, .35 * a));
  g.addColorStop(1, hexA(col, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

export function darken(hex, k = .4) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - k) + 0x24 * k);
  const g = Math.round(((n >> 8) & 255) * (1 - k) + 0x1c * k);
  const b = Math.round((n & 255) * (1 - k) + 0x19 * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
}

// --------------------------------------------------------------- paper ----
let paperTex = null, grainTex = null;
export function makePaper(scale = 1) {
  const c = createCanvas(Math.round(W * scale), Math.round(H * scale));
  const x = c.getContext('2d');
  x.fillStyle = PAL.paper;
  x.fillRect(0, 0, c.width, c.height);
  // soft uneven warm blotches, like a wet sheet
  const r = rng('paperblot', 0);
  for (let i = 0; i < 260; i++) {
    const px = r() * c.width, py = r() * c.height, rr = (40 + r() * 260) * scale;
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    const warm = r() > .45;
    g.addColorStop(0, warm ? hexA(PAL.sand, .05 + r() * .05) : hexA('#FFFFFF', .07 + r() * .05));
    g.addColorStop(1, hexA(PAL.sand, 0));
    x.fillStyle = g;
    x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  paperTex = c;
  return c;
}

export function makeGrain(scale = 1, size = 512) {
  const c = createCanvas(size, size);
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  const r = rng('grain', 0);
  for (let i = 0; i < size * size; i++) {
    const v = 118 + Math.round((r() - .5) * 90);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 26;
  }
  x.putImageData(img, 0, 0);
  // a few fibres
  x.globalAlpha = .10;
  x.strokeStyle = '#6b5a44';
  for (let i = 0; i < 90; i++) {
    const x0 = r() * size, y0 = r() * size, len = 6 + r() * 26, a = r() * Math.PI;
    x.lineWidth = .6 + r();
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len); x.stroke();
  }
  grainTex = c;
  return c;
}

// The sheet itself: opaque, drawn first.
export function paper(ctx) {
  if (!paperTex) { makePaper(); makeGrain(); }
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(paperTex, 0, 0, W, H);
  ctx.restore();
}

// Tooth of the paper over the paint: soft-light grain that crawls on the boil, never a fill.
export function grain(ctx, t = 0, alpha = .5) {
  if (!grainTex) makeGrain();
  ctx.save();
  seed('graincrawl', BOILN);
  const ox = (rnd() - .5) * 18, oy = (rnd() - .5) * 18;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha;
  for (let y = -512; y < H + 512; y += 512) for (let x = -512; x < W + 512; x += 512) ctx.drawImage(grainTex, x + ox, y + oy);
  ctx.restore();
}

export function vignette(ctx, k = .34) {
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, hexA('#3B2A1E', k));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// -------------------------------------------------------------- camera ----
// Flat 2D only: depth is overlap, scale and colour, never a projection.
export function withCam(ctx, cam, fn) {
  const { cx = W / 2, cy = H / 2, zoom = 1, rot = 0 } = cam || {};
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (rot) ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

// --------------------------------------------------------- transitions ----
// Both are drawn on the finished scene: the shot closes into shape, the next one opens out of it.
export function clipTo(ctx, P) {
  ctx.beginPath();
  P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.clip();
}

export function irisPts(cx, cy, r, boil) {
  seed('iris', boil);
  return blobPts(cx, cy, Math.max(2, r), 7, .10, 44, rnd() * TAU);
}

// An organic paper-bleed edge: the shape's radius wobbles as it grows.
export function bleedPts(cx, cy, r, boil, amp = .16) {
  seed('bleed', boil);
  const P = [];
  const n = 54;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + Math.sin(a * 5 + rnd() * .2) * amp + (hash(i * 7.1) - .5) * amp * .6;
    P.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  return P;
}
