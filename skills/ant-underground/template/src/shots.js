// shots.js — the shots of the reel, one function per shot.
//
// Each shot paints the whole buffer from a time `t` (seconds since the reel
// started). Shots are registered in SCENES and looked up by name from the
// timeline in cues.js. Pure functions only: no state, no Math.random().
//
// The reel as reconstructed from the reference frames:
//   1. title      "ESTE FORMIGUEIRO / FORMIGAS" with the golden ring emblem
//   2. ambition   "QUER SER / VIRA FORMIGA" — the lamp above, two violet
//                 mushrooms flanking the frame
//   3. pursuit    "QUEM SEGUE / DO GÉU" — the lamp closer, the ant below
//   4. the dig    "DO GÉU / ELA CAVOU" — the surface, green stalks, the ant
//                 digging with a pale blade
//   5. title      the closing card

import { Pix, PAL, hash, hash2, noise1, mix, shade, ease, clamp01, win } from './pixel.js';
import { ant, antShadow, lamp, mushroom, roots, pebble, ember, ringEmblem, stalks } from './props.js';
import { caption } from './font.js';
import {
  WORLD, drawSoil, drawSky, drawGround, drawBoundary,
  pebbles, embers, hangingRoots, vignette, lightSpill,
} from './scene.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** where the caption block sits — the lower band of the frame */
const CAP_Y = 248;

/** the underground base: soil, roots, pebbles, embers */
function underground(pix, t, opts = {}) {
  // the soil fills the WHOLE frame — an underground shot has no sky, and a
  // seam where the surface band would be reads as a mistake
  drawSoil(pix, t, 0, WORLD.h);
  hangingRoots(pix, t, opts.rootSeed ?? 3, 0);
  pebbles(pix, t, opts.pebbleSeed ?? 5, opts.pebbles ?? 16, 0);
  embers(pix, t, opts.embers ?? 14, 0);
}

/** the surface base: sky, ridge, ground band */
function surface(pix, t, opts = {}) {
  drawSky(pix, t);
  drawGround(pix, t);
  stalks(pix, { y: WORLD.surfaceY - WORLD.groundBand, h: opts.h ?? 96, seed: 4, sway: t * 0.4, count: opts.count ?? 24 });
}

/**
 * A caption that rises into place, holds, and then fades out again.
 *
 * The window is [t0, t1]: it fades in over the first 0.28 s, holds, and fades
 * out over the last 0.3 s. A caption must actually leave the screen —
 * otherwise the previous shot's words sit on top of the next shot's.
 */
