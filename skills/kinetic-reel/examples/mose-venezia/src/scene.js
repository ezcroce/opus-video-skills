// scene.js — the picture. draw(ctx, t, W, H, env) paints every frame as a pure function of t.
// Style: 2D type canvas in the kinetic-reel idiom — condensed display type, HUD micro-type, one gold ground slam,
// procedural diagrams. Palette is Venice: ink, cream, gate-gold, lagoon teal, brick red.
import { FACTS } from './cues.js';

const K = {
  ink: '#0B0D0C', ink2: '#12171A', ink3: '#1B2226',
  cream: '#F1EEE6', cream2: '#E4DED0',
  gold: '#F5C518', goldDim: '#8A6E14',
  acqua: '#4E9E96', acquaDim: '#24403E',
  brick: '#B23A28', coral: '#E8643C',
  grey: '#8B908A', mid: '#5E625D',
};
const F = { cond: 'BarlowCond', wide: 'ArchivoBlack', mono: 'JetBrainsMono', serif: 'InstrumentSerif' };
const TAU = Math.PI * 2;

export function computeLayout(W, H) {
  return { W, H, margin: 140, right: W - 140, hudY: 1052, subY: H - 62, barH: 6 };
}

// ---- maths ----------------------------------------------------------------------------------
const clamp = v => Math.max(0, Math.min(1, v));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const outCubic = t => 1 - Math.pow(1 - t, 3);
const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// ---- primitives -----------------------------------------------------------------------------
function font(ctx, weight, size, fam) { ctx.font = `${weight} ${size}px ${fam}`; }
function text(ctx, s, x, y, { weight = 700, size = 40, fam = F.cond, color = K.cream, alpha = 1, align = 'left', spacing = 0, base = 'alphabetic' } = {}) {
  ctx.save();
  font(ctx, weight, size, fam);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textBaseline = base;
  if (spacing) {
    if (align === 'left') {
      let cx = x;
      for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
    } else if (align === 'right') {
      const idx = [...s], widths = idx.map(ch => ctx.measureText(ch).width);
      let cx = x - (widths.reduce((a, b) => a + b, 0) + spacing * (idx.length - 1));
      idx.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
    } else {
      const idx = [...s], widths = idx.map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (idx.length - 1);
      let cx = x - total / 2;
      idx.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
    }
  } else {
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  }
  ctx.restore();
}
const measure = (ctx, s, weight, size, fam, spacing = 0) => {
  ctx.save(); font(ctx, weight, size, fam);
  const w = ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1);
  ctx.restore(); return w;
};
// smallest size that fits maxW
function fit(ctx, s, weight, size, fam, maxW, spacing = 0) {
  let z = size;
  while (z > 10 && measure(ctx, s, weight, z, fam, spacing) > maxW) z -= 2;
  return z;
}
function line(ctx, x1, y1, x2, y2, { color = K.cream, alpha = 1, w = 2 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.restore();
}

// letters drop in from above with expo-out, staggered
function dropWord(ctx, s, x, y, size, t, t0, { fam = F.cond, weight = 700, color = K.cream, stagger = 0.022, fall = 0.5, spacing = 0, align = 'left' } = {}) {
  ctx.save(); font(ctx, weight, size, fam); ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  const chars = [...s], widths = chars.map(c => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((c, i) => {
    const p = outExpo(lin(t, t0 + i * stagger, t0 + i * stagger + fall));
    if (p > 0 && c !== ' ') {
      ctx.globalAlpha = p;
      ctx.fillText(c, cx, y - (1 - p) * size * 0.9);
    }
    cx += widths[i];
  });
  ctx.restore();
  return total;
}

function hud(ctx, t, env, { tl = '', tr = '', prog = 1, tlColor = K.cream, trColor = K.cream, furniture = K.cream, barBg = K.cream, barFill = K.gold } = {}) {
  const { W, margin, hudY } = env;
  const b = 34;
  ctx.save();
  ctx.strokeStyle = furniture; ctx.globalAlpha = 0.22; ctx.lineWidth = 2;
  for (const [x, y, sx, sy] of [[b, b, 1, 1], [W - b, b, -1, 1], [b, hudY - 30, 1, -1], [W - b, hudY - 30, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + 26 * sy); ctx.lineTo(x, y); ctx.lineTo(x + 26 * sx, y); ctx.stroke();
  }
  ctx.restore();
  text(ctx, tl, 58, 68, { weight: 700, size: 17, fam: F.mono, color: tlColor, alpha: 0.8, spacing: 2 });
  text(ctx, tr, W - 58, 68, { weight: 700, size: 17, fam: F.mono, color: trColor, alpha: 0.8, spacing: 2, align: 'right' });
  // progress: 7 segments
  const n = 7, gap = 8, x0 = margin, x1 = W - margin, w = (x1 - x0 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (w + gap);
    rect(ctx, x, hudY, w, env.barH, barBg, 0.18);
    const fill = clamp((prog - i / n) * n);
    if (fill > 0) rect(ctx, x, hudY, w * fill, env.barH, barFill, 0.95);
  }
}

// deterministic film grain: a pure function of t, drawn as tiny dots in a stable scatter
function grain(ctx, t, W, H, amount = 900, alpha = 0.05) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.fillStyle = '#FFFFFF';
  const f = Math.floor(t * 24);
  for (let i = 0; i < amount; i++) {
    const x = hash(i * 1.7 + f * 0.31) * W, y = hash(i * 3.1 + f * 0.77) * H;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}
function vignette(ctx, W, H, str = 0.55) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${str})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// wavy horizontal water lines below y0
function waterLines(ctx, t, { x0, x1, y0, y1, color, alpha = 0.5, count = 26, amp = 5, speed = 0.5, w = 2 }) {
  ctx.save();
  ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = w;
  for (let i = 0; i < count; i++) {
    const y = y0 + ((y1 - y0) * i) / (count - 1);
    const a = amp * (0.4 + 0.6 * (i / count));
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) {
      const yy = y + Math.sin(x * 0.011 + t * speed + i * 0.6) * a + Math.sin(x * 0.027 - t * speed * 0.7 + i) * a * 0.4;
      x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// the MOSE gate as a cross-section: a steel box, gold cap, hinge at the left end, rotated by `ang` (radians, negative = up)
function gateShape(ctx, x, y, len, h, ang, { alpha = 1, wet = false } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y); ctx.rotate(ang);
  // shadow under
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rrect(ctx, 6, 8, len, h, 6); ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, K.gold); g.addColorStop(0.35, '#C9A21A'); g.addColorStop(1, '#5B4A10');
  ctx.fillStyle = g;
  rrect(ctx, 0, 0, len, h, 5); ctx.fill();
  // rivets / ribs
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo((len * i) / 6, 4); ctx.lineTo((len * i) / 6, h - 4); ctx.stroke(); }
  ctx.restore();
}
// hinge
function hinge(ctx, x, y, r = 9) {
  ctx.save();
  ctx.fillStyle = K.cream2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = K.ink; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill();
  ctx.restore();
}

// A Venice silhouette: campanile, a dome, palazzi roofs. Simple, readable, animated by t.
function skyline(ctx, t, x0, x1, y, { color = K.ink, alpha = 1, scale = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  const w = x1 - x0, u = w / 26;
  // ground band of buildings
  ctx.fillRect(x0, y - 46 * scale, w, 200 * scale);
  // roofs
  for (let i = 0; i < 26; i++) {
    const bx = x0 + i * u, hh = (24 + hash(i * 5.3) * 46) * scale;
    ctx.fillRect(bx + 2, y - 46 * scale - hh, u - 6, hh);
  }
  // campanile
  const cx = x0 + w * 0.28;
  ctx.fillRect(cx - 16 * scale, y - 300 * scale, 32 * scale, 300 * scale);
  ctx.beginPath();
  ctx.moveTo(cx - 16 * scale, y - 300 * scale); ctx.lineTo(cx, y - 358 * scale); ctx.lineTo(cx + 16 * scale, y - 300 * scale);
  ctx.closePath(); ctx.fill();
  // dome (Salute)
  const dx = x0 + w * 0.62, dr = 54 * scale;
  ctx.beginPath(); ctx.arc(dx, y - 46 * scale, dr, Math.PI, 0); ctx.fill();
  ctx.fillRect(dx - dr, y - 46 * scale, dr * 2, 6 * scale);
  ctx.fillRect(dx - 5 * scale, y - 46 * scale - dr - 40 * scale, 10 * scale, 40 * scale);
  // a few lit windows, steady but flickering slowly
  ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = K.gold;
  for (let i = 0; i < 22; i++) {
    const wx = x0 + hash(i * 9.1) * w, wy = y - 20 * scale - hash(i * 3.7) * 90 * scale;
    const on = hash(i * 13.7 + Math.floor(t * 0.8)) > 0.35;
    if (on) ctx.fillRect(wx, wy, 4 * scale, 6 * scale);
  }
  ctx.restore();
}

// a labelled callout: dot → elbow → text
function callout(ctx, x, y, tx, ty, label, t, t0, { color = K.gold, size = 20 } = {}) {
  const p = outCubic(lin(t, t0, t0 + 0.45));
  if (p <= 0) return;
  const midx = x + (tx - x) * 0.55;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = p;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(midx, y); ctx.lineTo(midx, ty + (y - ty) * (1 - p)); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  if (p > 0.1) text(ctx, label, midx + 14, ty + 7, { weight: 700, size, fam: F.mono, color, alpha: p, spacing: 1 });
}

// numeric roll with easing
const roll = (t, a, b, v0, v1) => Math.round(v0 + (v1 - v0) * outExpo(lin(t, a, b)));

// ---- subtitles ------------------------------------------------------------------------------
// Each line is laid out with the clip's measured duration split by character count; two lines at most on screen.
function subtitles(ctx, t, env, VO) {
  const { W, margin, subY } = env;
  for (const vo of VO) {
    if (!vo.dur || t < vo.at - 0.05 || t > vo.at + vo.dur + 0.25) continue;
    const chars = vo.sub.map(s => s.length);
    const total = chars.reduce((a, b) => a + b, 0);
    let acc = 0, active = null;
    vo.sub.forEach((s, i) => {
      const a = vo.at + (acc / total) * vo.dur, b = vo.at + ((acc + chars[i]) / total) * vo.dur;
      if (t >= a && t <= b + 0.06) active = { s, p: lin(t, a, a + 0.18) * (1 - lin(t, b, b + 0.2)) };
      acc += chars[i];
    });
    if (!active) continue;
    const size = 40, maxW = W - margin * 2 - 80;
    const z = fit(ctx, active.s, 500, size, F.cond, maxW, 1);
    const tw = measure(ctx, active.s, 500, z, F.cond, 1);
    const bh = 64, bw = Math.min(maxW + 56, tw + 72);
    ctx.save();
    ctx.globalAlpha = active.p * 0.72; ctx.fillStyle = '#000';
    rrect(ctx, (W - bw) / 2, subY - bh + 12, bw, bh, 4); ctx.fill();
    ctx.restore();
    text(ctx, active.s, W / 2, subY - 6, { weight: 500, size: z, fam: F.cond, color: K.cream, alpha: active.p, align: 'center', spacing: 1 });
  }
}

// ---- the mark: three gold bars = three inlets; used at the start and the end -------------------
function mark(ctx, x, y, s, { color = K.gold, alpha = 1, rot = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) ctx.fillRect(-s / 2 + i * s * 0.36, -s / 2 + i * s * 0.16, s * 0.2, s);
  ctx.restore();
}

// ============================================================================================
// scenes
// ============================================================================================

function sceneCold(ctx, t, env) {
  const { W, H, margin } = env;
  rect(ctx, 0, 0, W, H, K.ink);
  // water starts far below and rises: a field of lines
  const rise = inOut(lin(t, 1.4, 7.4));
  const waterTop = H + 20 - rise * 330;
  waterLines(ctx, t, { x0: 0, x1: W, y0: waterTop, y1: H + 30, color: K.acqua, alpha: 0.16 + 0.3 * rise, count: 20, amp: 4 + rise * 7, speed: 0.6 });
  rect(ctx, 0, waterTop + 6, W, H - waterTop, K.acqua, 0.05 * rise);

  const tl = 'MOSE / VENEZIA';
  const tr = '01 — L’ACQUA';
  hud(ctx, t, env, { tl, tr, prog: lin(t, 0, 8.2) * (1 / 7) });

  // the mark becomes the title
  const grow = outExpo(lin(t, 0.1, 1.1));
  mark(ctx, W / 2, 470, 74 * grow, { color: K.gold, alpha: 1 - lin(t, 0.9, 1.5) });

  // title slam
  if (t > 1.05) {
    const p = outExpo(lin(t, 1.05, 1.75));
    const size = 270 * (0.94 + 0.06 * p), ty = 540 - (1 - p) * 26;
    // one outlined echo above
    ctx.save();
    ctx.strokeStyle = K.cream; ctx.globalAlpha = 0.2 * p; ctx.lineWidth = 2;
    ctx.font = `400 ${size * 0.8}px ${F.wide}`; ctx.textAlign = 'center';
    ctx.strokeText('MOSE', W / 2, ty - size * 0.72);
    ctx.restore();
    text(ctx, 'MOSE', W / 2, ty, { weight: 400, size, fam: F.wide, color: K.cream, alpha: p, align: 'center' });
    // gold underline grows
    const uw = 620 * outExpo(lin(t, 1.5, 2.1));
    rect(ctx, W / 2 - uw / 2, ty + 44, uw, 8, K.gold, 0.95);
    const sub = 'MODULO SPERIMENTALE ELETTROMECCANICO';
    const z = fit(ctx, sub, 700, 26, F.mono, W - margin * 2, 6);
    text(ctx, sub, W / 2, ty + 112, { weight: 700, size: z, fam: F.mono, color: K.cream, alpha: 0.85 * lin(t, 1.9, 2.4), align: 'center', spacing: 6 });
  }

  // the fact: 187 cm
  if (t > 5.0) {
    const p = outExpo(lin(t, 5.0, 5.7));
    const n = roll(t, 5.0, 6.2, 60, 187);
    text(ctx, String(n), margin, 820, { weight: 400, size: 150, fam: F.cond, color: K.gold, alpha: p });
    text(ctx, 'CM  ·  MAREA DEL 12 NOV 2019', margin + measure(ctx, String(n), 400, 150, F.cond) + 28, 820,
      { weight: 700, size: 22, fam: F.mono, color: K.cream, alpha: 0.8 * p, spacing: 3 });
    text(ctx, 'la seconda più alta mai registrata a Venezia', margin, 872, { weight: 400, size: 34, fam: F.cond, color: K.cream, alpha: 0.62 * p });
  }

  vignette(ctx, W, H, 0.5);
}

function sceneStage(ctx, t, env) {
  const { W, H, margin, right } = env;
  rect(ctx, 0, 0, W, H, K.ink2);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '01 — LA SOGLIA', prog: 1 / 7 + lin(t, 8.2, 15.6) * (1 / 7) });

  const seaY = 585, bedY = 862;
  const x0 = margin, x1 = right - 130;
  // measurement grid
  ctx.save(); ctx.strokeStyle = K.cream; ctx.globalAlpha = 0.055; ctx.lineWidth = 1;
  for (let x = x0; x < x1; x += 60) { ctx.beginPath(); ctx.moveTo(x, seaY - 120); ctx.lineTo(x, bedY + 40); ctx.stroke(); }
  for (let y = seaY - 120; y < bedY + 40; y += 60) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  ctx.restore();

  // water body: the sea and the lagoon share one surface, a hairline
  waterLines(ctx, t, { x0, x1, y0: seaY + 14, y1: bedY - 6, color: K.acqua, alpha: 0.3, count: 12, amp: 4, speed: 0.5 });
  line(ctx, x0, seaY, x1, seaY, { color: K.cream, alpha: 0.55, w: 2 });
  text(ctx, 'MARE ADRIATICO', x1 - 4, seaY - 16, { weight: 700, size: 17, fam: F.mono, color: K.acqua, spacing: 4, align: 'right' });

  // seabed
  rect(ctx, x0, bedY, x1 - x0, H - bedY, K.ink3, 1);
  line(ctx, x0, bedY, x1, bedY, { color: K.cream, alpha: 0.25, w: 2 });

  // the gate, resting, then nudging up (anticipation)
  const gl = 620, gh = 34;
  const gx = x0 + 60, gy = bedY - gh - 4;
  const anticip = 0.05 * Math.sin(lin(t, 13.2, 14.2) * Math.PI) + 0.1 * Math.sin(lin(t, 14.8, 15.6) * Math.PI * 2) * lin(t, 14.8, 15.6);
  gateShape(ctx, gx, gy, gl, gh, -anticip);
  hinge(ctx, gx, gy + gh / 2, 11);
  // air pipe
  ctx.save(); ctx.strokeStyle = K.cream; ctx.globalAlpha = 0.45; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gx + 60, gy + gh); ctx.lineTo(gx + 60, bedY + 30); ctx.stroke(); ctx.restore();

  // bubbles: air arriving inside the box
  const bub = lin(t, 14.0, 15.6);
  if (bub > 0) {
    for (let i = 0; i < 26; i++) {
      const bx = gx + 30 + hash(i * 3.3) * (gl - 60);
      const by = gy + gh - 6 - ((t * 46 + i * 7) % 26);
      ctx.save(); ctx.globalAlpha = 0.55 * bub; ctx.fillStyle = K.cream;
      ctx.beginPath(); ctx.arc(bx, by, 1.6 + hash(i) * 1.8, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  // ruler on the far right: 0 at the seabed, 110 cm marked
  const rx = right - 26;
  const cmPx = (bedY - (seaY - 130)) / 300;
  ctx.save(); ctx.strokeStyle = K.cream; ctx.globalAlpha = 0.4; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rx, bedY); ctx.lineTo(rx, bedY - 300 * cmPx); ctx.stroke();
  for (let cm = 0; cm <= 300; cm += 20) {
    const y = bedY - cm * cmPx, long = cm % 100 === 0;
    ctx.globalAlpha = long ? 0.65 : 0.3;
    ctx.beginPath(); ctx.moveTo(rx - (long ? 16 : 8), y); ctx.lineTo(rx, y); ctx.stroke();
    if (long) text(ctx, `${cm}`, rx - 24, y + 6, { weight: 700, size: 15, fam: F.mono, color: K.cream, alpha: 0.65, align: 'right' });
  }
  ctx.restore();
  text(ctx, 'CM SUL LIVELLO', rx + 2, bedY - 300 * cmPx - 16, { weight: 700, size: 13, fam: F.mono, color: K.grey, alpha: 0.8, spacing: 2, align: 'right' });

  const y110 = bedY - FACTS.thresholdCm * cmPx;
  const th = outCubic(lin(t, 10.2, 11.4));
  line(ctx, gx + gl * 0.2, y110, rx - 30, y110, { color: K.gold, alpha: 0.9 * th, w: 2 });
  text(ctx, '110 CM — LA SOGLIA', gx + gl * 0.2 + 8, y110 - 12, { weight: 700, size: 18, fam: F.mono, color: K.gold, alpha: th, spacing: 3 });

  // copy
  const p = outCubic(lin(t, 8.4, 8.9));
  text(ctx, 'SEZIONE — SCHEMA, NON IN SCALA', margin, 196, { weight: 700, size: 18, fam: F.mono, color: K.grey, alpha: 0.9 * p, spacing: 4 });
  const head = 'Sul fondale, ferma.';
  const zz = fit(ctx, head, 700, 82, F.cond, right - margin - 40, 0);
  dropWord(ctx, head, margin, 292, zz, t, 8.55, { color: K.cream, stagger: 0.016 });
  text(ctx, 'un cassone d’acciaio appoggiato sul fondo, cerniere alla base', margin, 336,
    { weight: 400, size: 30, fam: F.cond, color: K.grey, alpha: outCubic(lin(t, 9.2, 9.7)) });

  callout(ctx, gx + gl * 0.62, gy + gh / 2, 0, gy - 74, 'PARATOIA · 20 M × 300 T', t, 12.2, { color: K.gold, size: 18 });
  callout(ctx, gx + 60, bedY + 30, 0, bedY + 96, 'ARIA COMPRESSA', t, 14.4, { color: K.acqua, size: 18 });
  vignette(ctx, W, H, 0.45);
}

function sceneRaise(ctx, t, env) {
  const { W, H, margin, right } = env;
  rect(ctx, 0, 0, W, H, K.ink);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '02 — IL SOLLEVAMENTO', prog: 2 / 7 + lin(t, 15.6, 31.0) * (1 / 7) });

  const seaY = 430, bedY = 800;
  const n = 18, gap = 10, gw = (right - margin - gap * (n - 1)) / n;
  const x0 = margin;
  const up = inOut(lin(t, 25.9, 29.6));
  const lagoonY = seaY + 40 * up;

  // water, sky above
  waterLines(ctx, t, { x0: 0, x1: W, y0: Math.min(seaY, lagoonY) + 10, y1: H, color: K.acqua, alpha: 0.13, count: 18, amp: 4, speed: 0.35 });
  rect(ctx, 0, Math.min(seaY, lagoonY), W, H - Math.min(seaY, lagoonY), K.acqua, 0.035);
  line(ctx, 0, seaY, W, seaY, { color: K.cream, alpha: 0.4, w: 2 });
  text(ctx, 'MARE ADRIATICO — +130 CM', W - 60, seaY - 18, { weight: 700, size: 17, fam: F.mono, color: K.acqua, alpha: 0.9, spacing: 4, align: 'right' });
  text(ctx, 'LAGUNA', 60, lagoonY + 44, { weight: 700, size: 17, fam: F.mono, color: K.acqua, alpha: 0.9, spacing: 4 });

  // seabed
  rect(ctx, 0, bedY, W, H - bedY, K.ink2, 1);
  line(ctx, 0, bedY, W, bedY, { color: K.cream, alpha: 0.22, w: 2 });
  text(ctx, 'FONDALE — 14 M A MALAMOCCO', margin, bedY + 62, { weight: 700, size: 16, fam: F.mono, color: K.grey, alpha: 0.8 * outCubic(lin(t, 16.2, 16.8)), spacing: 3 });

  // gates: each rises on its own beat, a wave from left to right
  const gh = 22, plateH = gw * 2.5;
  for (let i = 0; i < n; i++) {
    const gx = x0 + i * (gw + gap);
    const t0 = 25.9 + (i / n) * 2.4;
    const k = inOut(lin(t, t0, t0 + 1.4));
    const ang = -k * 1.03;
    gateShape(ctx, gx, bedY - gh, gw, gh, 0, { alpha: 1 - k * 0.35 });
    if (k > 0) {
      ctx.save();
      ctx.translate(gx, bedY - gh); ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, 0, -plateH);
      g.addColorStop(0, '#4A3C0C'); g.addColorStop(0.4, '#C9A21A'); g.addColorStop(1, K.gold);
      ctx.fillStyle = g;
      rrect(ctx, 0, -plateH, gw, plateH, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.42)'; ctx.lineWidth = 2;
      for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(2, -plateH * r / 4); ctx.lineTo(gw - 2, -plateH * r / 4); ctx.stroke(); }
      // foam at the waterline where the plate cuts the surface
      ctx.restore();
      hinge(ctx, gx, bedY - gh, 8);
    }
  }
  // air + spray at the waterline while rising
  if (up > 0 && up < 1) {
    ctx.save(); ctx.fillStyle = K.cream;
    for (let i = 0; i < 120; i++) {
      const px = x0 + hash(i * 4.7) * (right - margin);
      const py = seaY - hash(i * 8.1) * 70 * up - 8;
      ctx.globalAlpha = 0.4 * (1 - up) * hash(i * 2.2);
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.restore();
  }

  // copy A: the invisible object (16.0 → 21.6)
  const p1 = outCubic(lin(t, 16.0, 16.5)) * (1 - lin(t, 21.4, 22.0));
  if (p1 > 0) {
    text(ctx, 'DI SOLITO NON SI VEDE', margin, 196, { weight: 700, size: 18, fam: F.mono, color: K.gold, alpha: p1, spacing: 4 });
    dropWord(ctx, 'Settantotto cassoni.', margin, 286, 92, t, 16.1, { stagger: 0.014 });
    text(ctx, 'venti metri per trecento tonnellate, ognuno', margin, 332, { weight: 400, size: 30, fam: F.cond, color: K.grey, alpha: p1 });
    text(ctx, '78 PARATOIE  ·  4 BARRIERE  ·  3 BOCCHE', right, 196,
      { weight: 700, size: 16, fam: F.mono, color: K.cream, alpha: 0.55 * p1, spacing: 3, align: 'right' });
  }

  // copy B: the threshold gauge, from 22.0
  const gp = outCubic(lin(t, 22.0, 25.4));
  if (gp > 0) {
    const gx = right - 210, gy = 700, gh2 = 270;
    text(ctx, 'MAREA PREVISTA', right, 372, { weight: 700, size: 15, fam: F.mono, color: K.grey, alpha: 0.9, spacing: 3, align: 'right' });
    rect(ctx, gx, gy - gh2, 30, gh2, K.cream, 0.12);
    const hcm = 220 * gp;
    rect(ctx, gx, gy - gh2 * (hcm / 300), 30, gh2 * (hcm / 300), K.acqua, 0.92);
    const y110 = gy - gh2 * (110 / 300);
    line(ctx, gx - 22, y110, gx + 52, y110, { color: K.gold, alpha: 0.95, w: 3 });
    text(ctx, '110', gx - 30, y110 + 7, { weight: 700, size: 20, fam: F.mono, color: K.gold, spacing: 1, align: 'right' });
    text(ctx, `${Math.round(hcm)} CM`, gx + 15, gy + 60, { weight: 400, size: 52, fam: F.cond, color: K.cream, alpha: 0.95, align: 'center' });
    // the moment it crosses the line
    if (hcm > 110) {
      const puls = 0.6 + 0.4 * Math.sin((t - 24.2) * 12);
      text(ctx, 'SCATTA IL VIA', gx + 15, y110 - 18, { weight: 700, size: 15, fam: F.mono, color: K.gold, alpha: 0.9 * puls, spacing: 2, align: 'center' });
    }
  }

  // the 30-minute counter
  if (t > 25.9) {
    const mp = lin(t, 25.9, 29.6);
    const mins = Math.round(30 * outExpo(mp));
    text(ctx, `${String(mins).padStart(2, '0')}′`, margin, 250, { weight: 400, size: 108, fam: F.cond, color: K.gold, alpha: 0.95 });
    text(ctx, 'SOLLEVAMENTO', margin + 128, 208, { weight: 700, size: 17, fam: F.mono, color: K.cream, alpha: 0.85, spacing: 3 });
    text(ctx, '30 MINUTI IN TUTTO', margin + 128, 236, { weight: 700, size: 17, fam: F.mono, color: K.grey, spacing: 3 });
  }

  // the slam: the lagoon is closed
  if (t > 30.05) {
    const p = outExpo(lin(t, 30.05, 30.6));
    rect(ctx, 0, 0, W, H, K.gold, p);
    const s = 300 * (0.9 + 0.1 * p);
    text(ctx, 'CHIUSA.', W / 2, H / 2 + s * 0.32, { weight: 400, size: s, fam: F.wide, color: K.ink, alpha: p, align: 'center' });
    text(ctx, 'LA LAGUNA È SEPARATA DAL MARE', W / 2, H / 2 + 120, { weight: 700, size: 22, fam: F.mono, color: K.ink, alpha: 0.75 * p, align: 'center', spacing: 5 });
  }
  vignette(ctx, W, H, 0.4);
}

