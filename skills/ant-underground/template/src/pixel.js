// pixel.js — the pixel-art canvas.
//
// The look of this style is "pixel art with modern lighting": the artwork is
// authored on a very low-resolution grid (default 180×320 for a 9:16 frame),
// but each pixel is not a flat square — it carries a soft gradient, the sky
// is dithered rather than banded, and light sources bloom. The finished
// buffer is then upscaled with nearest-neighbour so the pixel grid survives.
//
// Everything here is a pure function of the frame's time `t`: no state is kept
// between frames, no Math.random(). Frames are rendered in parallel and out of
// order, so anything non-deterministic would flicker.

export const W = 180;          // low-res buffer width  (9:16 -> 180x320)
export const H = 320;          // low-res buffer height
export const SCALE = 6;        // upscale factor -> 1080x1920

// ---------------------------------------------------------------------------
// palette — measured from the reference reel (see docs/reference-measurements.md)
// ---------------------------------------------------------------------------
export const PAL = {
  // soil / underground: warm brown-red, very dark
  soilDeep:  '#301008',
  soilDark:  '#301810',
  soilMid:   '#371811',
  soilMid2:  '#391913',
  soilLit:   '#441c17',
  soilLit2:  '#451d18',
  soilHi:    '#4b2318',
  soilTop:   '#612b1c',

  // sky / surface: orange
  skyBright: '#ea8d55',
  skyLight:  '#e98c54',
  skyMid:    '#dc7346',
  skyMid2:   '#db7145',
  skyShade:  '#c95c3c',
  skyDeep:   '#c85b3b',

  // vegetation
  grassDeep: '#485010',
  grassMid:  '#8aa83c',
  grassLit:  '#a8c84c',
  grassHi:   '#c4dc70',

  // accents
  amber:     '#f0a83c',
  amberHi:   '#ffe08a',
  amberDeep: '#c87a1e',
  violet:    '#b088e8',
  violetHi:  '#e0c0ff',
  violetDeep:'#6a4a9e',
  cream:     '#e8e0d0',
  creamDim:  '#b8ae9c',
  steel:     '#8a9098',
  steelHi:   '#c8d0d8',
  steelDark: '#4a5058',

  // the ant
  antBody:   '#7a2a1c',
  antDark:   '#4a1810',
  antLit:    '#a8422a',
  antGaster: '#3a120c',

  // black
  ink:       '#120a08',
  black:     '#000000',
};

