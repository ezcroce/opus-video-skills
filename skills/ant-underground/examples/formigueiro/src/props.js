// props.js — the cast and the furniture of the underground.
//
// Everything is drawn as pixels into the low-res buffer, in the reference
// style: a flat base colour, one or two ramp steps for the light side, a
// dark outline, and a warm rim where the lamp's light falls on it.
//
// Positions are in low-res pixels (the buffer is 180x320).

import { PAL, hash, hash2, noise1, mix, shade } from './pixel.js';

// ---------------------------------------------------------------------------
// the ant
// ---------------------------------------------------------------------------

/**
 * Draw an ant.
 *
 * The ant is ~9 px tall at buffer scale: three body segments (head, thorax,
 * gaster), six legs and two cream mandibles. It faces right unless `dir` is -1.
 *
 * @param opts { x, y, dir, walk (0..1 gait phase), scale, blade (carry a sickle) }
 */
export function ant(pix, opts) {
  const { x, y, dir = 1, walk = 0, scale = 1 } = opts;
  const blade = opts.blade ?? false;
  const s = scale;

  const px = (dx, dy, color) => {
    for (let sy = 0; sy < s; sy++)
      for (let sx = 0; sx < s; sx++)
        pix.set(x + dx * s * dir + sx, y + dy * s + sy, color);
  };

  // legs: three per side, the gait phase lifts them in a triangle
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const ph = walk * Math.PI * 2 + i * 2.1 + (side > 0 ? Math.PI : 0);
      const lift = Math.max(0, Math.sin(ph)) * 1.4;
      const fwd = (i - 1) * 2.4;
      const len = 3.2 - lift * 0.5;
      // draw the leg as a short diagonal run of pixels
      for (let k = 0; k <= len; k++) {
        const kk = k / len;
        const lx = fwd + kk * 2.2;
        const ly = 3.2 + kk * 2.6 - lift * kk;
        px(lx, ly, PAL.antDark);
        px(lx, ly + 1, PAL.antBody);
      }
    }
  }

  // gaster (rear) — the big rounded segment
  px(-5, 1, PAL.ink); px(-5, 2, PAL.ink); px(-5, 3, PAL.ink);
  px(-4, 0, PAL.ink); px(-4, 1, PAL.antBody); px(-4, 2, PAL.antLit);
  px(-4, 3, PAL.antBody); px(-4, 4, PAL.ink);
  px(-3, 0, PAL.ink); px(-3, 1, PAL.antBody); px(-3, 2, PAL.antLit);
  px(-3, 3, PAL.antBody); px(-3, 4, PAL.ink);
  px(-2, 0, PAL.ink); px(-2, 1, PAL.antBody); px(-2, 2, PAL.antLit);
  px(-2, 3, PAL.antBody); px(-2, 4, PAL.ink);
  px(-1, 0, PAL.ink); px(-1, 1, PAL.antBody); px(-1, 2, PAL.antBody);
  px(-1, 3, PAL.ink);

  // thorax (middle) — darker, so the body reads as three segments
  px(0, 1, PAL.ink); px(0, 2, PAL.ink); px(0, 3, PAL.ink);
  px(1, 0, PAL.ink); px(1, 1, PAL.antDark); px(1, 2, PAL.antLit);
  px(1, 3, PAL.antDark); px(1, 4, PAL.ink);
  px(2, 1, PAL.ink); px(2, 2, PAL.ink); px(2, 3, PAL.ink);

  // head
  px(3, 1, PAL.ink); px(3, 2, PAL.ink); px(3, 3, PAL.ink);
  px(4, 1, PAL.ink); px(4, 2, PAL.antLit); px(4, 3, PAL.ink);
  px(5, 1, PAL.ink); px(5, 2, PAL.ink); px(5, 3, PAL.ink);

  // mandibles — cream, the brightest thing on the ant
  px(6, 2, PAL.cream);
  px(6, 3, PAL.creamDim);

  // antennae
  px(5, 0, PAL.ink);
  px(6, 0, PAL.creamDim);

  if (blade) {
    // a pale sickle held in the mandibles
    for (let k = 0; k < 7; k++) {
      const kk = k / 6;
      const bx = 7 + kk * 6;
      const by = 2 - Math.sin(kk * 1.5) * 4.5;
      px(bx, Math.round(by), PAL.steelHi);
      px(bx, Math.round(by) + 1, PAL.steel);
    }
  }
}