function sceneWait(ctx, t, env) {
  const { W, H, margin, right } = env;
  const split = W * 0.5;
  // left: the lagoon and the city, dry, on gold. right: the sea, dark and raining.
  rect(ctx, 0, 0, split, H, K.gold);
  rect(ctx, split, 0, W - split, H, K.ink);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '03 — LA CITTÀ ASCIUTTA', prog: 3 / 7 + lin(t, 31, 37.6) * (1 / 7),
    tlColor: K.ink, trColor: K.cream, furniture: K.ink });

  // the sea panel: rain and swell
  waterLines(ctx, t, { x0: split + 20, x1: W, y0: 560, y1: H, color: K.acqua, alpha: 0.5, count: 14, amp: 7, speed: 0.8 });
  ctx.save(); ctx.strokeStyle = K.cream; ctx.globalAlpha = 0.28; ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const x = split + hash(i * 2.9) * (W - split), y = ((hash(i * 7.3) * H + t * 520) % (H + 60)) - 30;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 26); ctx.stroke();
  }
  ctx.restore();
  text(ctx, 'FUORI', split + 60, 220, { weight: 700, size: 20, fam: F.mono, color: K.cream, alpha: 0.7, spacing: 5 });
  text(ctx, '+130', split + 60, 400, { weight: 400, size: 150, fam: F.cond, color: K.cream, alpha: 0.95 });
  text(ctx, 'CM', split + 60 + measure(ctx, '+130', 400, 150, F.cond) + 18, 400, { weight: 700, size: 30, fam: F.mono, color: K.acqua, alpha: 0.95, spacing: 2 });
  text(ctx, 'il mare, oltre le paratoie', split + 60, 448, { weight: 400, size: 30, fam: F.cond, color: K.grey, alpha: 0.9 });

  // the lagoon panel: the city, dry
  skyline(ctx, t, -60, split + 40, H - 150, { color: K.ink, alpha: 0.95, scale: 0.95 });
  text(ctx, 'DENTRO', margin, 220, { weight: 700, size: 20, fam: F.mono, color: K.ink, alpha: 0.7, spacing: 5 });
  text(ctx, '+70', margin, 400, { weight: 400, size: 150, fam: F.cond, color: K.ink, alpha: 0.98 });
  text(ctx, 'CM', margin + measure(ctx, '+70', 400, 150, F.cond) + 18, 400, { weight: 700, size: 30, fam: F.mono, color: K.brick, alpha: 0.95, spacing: 2 });
  text(ctx, 'la laguna, la città, asciutta', margin, 448, { weight: 400, size: 30, fam: F.cond, color: K.ink, alpha: 0.62 });

  // the wall: the gates, edge-on, gold with an ink edge, down the split
  const wy = 120, wh = H - 240;
  rect(ctx, split - 16, wy, 32, wh, K.gold, 1);
  ctx.save(); ctx.strokeStyle = K.ink; ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeRect(split - 16, wy, 32, wh); ctx.restore();
  rect(ctx, split - 6, wy, 5, wh, K.ink, 0.25);
  for (let i = 0; i < 9; i++) line(ctx, split - 16, wy + (wh / 9) * i, split + 16, wy + (wh / 9) * i, { color: K.ink, alpha: 0.5, w: 2 });
  text(ctx, 'PARATOIE IN POSIZIONE', split, wy + wh + 34, { weight: 700, size: 14, fam: F.mono, color: K.ink, alpha: 0.8, spacing: 3, align: 'center' });

  // the date, at the bottom of the gold panel
  const p = outCubic(lin(t, 31.2, 31.7));
  text(ctx, '03.10.2020 — PRIMA CHIUSURA REALE', margin, H - 190, { weight: 700, size: 18, fam: F.mono, color: K.ink, alpha: 0.72 * p, spacing: 4 });
  text(ctx, 'il giorno dopo l’acqua granda del 2019', margin, H - 158, { weight: 400, size: 26, fam: F.cond, color: K.ink, alpha: 0.55 * p });
  vignette(ctx, W, H, 0.2);
}