// ---------------------------------------------------------------------------
// colour helpers
// ---------------------------------------------------------------------------
export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function shade(c, t) {   // t<0 darker, t>0 lighter
  const [r, g, b] = hexToRgb(c);
  return t >= 0 ? rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
                : rgbToHex(r * (1 + t), g * (1 + t), b * (1 + t));
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// stable pseudo-randomness: a hash of a key, so "noise" is identical every frame
export function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function hash2(a, b) {
  let x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// smooth noise in one dimension, for drifting soil texture and root sway
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash2(i, seed) * (1 - u) + hash2(i + 1, seed) * u;
}

// ---------------------------------------------------------------------------
// the low-res buffer
// ---------------------------------------------------------------------------
export class Pix {
  constructor(w = W, h = H) {
    this.w = w; this.h = h;
    this.buf = new Float32Array(w * h * 3);   // linear rgb, 0..255
    this.alpha = new Float32Array(w * h);
  }

  clear(color = PAL.soilDeep) {
    const [r, g, b] = hexToRgb(color);
    for (let i = 0; i < this.w * this.h; i++) {
      this.buf[i * 3] = r; this.buf[i * 3 + 1] = g; this.buf[i * 3 + 2] = b;
      this.alpha[i] = 1;
    }
  }

  idx(x, y) { return y * this.w + x; }

  set(x, y, color, a = 1) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.idx(x, y);
    const [r, g, b] = hexToRgb(color);
    const k = this.alpha[i] * (1 - a) + a;
    if (k <= 0) { this.alpha[i] = 0; return; }
    this.buf[i * 3]     = (this.buf[i * 3]     * (1 - a) + r * a) / k;
    this.buf[i * 3 + 1] = (this.buf[i * 3 + 1] * (1 - a) + g * a) / k;
    this.buf[i * 3 + 2] = (this.buf[i * 3 + 2] * (1 - a) + b * a) / k;
    this.alpha[i] = k;
  }

  get(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = this.idx(x, y);
    return [this.buf[i * 3], this.buf[i * 3 + 1], this.buf[i * 3 + 2], this.alpha[i]];
  }

  /** blend a colour over a pixel (source-over) */
  blend(x, y, color, a) {
    if (a <= 0) return;
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.idx(x, y);
    const [r, g, b] = hexToRgb(color);
    const k = this.alpha[i] * (1 - a) + a;
    this.buf[i * 3]     = (this.buf[i * 3]     * (1 - a) + r * a) / k;
    this.buf[i * 3 + 1] = (this.buf[i * 3 + 1] * (1 - a) + g * a) / k;
    this.buf[i * 3 + 2] = (this.buf[i * 3 + 2] * (1 - a) + b * a) / k;
    this.alpha[i] = k;
  }

  /** additive light — used for glows, embers, the lamp */
  add(x, y, color, amount) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || amount <= 0) return;
    const i = this.idx(x, y);
    const [r, g, b] = hexToRgb(color);
    this.buf[i * 3]     = Math.min(255, this.buf[i * 3] + r * amount);
    this.buf[i * 3 + 1] = Math.min(255, this.buf[i * 3 + 1] + g * amount);
    this.buf[i * 3 + 2] = Math.min(255, this.buf[i * 3 + 2] + b * amount);
    this.alpha[i] = 1;
  }

  /** a filled rectangle, optionally with a soft vertical gradient */
  rect(x, y, w, h, color, gradTo = null) {
    for (let j = 0; j < h; j++) {
      const t = gradTo ? (h > 1 ? j / (h - 1) : 0) : 0;
      const c = gradTo ? mix(color, gradTo, t) : color;
      for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    }
  }

  /** a soft-edged circle: the workhorse for glows and soft lights */
  softCircle(cx, cy, r, color, strength = 1, falloff = 2) {
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d >= 1) continue;
        const a = Math.pow(1 - d, falloff) * strength;
        this.add(x, y, color, a * 0.85);
      }
    }
  }

  /** vertical gradient wash over the whole buffer */
  vgrad(y0, y1, c0, c1) {
    for (let y = y0; y < y1; y++) {
      const t = (y1 - y0) > 1 ? (y - y0) / (y1 - y0 - 1) : 0;
      const c = mix(c0, c1, t);
      for (let x = 0; x < this.w; x++) this.set(x, y, c);
    }
  }

  /**
   * Ordered dither between two colours on a checkerboard.
   * This is what gives the sky its texture instead of a flat band.
   */
  dither(x, y, w, h, c0, c1, density = 0.5, size = 2) {
    const B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const t = B[(y + j) % 4][(x + i) % 4] / 16;
        const on = t < density;
        const c = on ? c1 : c0;
        this.set(x + i, y + j, c);
      }
    }
  }

  /**
   * Upscale to the output canvas with nearest-neighbour, then optionally
   * add a tiny bit of bloom so bright pixels glow into their neighbours.
   */
  toCanvas(ctx, scale = SCALE, bloom = 0) {
    const { w, h } = this;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bloom > 0) {
      // draw the buffer small, then a blurred copy underneath
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      const img = tctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        img.data[i * 4]     = this.buf[i * 3];
        img.data[i * 4 + 1] = this.buf[i * 3 + 1];
        img.data[i * 4 + 2] = this.buf[i * 3 + 2];
        img.data[i * 4 + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      ctx.filter = `blur(${bloom * SCALE}px)`;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(tmp, 0, 0, w * scale, h * scale);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this._toImage(), 0, 0, w * scale, h * scale);
    ctx.restore();
  }

  _toImage() {
    const { w, h } = this;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    const img = tctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      img.data[i * 4]     = this.buf[i * 3];
      img.data[i * 4 + 1] = this.buf[i * 3 + 1];
      img.data[i * 4 + 2] = this.buf[i * 3 + 2];
      img.data[i * 4 + 3] = Math.round(this.alpha[i] * 255);
    }
    tctx.putImageData(img, 0, 0);
    return tmp;
  }
}

// ---------------------------------------------------------------------------
// easings — expo-out is the house move: fast in, slow settle
// ---------------------------------------------------------------------------
export const ease = {
  linear: t => t,
  expoOut: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoIn:  t => t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  quadOut: t => 1 - (1 - t) * (1 - t),
  cubicOut: t => 1 - Math.pow(1 - t, 3),
  cubicInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  backOut: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  bounceOut: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

/** clamp t to 0..1 */
export const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

/** map a local time to 0..1 across a window, clamped */
export const win = (t, t0, t1) => clamp01((t - t0) / (t1 - t0 || 1));

/** smooth pulse: 0 -> 1 -> 0 across a window */
export const pulse = (t, t0, t1) => {
  const x = win(t, t0, t1);
  return Math.sin(x * Math.PI);
};