function fadeCaption(pix, text, y, t, t0, t1, colors, scale = 2) {
  if (t < t0 || t > t1) return;
  const IN = 0.28, OUT = 0.3;
  const a = Math.min(
    ease.expoOut(clamp01((t - t0) / IN)),
    ease.quadOut(clamp01((t1 - t) / OUT)),
  );
  if (a <= 0.001) return;
  const k = ease.expoOut(clamp01((t - t0) / IN));
  const rise = Math.round((1 - k) * 3);

  // draw the caption into a scratch buffer so it can be alpha-blended
  const tmp = new Pix(pix.w, pix.h);
  caption(tmp, text, y + rise, { colors, scale });
  for (let yy = 0; yy < pix.h; yy++) {
    for (let xx = 0; xx < pix.w; xx++) {
      const i = tmp.idx(xx, yy);
      if (tmp.alpha[i] <= 0) continue;
      // recover the source colour from the scratch buffer
      const c = [tmp.buf[i * 3], tmp.buf[i * 3 + 1], tmp.buf[i * 3 + 2]];
      const hex = `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      pix.blend(xx, yy, hex, a);
    }
  }
}

// ---------------------------------------------------------------------------
// shots
// ---------------------------------------------------------------------------

/**
 * 1 — the title card.
 * The surface sits in the top quarter, the underground fills the rest, and a
 * golden ring emblem hangs between the two lines of the title.
 */
function shotTitle(pix, t, c) {
  const t0 = c.t0;
  const TY = WORLD.titleY;      // where the surface band ends and the soil starts

  // the top band shows the surface, the rest is underground
  drawSky(pix, t, TY);
  drawGround(pix, t, TY, 12);
  drawSoil(pix, t, TY, WORLD.h);
  drawBoundary(pix, TY);

  hangingRoots(pix, t, 3, TY);
  pebbles(pix, t, 5, 10, TY);
  embers(pix, t, 12, TY);

  // the emblem, in the soil between the two title lines
  ringEmblem(pix, { x: 90, y: TY + 52, r: 15, t: t });

  // the two title lines, above and below the emblem
  fadeCaption(pix, 'ESTE FORMIGUEIRO', TY - 52, t, t0 + 0.1, t0 + 2.2, [PAL.cream]);
  fadeCaption(pix, 'FORMIGAS', TY + 88, t, t0 + 1.4, t0 + 3.6, [PAL.cream]);

  vignette(pix, 0.6);
}

// ---------------------------------------------------------------------------
/**
 * 2 — "QUER SER / VIRA FORMIGA".
 * The lamp hangs above and throws the only light in the frame; two violet
 * mushrooms sit in the dark on either side.
 */
function shotAmbition(pix, t, c) {
  const t0 = c.t0;
  underground(pix, t, { rootSeed: 3, pebbleSeed: 5, pebbles: 14, embers: 12 });

  const sway = Math.sin(t * 0.8) * 0.9;
  lamp(pix, { x: 90, y: 78, sway, r: 17 });
  lightSpill(pix, 90, 96, 70, PAL.amber, 0.30);

  // two violet mushrooms in the dark, one left one right
  mushroom(pix, { x: 24, y: 150, r: 7 });
  mushroom(pix, { x: 156, y: 206, r: 6 });

  // the ant stands in the light, small and alone
  const ak = ease.expoOut(win(t, t0 + 0.2, t0 + 0.7));
  if (ak > 0) {
    const ax = Math.round(90 + (1 - ak) * -10);
    const ay = 176;
    antShadow(pix, ax, ay + 10, 20);
    ant(pix, { x: ax, y: ay, walk: t * 2, scale: 2 });
  }

  // the captions sit low, clear of the lamp
  fadeCaption(pix, 'QUER SER', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'VIRA FORMIGA', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.62);
}

// ---------------------------------------------------------------------------
/**
 * 3 — "QUEM SEGUE / DO GÉU".
 * The lamp is bigger and lower — the ant is directly under it, in the light.
 */
function shotPursuit(pix, t, c) {
  const t0 = c.t0;
  underground(pix, t, { rootSeed: 9, pebbleSeed: 12, pebbles: 18, embers: 16 });

  const sway = Math.sin(t * 0.9 + 1) * 1.1;
  lamp(pix, { x: 90, y: 70, sway, r: 20 });
  lightSpill(pix, 90, 90, 76, PAL.amber, 0.34);

  // the ant below the lamp
  const ax = 90;
  const ay = 184;
  antShadow(pix, ax, ay + 10, 20);
  ant(pix, { x: ax, y: ay, walk: t * 3, scale: 2 });

  fadeCaption(pix, 'QUEM SEGUE', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'DO GÉU', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.6);
}

// ---------------------------------------------------------------------------
/**
 * 4 — "DO GÉU / ELA CAVOU".
 * The surface: orange sky, green stalks, the ant digging with a pale blade.
 * The lower half is underground, where the caption sits.
 */
function shotDig(pix, t, c) {
  const t0 = c.t0;
  drawSky(pix, t);
  drawGround(pix, t);
  stalks(pix, { y: WORLD.surfaceY - WORLD.groundBand, h: 104, seed: 12, sway: t * 0.5, count: 22 });
  drawSoil(pix, t, WORLD.surfaceY, WORLD.h);
  drawBoundary(pix);

  // the ant digs at the boundary
  const ax = 86;
  const ay = WORLD.surfaceY - 18;
  antShadow(pix, ax, ay + 10, 20);
  ant(pix, { x: ax, y: ay, walk: t * 4, scale: 2, blade: true });

  // disturbed soil piling up beside the hole
  for (let i = 0; i < 22; i++) {
    const r1 = hash2(i, 71), r2 = hash2(i, 91);
    const x = Math.round(96 + r1 * 26);
    const y = Math.round(WORLD.surfaceY - 2 - r2 * 8);
    pix.set(x, y, r2 > 0.5 ? PAL.soilHi : PAL.soilLit);
    pix.set(x, y + 1, PAL.soilMid);
  }

  hangingRoots(pix, t, 6);
  pebbles(pix, t, 8, 8);
  embers(pix, t, 8);

  fadeCaption(pix, 'DO GÉU', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'ELA CAVOU', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.5);
}

// ---------------------------------------------------------------------------
/**
 * 5 — the closing card, same as the opening but with the emblem pulsing out.
 */
function shotOutro(pix, t, c) {
  const t0 = c.t0, dur = c.dur;
  const fade = win(t, t0 + dur - 0.6, t0 + dur);
  const TY = WORLD.titleY;

  drawSky(pix, t, TY);
  drawGround(pix, t, TY, 12);
  drawSoil(pix, t, TY, WORLD.h);
  drawBoundary(pix, TY);

  hangingRoots(pix, t, 3, TY);
  pebbles(pix, t, 5, 10, TY);
  embers(pix, t, 12, TY);

  // the emblem shrinks away
  const ek = ease.expoOut(win(t, t0, t0 + 0.5));
  ringEmblem(pix, { x: 90, y: TY + 46, r: Math.max(1, Math.round(14 * ek)), t: t });

  fadeCaption(pix, 'ESTE FORMIGUEIRO', TY - 52, t, t0 + 0.1, t0 + 2.2, [PAL.cream]);
  fadeCaption(pix, 'FORMIGAS', TY + 88, t, t0 + 1.4, t0 + 3.6, [PAL.cream]);

  vignette(pix, 0.6);

  // fade the whole frame to black at the very end
  if (fade > 0) {
    for (let y = 0; y < pix.h; y++)
      for (let x = 0; x < pix.w; x++)
        pix.blend(x, y, PAL.black, fade);
  }
}

// ---------------------------------------------------------------------------
// the registry
// ---------------------------------------------------------------------------
export const SCENES = {
  title:     { fn: shotTitle,     dur: 4.0 },
  ambition:  { fn: shotAmbition,  dur: 5.0 },
  pursuit:   { fn: shotPursuit,   dur: 5.0 },
  dig:       { fn: shotDig,       dur: 5.0 },
  outro:     { fn: shotOutro,     dur: 4.0 },
};

/**
 * Paint a frame.
 *
 * @param pix   the low-res buffer
 * @param t     time in seconds since the reel started
 * @param cues  the timeline (see cues.js): { S: [...], dur }
 */
export function renderFrame(pix, t, cues) {
  const shots = cues.S;
  // find the shot that owns this time
  let cur = shots[0], idx = 0;
  for (let i = 0; i < shots.length; i++) {
    if (t >= shots[i].t) { cur = shots[i]; idx = i; }
  }
  const next = shots[idx + 1];
  const end = next ? next.t : cues.dur;
  const local = t - cur.t;
  const dur = end - cur.t;

  const scene = SCENES[cur.name];
  // Every frame starts from a cleared buffer. Without this, each shot is
  // painted over the previous one and the reel turns into a smear.
  pix.clear(PAL.soilDeep);
  if (!scene) return;
  scene.fn(pix, t, { t0: cur.t, dur, local });
}