function sceneResult(ctx, t, env) {
  const { W, H, margin, right } = env;
  rect(ctx, 0, 0, W, H, K.cream);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '04 — I NUMERI', prog: 4 / 7 + lin(t, 37.6, 47.2) * (1 / 7),
    tlColor: K.ink, trColor: K.ink, furniture: K.ink, barBg: K.ink, barFill: K.brick });

  text(ctx, 'I NUMERI, IN SINTESI', margin, 180, { weight: 700, size: 20, fam: F.mono, color: K.mid, alpha: 0.9 * outCubic(lin(t, 37.8, 38.3)), spacing: 4 });
  dropWord(ctx, '78 paratoie. 3 bocche.', margin, 300, 120, t, 37.9, { color: K.ink, stagger: 0.014 });

  // the three counts
  const items = [
    { v: `${roll(t, 38.4, 39.6, 0, 110)} CM`, l: 'SOGLIA DI ATTIVAZIONE', s: 'oltre questa marea, il MOSE entra in funzione' },
    { v: `${roll(t, 38.8, 40.2, 0, 78)}`, l: 'PARATOIE D’ACCIAIO', s: '21 + 20 al Lido · 19 a Malamocco · 18 a Chioggia' },
    { v: `${roll(t, 39.2, 40.6, 0, 30)} MIN`, l: 'PER SOLLEVARSI', s: 'e circa 15 minuti per tornare sul fondale' },
  ];
  items.forEach((it, i) => {
    const x = margin + i * ((right - margin) / 3);
    const a = outCubic(lin(t, 38.3 + i * 0.15, 38.8 + i * 0.15));
    line(ctx, x - 20, 400, x - 20, 700, { color: K.ink, alpha: 0.15 * a, w: 2 });
    text(ctx, it.v, x, 520, { weight: 400, size: 108, fam: F.cond, color: K.ink, alpha: a });
    text(ctx, it.l, x, 562, { weight: 700, size: 17, fam: F.mono, color: K.brick, alpha: a, spacing: 3 });
    const z = fit(ctx, it.s, 400, 27, F.cond, (right - margin) / 3 - 60);
    text(ctx, it.s, x, 606, { weight: 400, size: z, fam: F.cond, color: K.mid, alpha: a });
  });

  // a wide band: the gates as a row of bars, in gold on cream
  const by = 742, bn = 78, bw = (right - margin) / bn;
  for (let i = 0; i < bn; i++) {
    const p = outExpo(lin(t, 40.2 + i * 0.012, 40.5 + i * 0.012));
    if (p <= 0) continue;
    rect(ctx, margin + i * bw, by - 90 * p, bw * 0.6, 90 * p, i % 20 === 0 ? K.brick : K.gold, 0.95);
  }
  text(ctx, '78 — UNA BARRA, UNA PARATOIA', margin, by + 32, { weight: 700, size: 16, fam: F.mono, color: K.mid, alpha: 0.9 * outCubic(lin(t, 41.6, 42.1)), spacing: 3 });

  // the limit, stated plainly
  const p2 = outCubic(lin(t, 45.0, 45.6));
  text(ctx, 'Regge maree fino a 3 metri.', margin, 848, { weight: 400, size: 44, fam: F.cond, color: K.ink, alpha: 0.9 * p2 });
  text(ctx, 'oltre, non è progettato per chiudere.', margin + 470, 848, { weight: 400, size: 44, fam: F.cond, color: K.brick, alpha: 0.85 * p2 });
  vignette(ctx, W, H, 0.1);
}

