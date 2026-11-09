// scene.js — the underground world and the shot system.
//
// The reel's world is one place seen two ways: the surface (orange sky, green
// stalks) and the underground (dark soil, roots, the hanging lamp). A shot is
// a pure function of time that paints the whole 180x320 buffer.
//
// The contract shared with the other skills in this repo:
//   * every frame is a pure function of t — no state, no Math.random()
//   * one function per shot, registered in SCENES, looked up by name
//   * the picture and the score read the same timeline (cues.js)

import { Pix, PAL, hash, hash2, noise1, mix, shade, ease, clamp01, win } from './pixel.js';
import { ant, antShadow, lamp, mushroom, roots, pebble, ember, ringEmblem, stalks } from './props.js';

// ---------------------------------------------------------------------------
// world constants
// ---------------------------------------------------------------------------
export const WORLD = {
  w: 180,
  h: 320,
  surfaceY: 176,        // the ground line: above it is sky, below it is soil
  groundBand: 16,      // the red-brown band of the surface itself
  titleY: 78,           // where the surface band starts on the title card
};

// ---------------------------------------------------------------------------
// background layers
// ---------------------------------------------------------------------------

/**
 * The soil body below a given line.
 *
 * The reference soil is not a flat field and not a smooth gradient either: it
 * is a low-frequency organic mottle in a narrow band of the ramp, with a
 * slightly warmer crust just under the surface. Two octaves of value noise,
 * sampled on a coarse lattice and bilinearly interpolated, keeps it smooth but
 * never striped — a per-row noise would band, which is what we are avoiding.
 */
export function drawSoil(pix, t, top = WORLD.surfaceY, bottom = WORLD.h) {
  const { w } = WORLD;
  const span = Math.max(1, bottom - top);
  // A lattice of noise, bilinearly interpolated. The lattice must be small
  // enough that its cells do not read as rectangles — at 8 px they do, so
  // 4 px with a second octave on top keeps the soil organic.
  const LAT = 4;
  const lattice = (lx, ly) => hash2(lx * 7 + 0.5, ly * 13 + 0.5);
  const lattice2 = (lx, ly) => hash2(lx * 31 + 0.5, ly * 17 + 0.5);

  for (let y = top; y < bottom; y++) {
    const k = (y - top) / span;
    // The soil is warmer just under the surface and cools into the deep.
    // The exponent keeps the warm band tight, so the bottom two thirds of the
    // frame go properly dark — that depth is what makes the lamp read.
    const c = mix(PAL.soilHi, PAL.soilDeep, Math.pow(k, 0.42));
    const ly = y / LAT, ly0 = Math.floor(ly), fy = ly - ly0;
    for (let x = 0; x < w; x++) {
      const lx = x / LAT, lx0 = Math.floor(lx), fx = lx - lx0;
      const v = (lattice(lx0, ly0) * (1 - fx) + lattice(lx0 + 1, ly0) * fx) * (1 - fy)
        + (lattice(lx0, ly0 + 1) * (1 - fx) + lattice(lx0 + 1, ly0 + 1) * fx) * fy;
      // a finer octave breaks up the lattice cells
      const lx2 = x / (LAT / 2), ly2 = y / (LAT / 2);
      const v2 = hash2(Math.floor(lx2) * 7 + 0.5, Math.floor(ly2) * 13 + 0.5);
      const n = v * 0.72 + v2 * 0.28;
      const cc = mix(shade(c, -0.14), shade(c, 0.12), n);
      pix.set(x, y, cc);
    }
  }
  // a brighter crust right under the surface line — only when there IS a
  // surface above (in a full-underground shot the soil just continues)
  if (top > 0) {
    for (let y = top; y < top + 8; y++) {
      for (let x = 0; x < w; x++) {
        const a = 1 - (y - top) / 8;
        pix.blend(x, y, PAL.soilTop, a * 0.5);
      }
    }
  }
}

/** the sky above the surface line: dithered orange, brighter toward the top */
export function drawSky(pix, t, bottom = WORLD.surfaceY) {
  const { w } = WORLD;
  for (let y = 0; y < bottom; y++) {
    const k = y / bottom;
    // gradient from bright at the top to deeper orange at the horizon
    const c = mix(PAL.skyBright, PAL.skyDeep, Math.pow(k, 0.8));
    for (let x = 0; x < w; x++) {
      pix.set(x, y, c);
    }
  }
  // Dithered texture: a checkerboard between two sky tones. The reference
  // dithers more heavily toward the horizon, where the gradient is steepest,
  // and the pattern is a 4x4 Bayer matrix, so it reads as a woven texture.
  // The two dither tones are kept close together, so the pattern reads as
  // texture rather than as a grid of contrasting squares.
  const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < bottom; y++) {
    const k = y / bottom;
    const density = 0.18 + k * 0.42;
    for (let x = 0; x < w; x++) {
      const th = B[y % 4][x % 4] / 16;
      if (th < density) {
        pix.set(x, y, mix(PAL.skyBright, PAL.skyShade, 0.18 + k * 0.3));
      }
    }
  }
  // a soft sun glow near the top
  pix.softCircle(w * 0.72, bottom * 0.18, 46, PAL.skyLight, 0.30, 2.2);
}