/** the ant's little shadow puddle */
export function antShadow(pix, x, y, w = 10) {
  for (let i = -w / 2; i <= w / 2; i++) {
    const a = 1 - Math.abs(i) / (w / 2);
    if (a > 0) pix.blend(x + i, y, PAL.ink, a * 0.5);
  }
}

// ---------------------------------------------------------------------------
// the hanging lamp — the reel's single light source
// ---------------------------------------------------------------------------

/**
 * A chain descending from the top of frame to a wide dark dome, ringed with
 * amber flame and violet licks on both sides.
 */
export function lamp(pix, opts) {
  const { x, y, sway = 0, r = 16 } = opts;

  // the chain: a dark vertical run with a slight sway
  for (let cy = 0; cy < y; cy++) {
    const s = Math.sin(cy * 0.09 + sway) * 1.6;
    const cx = x + Math.round(s);
    pix.set(cx, cy, PAL.ink);
    pix.set(cx, cy + 1, '#241410');
    if (cy % 6 === 0) {                 // chain links read as small notches
      pix.set(cx - 1, cy + 1, '#241410');
      pix.set(cx + 1, cy + 1, '#241410');
    }
  }

  // the dome: a wide dark cap
  const cy = y;
  for (let j = 0; j <= 7; j++) {
    const half = Math.round(r * Math.sqrt(Math.max(0, 1 - Math.pow(j / 9, 2))));
    for (let i = -half; i <= half; i++) {
      const edge = Math.abs(i) > half - 2;
      const c = edge ? PAL.ink : (j < 3 ? '#1a0e0a' : PAL.ink);
      pix.set(x + i, cy + j, c);
    }
  }
  // the warm underside of the dome
  for (let i = -r + 3; i <= r - 3; i++) {
    const a = 1 - Math.abs(i) / (r - 2);
    pix.blend(x + i, cy + 7, PAL.amberDeep, a * 0.7);
  }

  // amber flame ring
  for (let i = -r - 1; i <= r + 1; i++) {
    const a = 1 - Math.abs(i) / (r + 1);
    if (a <= 0.02) continue;
    const f = 0.75 + hash2(i, 7) * 0.5;
    pix.add(x + i, cy + 8, PAL.amber, a * f * 0.9);
    pix.add(x + i, cy + 9, PAL.amberHi, a * a * 0.5);
  }
  // a few tongues of flame
  for (let i = -r; i <= r; i += 3) {
    const hgt = 2 + Math.round(hash2(i, 19) * 3);
    for (let j = 0; j < hgt; j++) {
      pix.add(x + i, cy + 9 + j, PAL.amberHi, 0.55 - j * 0.12);
    }
  }

  // violet licks on both sides
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const lx = x + side * (r - 1 + k * 0.7);
      const ly = cy + 7 + Math.round(Math.sin(k * 0.9) * 1.5);
      const a = 0.8 - k * 0.11;
      pix.add(Math.round(lx), ly, PAL.violet, a * 0.85);
      pix.add(Math.round(lx), ly + 1, PAL.violetHi, a * 0.4);
    }
  }

  // the spill of warm light onto the soil — a soft, wide pool that fades
  // out completely; a hard edge here reads as a rectangle
  for (let i = 0; i < 3; i++) {
    pix.softCircle(x, cy + 14, r * (1.7 + i * 1.0), PAL.amber, 0.10 / (i + 1), 2.6);
  }
}

// ---------------------------------------------------------------------------
// violet mushrooms
// ---------------------------------------------------------------------------

export function mushroom(pix, opts) {
  const { x, y, r = 6, glow = true } = opts;
  // stem
  for (let j = 0; j < 5; j++) {
    pix.set(x, y + j, '#c8bcd0');
    pix.set(x + 1, y + j, '#8a7f96');
  }
  // cap: a dark violet dome with a lit rim
  for (let j = -r; j <= 0; j++) {
    const k = 1 - Math.abs(j) / (r + 1);
    const half = Math.round(r * Math.sqrt(Math.max(0, k)));
    for (let i = -half; i <= half; i++) {
      const t = (i + half) / (2 * half || 1);
      const c = t > 0.72 ? mix(PAL.violetDeep, PAL.violet, (t - 0.72) / 0.28)
        : mix('#2a1638', PAL.violetDeep, t);
      pix.set(x + i, y + j, c);
    }
  }
  // the underside glow
  for (let i = -r; i <= r; i++) {
    const a = 1 - Math.abs(i) / (r + 1);
    if (a > 0) pix.add(x + i, y + 1, PAL.violet, a * 0.7);
  }
  if (glow) pix.softCircle(x, y - 1, r * 2.4, PAL.violet, 0.32, 2.6);
}