function sceneDoubts(ctx, t, env) {
  const { W, H, margin, right } = env;
  rect(ctx, 0, 0, W, H, K.ink2);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '05 — LE DOMANDE', prog: 5 / 7 + lin(t, 47.2, 55.8) * (1 / 7) });

  // 150 ticks: every time the gates went up since 2020
  const n = 150;
  text(ctx, 'SOLLEVAMENTI DAL 2020', margin, 176, { weight: 700, size: 18, fam: F.mono, color: K.gold, alpha: 0.9 * outCubic(lin(t, 47.4, 47.9)), spacing: 4 });
  for (let i = 0; i < n; i++) {
    const col = i % 25, row = Math.floor(i / 25);
    const x = margin + col * 21, y = 210 + row * 17;
    const p = outExpo(lin(t, 47.5 + i * 0.011, 47.7 + i * 0.011));
    if (p <= 0) continue;
    rect(ctx, x, y, 12, 10, i === n - 1 ? K.coral : K.gold, 0.9 * p);
  }
  text(ctx, `> ${roll(t, 47.6, 49.2, 0, 150)}`, right, 264, { weight: 400, size: 112, fam: F.cond, color: K.cream, alpha: 0.95, align: 'right' });

  // two questions, large
  dropWord(ctx, 'Quanto costa?', margin, 500, 132, t, 49.8, { color: K.cream, stagger: 0.016 });
  text(ctx, '≈ 200.000 € a sollevamento   ·   6,5 miliardi l’opera', margin, 566,
    { weight: 400, size: 34, fam: F.cond, color: K.gold, alpha: outCubic(lin(t, 50.6, 51.1)) });

  dropWord(ctx, 'E la laguna?', margin, 760, 132, t, 51.8, { color: K.cream, stagger: 0.016 });
  text(ctx, 'chiusa per ore, l’acqua resta ferma', margin, 826,
    { weight: 400, size: 34, fam: F.cond, color: K.grey, alpha: outCubic(lin(t, 52.5, 53.0)) });
  text(ctx, 'studio 2025, chiusure fino a 48 h: nessuna crisi di ossigeno — ma nutrienti e microbi cambiano',
    margin, 872, { weight: 400, size: 22, fam: F.cond, color: K.mid, alpha: outCubic(lin(t, 53.0, 53.5)) });

  // a still water strip: no tide
  waterLines(ctx, t, { x0: margin, x1: right, y0: 916, y1: 940, color: K.acqua, alpha: 0.3, count: 3, amp: 1.4, speed: 0.1 });
  text(ctx, 'NESSUNA MAREA — SCHEMA', right, 906, { weight: 700, size: 13, fam: F.mono, color: K.grey, alpha: 0.75, spacing: 3, align: 'right' });
  vignette(ctx, W, H, 0.55);
}