/** the ground band and the green ridge behind it */
export function drawGround(pix, t, surfaceY = WORLD.surfaceY, groundBand = WORLD.groundBand) {
  const { w } = WORLD;
  // a dark green ridge line, wavy
  for (let x = 0; x < w; x++) {
    const hgt = 10 + Math.sin(x * 0.05) * 4 + noise1(x * 0.06, 21) * 8;
    const top = surfaceY - groundBand - hgt;
    for (let y = top; y < surfaceY - groundBand; y++) {
      const c = mix(PAL.grassDeep, PAL.grassMid, (y - top) / (hgt || 1));
      pix.set(x, y, c);
    }
  }
  // the red-brown ground band itself
  for (let y = surfaceY - groundBand; y < surfaceY; y++) {
    const k = (y - (surfaceY - groundBand)) / groundBand;
    const c = mix('#7a3a24', PAL.soilHi, k);
    for (let x = 0; x < w; x++) pix.set(x, y, c);
  }
}

/** the hard boundary between sky and soil, with a lit edge */
export function drawBoundary(pix, surfaceY = WORLD.surfaceY) {
  const { w } = WORLD;
  for (let x = 0; x < w; x++) {
    pix.set(x, surfaceY - 1, '#8a4a2c');
    pix.set(x, surfaceY, PAL.soilHi);
  }
}

// ---------------------------------------------------------------------------
// the underground set dressing (shared by the underground shots)
// ---------------------------------------------------------------------------

export function pebbles(pix, t, seed = 5, n = 16, top = WORLD.surfaceY) {
  const { w, h } = WORLD;
  for (let i = 0; i < n; i++) {
    const r1 = hash2(i, seed), r2 = hash2(i, seed + 31), r3 = hash2(i, seed + 71);
    const x = Math.round(r1 * w);
    const y = Math.round(top + 12 + r2 * (h - top - 30));
    const r = 1 + Math.round(r3 * 2.4);
    pebble(pix, x, y, r);
  }
}

export function embers(pix, t, n = 14, top = WORLD.surfaceY) {
  const { w, h } = WORLD;
  for (let i = 0; i < n; i++) {
    const r1 = hash2(i, 101), r2 = hash2(i, 211), r3 = hash2(i, 307);
    const x = Math.round(r1 * w);
    const baseY = top + 20 + r2 * (h - top - 40);
    // embers drift upward, wrapping
    const life = ((t * (0.06 + r3 * 0.05) + r3) % 1);
    const y = Math.round(baseY - life * 26);
    ember(pix, x, y, i, life);
  }
}

export function hangingRoots(pix, t, seed = 3, top = WORLD.surfaceY) {
  const { w } = WORLD;
  for (let i = 0; i < 9; i++) {
    const r1 = hash2(i, seed), r2 = hash2(i, seed + 13);
    const x = Math.round(r1 * w);
    // in a full-underground shot the roots come from off the top of frame
    const origin = top === 0 ? -30 : top;
    const len = (26 + r2 * 52) + (top === 0 ? 30 : 0);
    roots(pix, { x, y: origin, len, seed: i * 3.7, sway: t * 0.35, thickness: r2 > 0.6 ? 1 : 0 });
  }
}

// ---------------------------------------------------------------------------
// shot helpers
// ---------------------------------------------------------------------------

/** a slow push-in / pull-out applied to the whole buffer */
export function cameraZoom(pix, amount, cx = pix.w / 2, cy = pix.h / 2) {
  if (Math.abs(amount - 1) < 1e-4) return;
  const src = pix._toImage();
  const tmp = document.createElement('canvas');
  tmp.width = pix.w; tmp.height = pix.h;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(src, 0, 0);
  pix.clear(PAL.soilDeep);
  const ctx = pix._ctx;
  if (ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, pix.w, pix.h);
    ctx.translate(cx, cy);
    ctx.scale(amount, amount);
    ctx.translate(-cx, -cy);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  }
}

/** a vertical pan: shift the buffer contents */
export function cameraPan(pix, dy, dx = 0) {
  const src = pix._toImage();
  const tmp = document.createElement('canvas');
  tmp.width = pix.w; tmp.height = pix.h;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(src, 0, 0);
  const ctx = pix._ctx;
  if (!ctx) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, pix.w, pix.h);
  ctx.drawImage(tmp, Math.round(dx), Math.round(dy));
  ctx.restore();
}

/** a vignette — pulls the eye to the centre and matches the reference's dark edges */
export function vignette(pix, strength = 0.55) {
  const { w, h } = pix;
  const cx = w / 2, cy = h / 2;
  const maxd = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxd;
      if (d > 0.55) pix.blend(x, y, PAL.ink, (d - 0.55) * strength * 1.8);
    }
  }
}

/**
 * Warm ambient light falling from a point — the lamp's spill.
 *
 * The light falls DOWN, not in every direction: an omnidirectional glow
 * washes the soil above the lamp out to a flat tan, which kills the depth the
 * reference gets from its single overhead light.
 */
export function lightSpill(pix, x, y, r, color = PAL.amber, strength = 0.6) {
  const { w, h } = pix;
  // an ellipse, wide and squashed, so the pool of light has no straight edge
  const rx = r, ry = r * 0.72;
  const x0 = Math.floor(x - rx - 1), x1 = Math.ceil(x + rx + 1);
  const y0 = Math.floor(y - ry - 1), y1 = Math.ceil(y + ry + 1);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const dx = (xx - x) / rx, dy = (yy - y) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      // a smooth falloff that reaches exactly zero at the edge
      const a = Math.pow(1 - d * d, 2.4) * strength;
      if (a > 0.002) pix.add(xx, yy, color, a * 0.65);
    }
  }
}