// ---------------------------------------------------------------------------
// roots — thin pale strands hanging from the surface line
// ---------------------------------------------------------------------------

export function roots(pix, opts) {
  const { x, y, len = 40, seed = 0, sway = 0, thickness = 1 } = opts;
  let cx = x;
  for (let j = 0; j < len; j++) {
    const drift = noise1(j * 0.14 + seed, seed) - 0.5;
    cx += drift * 1.4 + Math.sin(j * 0.07 + sway + seed) * 0.35;
    const w = j > len * 0.7 ? 0 : thickness;
    for (let i = 0; i <= w; i++) {
      const c = j % 9 === 0 ? '#6b4a32' : '#5a3d2a';
      pix.set(Math.round(cx + i), y + j, c);
    }
    // occasional side branch
    if (j > 8 && hash2(j, seed * 13) > 0.94) {
      const dir = hash2(j, seed * 7) > 0.5 ? 1 : -1;
      for (let k = 1; k <= 4; k++) {
        pix.set(Math.round(cx + dir * k), y + j + k * 0.8, '#5a3d2a');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// pebbles, embers, pebbles-with-a-spark
// ---------------------------------------------------------------------------

export function pebble(pix, x, y, r = 3) {
  for (let j = -r; j <= r; j++) {
    const half = Math.round(r * Math.sqrt(Math.max(0, 1 - (j * j) / (r * r))));
    for (let i = -half; i <= half; i++) {
      const t = (i + half) / (2 * half || 1);
      pix.set(x + i, y + j, t > 0.55 ? PAL.steelHi : (t > 0.28 ? PAL.steel : PAL.steelDark));
    }
  }
}

/** a small drifting ember — the only thing that moves in the deep soil */
export function ember(pix, x, y, seed = 0, life = 1) {
  const a = Math.sin(life * Math.PI);
  if (a <= 0) return;
  pix.add(x, y, PAL.amber, a * 0.9);
  pix.add(x, y, PAL.amberHi, a * 0.5);
  pix.softCircle(x, y, 3.2, PAL.amber, a * 0.25, 2.6);
}

// ---------------------------------------------------------------------------
// the golden ring / egg emblem from the title card
// ---------------------------------------------------------------------------

export function ringEmblem(pix, opts) {
  const { x, y, r = 14, t = 0 } = opts;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  // outer ring
  for (let a = 0; a < 360; a += 2) {
    const rad = a * Math.PI / 180;
    const px = x + Math.round(Math.cos(rad) * r);
    const py = y + Math.round(Math.sin(rad) * r);
    pix.add(px, py, PAL.amber, 0.95);
    pix.add(px, py, PAL.amberHi, 0.5 * pulse);
  }
  // inner dark disc
  for (let j = -r + 2; j <= r - 2; j++) {
    const half = Math.round(Math.sqrt(Math.max(0, (r - 2) * (r - 2) - j * j)));
    for (let i = -half; i <= half; i++) {
      pix.set(x + i, y + j, PAL.ink);
    }
  }
  // a smaller inner ring
  for (let a = 0; a < 360; a += 3) {
    const rad = a * Math.PI / 180;
    pix.add(x + Math.round(Math.cos(rad) * (r * 0.52)), y + Math.round(Math.sin(rad) * (r * 0.52)),
      PAL.amberDeep, 0.9);
  }
  // the glow
  pix.softCircle(x, y, r * 1.8, PAL.amber, 0.3 + 0.12 * pulse, 2.4);
}

// ---------------------------------------------------------------------------
// tall grass stalks (the surface scene)
// ---------------------------------------------------------------------------

export function stalks(pix, opts) {
  const { y, h = 90, seed = 0, sway = 0, count = 26, color = PAL.grassMid } = opts;
  for (let i = 0; i < count; i++) {
    const r1 = hash2(i, seed), r2 = hash2(i, seed + 99);
    const bx = Math.round(r1 * pix.w);
    const bh = h * (0.45 + r2 * 0.75);
    const lean = (hash2(i, seed + 5) - 0.5) * 10;
    const w = r2 > 0.7 ? 2 : 1;
    for (let j = 0; j < bh; j++) {
      const k = j / bh;
      const bend = lean * k * k + Math.sin(k * 3 + sway + i) * 1.2 * k;
      const c = j > bh - 3 ? PAL.grassHi : (r2 > 0.5 ? color : PAL.grassDeep);
      for (let wI = 0; wI < w; wI++) {
        pix.set(Math.round(bx + bend) + wI, y - j, c);
      }
    }
  }
}