function sceneClose(ctx, t, env) {
  const { W, H, margin, right } = env;
  rect(ctx, 0, 0, W, H, K.ink);
  hud(ctx, t, env, { tl: 'MOSE / VENEZIA', tr: '06 — TEMPO', prog: 6 / 7 + lin(t, 55.8, 62) * (1 / 7) });

  const p = outExpo(lin(t, 56.0, 56.6));
  // the line: two halves, the second in gold
  const z = 118;
  text(ctx, 'Il MOSE non ferma l’acqua.', margin, 470, { weight: 400, size: z, fam: F.cond, color: K.cream, alpha: p });
  dropWord(ctx, 'Compra tempo.', margin, 610, z, t, 57.4, { color: K.gold, stagger: 0.024 });

  // the mark returns, with a slow underline
  mark(ctx, right - 60, 470, 68, { color: K.gold, alpha: outCubic(lin(t, 56.4, 57.0)), rot: 0 });
  const uw = (right - 60 - margin) * outExpo(lin(t, 57.8, 58.8));
  rect(ctx, margin, 690, uw, 4, K.gold, 0.55);

  // credits, small and honest
  const c = outCubic(lin(t, 58.6, 59.4));
  text(ctx, 'DATI: MINISTERO DELLE INFRASTRUTTURE E DEI TRASPORTI · COMUNE DI VENEZIA · CNR-ISMAR',
    margin, 900, { weight: 700, size: 14, fam: F.mono, color: K.grey, alpha: 0.85 * c, spacing: 2 });
  text(ctx, 'schema: sezione e numero di paratoie illustrativi, non in scala',
    margin, 926, { weight: 400, size: 14, fam: F.mono, color: K.mid, alpha: 0.85 * c, spacing: 2 });
  text(ctx, 'MOSE — MODULO SPERIMENTALE ELETTROMECCANICO', margin, 980, { weight: 700, size: 14, fam: F.mono, color: K.mid, alpha: 0.8 * c, spacing: 3 });
  // the last dot
  const d = outCubic(lin(t, 59.6, 60.6));
  ctx.save(); ctx.globalAlpha = 0.9 * d; ctx.fillStyle = K.gold;
  ctx.beginPath(); ctx.arc(W / 2, 760, 7 * d, 0, TAU); ctx.fill(); ctx.restore();
  vignette(ctx, W, H, 0.6);
}


// ---- transitions -----------------------------------------------------------------------------
// Each seam gets its own shape, chosen from what is on screen: the gate line, the wall, the page.
const SEAMS = [
  { at: 15.6, kind: 'bar', color: K.gold, dur: 0.55 },
  { at: 31.0, kind: 'split', color: K.gold, dur: 0.5 },
  { at: 37.6, kind: 'wipe', color: K.cream, dur: 0.5 },
  { at: 47.2, kind: 'slats', color: K.ink2, dur: 0.55 },
];
function transitions(ctx, t, W, H) {
  for (const s of SEAMS) {
    const a = s.at - s.dur / 2, b = s.at + s.dur / 2;
    if (t < a || t > b) continue;
    const p = (t - a) / s.dur;           // 0 → 1 across the seam
    const cover = p < 0.5 ? outCubic(p * 2) : 1 - outCubic((p - 0.5) * 2); // 0→1→0
    ctx.save();
    if (s.kind === 'bar') {
      // a bar grows from the gate baseline to cover the frame, then leaves upward
      const h = H * cover;
      const y = p < 0.5 ? 800 - h : 0;
      ctx.globalAlpha = 0.98; ctx.fillStyle = s.color;
      ctx.fillRect(0, y, W, h);
    } else if (s.kind === 'split') {
      // the wall opens outward from the middle
      const w = (W / 2 + 40) * cover;
      ctx.globalAlpha = 0.98; ctx.fillStyle = s.color;
      ctx.fillRect(W / 2 - w, 0, w * 2, H);
    } else if (s.kind === 'wipe') {
      const x = W * cover;
      ctx.globalAlpha = 0.98; ctx.fillStyle = s.color;
      ctx.fillRect(0, 0, x, H);
      // its leading edge in ink, so the wipe reads on any ground
      ctx.globalAlpha = 1; ctx.fillStyle = K.ink; ctx.fillRect(x - 6, 0, 6, H);
    } else if (s.kind === 'slats') {
      const n = 9, sw = W / n;
      ctx.globalAlpha = 0.99; ctx.fillStyle = s.color;
      for (let i = 0; i < n; i++) {
        const k = clamp(((cover - i * 0.06) / 0.5));
        ctx.fillRect(i * sw, 0, sw - 2, H * outExpo(k));
      }
    }
    ctx.restore();
  }
}

// ============================================================================================
export function draw(ctx, t, W, H, env) {
  ctx.clearRect(0, 0, W, H);
  const sc = t < S_of('stage') ? sceneCold
    : t < S_of('raise') ? sceneStage
      : t < S_of('wait') ? sceneRaise
        : t < S_of('result') ? sceneWait
          : t < S_of('doubts') ? sceneResult
            : t < S_of('close') ? sceneDoubts : sceneClose;
  sc(ctx, t, env);
  transitions(ctx, t, W, H);
  subtitles(ctx, t, env, env.VO);
  grain(ctx, t, W, H, 700, 0.035);
}
const S_of = name => importedS[name][0];
import { S as importedS } from './cues.js';
