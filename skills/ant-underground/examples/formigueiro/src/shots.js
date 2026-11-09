// shots.js — "A FORMIGUEIRO", the worked example.
//
// Same engine as the template, different story: a young ant climbs out of the
// anthill toward a daylight she cannot see. The motif is the ladder — she is
// always moving up in the frame, and by the last shot she is the biggest
// thing on screen.
//
// Pure functions of t: no state, no Math.random().

import { Pix, PAL, hash, hash2, noise1, mix, shade, ease, clamp01, win } from './pixel.js';
import { ant, antShadow, lamp, mushroom, roots, pebble, ember, ringEmblem, stalks } from './props.js';
import { caption } from './font.js';
import {
  WORLD, drawSoil, drawSky, drawGround, drawBoundary,
  pebbles, embers, hangingRoots, vignette, lightSpill,
} from './scene.js';

// where the caption block sits — the lower band of the frame
const CAP_Y = 248;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** the underground base: soil, roots, pebbles, embers */
function underground(pix, t, opts = {}) {
  drawSoil(pix, t, 0, WORLD.h);
  hangingRoots(pix, t, opts.rootSeed ?? 3, 0);
  pebbles(pix, t, opts.pebbleSeed ?? 5, opts.pebbles ?? 16, 0);
  embers(pix, t, opts.embers ?? 14, 0);
}

/**
 * A caption that rises into place, holds, and then fades out again.
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

  const tmp = new Pix(pix.w, pix.h);
  caption(tmp, text, y + rise, { colors, scale });
  for (let yy = 0; yy < pix.h; yy++) {
    for (let xx = 0; xx < pix.w; xx++) {
      const i = tmp.idx(xx, yy);
      if (tmp.alpha[i] <= 0) continue;
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
 * 1 — THE CLAIM. "ESTE FORMIGUEIRO / FORMIGAS"
 *
 * The surface sits in the top quarter, the anthill below, and a golden ring
 * emblem hangs between the two lines: the seal of a place with a name.
 */
function shotTitle(pix, t, c) {
  const t0 = c.t0;
  const TY = WORLD.titleY;

  drawSky(pix, t, TY);
  drawGround(pix, t, TY, 12);
  drawSoil(pix, t, TY, WORLD.h);
  drawBoundary(pix, TY);

  hangingRoots(pix, t, 3, TY);
  pebbles(pix, t, 5, 10, TY);
  embers(pix, t, 12, TY);

  ringEmblem(pix, { x: 90, y: TY + 52, r: 15, t });

  fadeCaption(pix, 'ESTE FORMIGUEIRO', TY - 52, t, t0 + 0.1, t0 + 2.2, [PAL.cream]);
  fadeCaption(pix, 'FORMIGAS', TY + 88, t, t0 + 1.4, t0 + 3.6, [PAL.cream]);

  vignette(pix, 0.6);
}

/**
 * 2 — THE WANT. "EL QUER / TRABALHAR"
 *
 * The lamp hangs high and throws the only warm light in the frame; the ant
 * stands in it, very small. The want here is a job, not a transformation —
 * the colony needs workers, which is why the comment is the reward later.
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

  // the ant is the smallest thing on screen: she is at the bottom of the pool
  const ak = ease.expoOut(win(t, t0 + 0.2, t0 + 0.7));
  if (ak > 0) {
    const ax = Math.round(90 + (1 - ak) * -10);
    const ay = 216;
    antShadow(pix, ax, ay + 10, 20);
    ant(pix, { x: ax, y: ay, walk: t * 2, scale: 2 });
  }

  fadeCaption(pix, 'EL QUER', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'TRABALHAR', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.62);
}

/**
 * 3 — THE INVITATION. "TRABALHA AQUI / QUEM COMENTA"
 *
 * "Trabalha aqui" has no subject: the viewer supplies it. The lamp is bigger
 * and lower than in shot 2 — the light is overhead, because the viewer arrives
 * from above. The ant climbs toward it over the shot.
 */
function shotPursuit(pix, t, c) {
  const t0 = c.t0;
  underground(pix, t, { rootSeed: 9, pebbleSeed: 12, pebbles: 18, embers: 16 });

  const sway = Math.sin(t * 0.9 + 1) * 1.1;
  lamp(pix, { x: 90, y: 62, sway, r: 20 });
  lightSpill(pix, 90, 82, 76, PAL.amber, 0.34);

  // she climbs: the ladder motif, a slow rise up the frame
  const climb = ease.expoOut(win(t, t0 + 0.2, t0 + 3.4));
  const ax = 90;
  const ay = Math.round(206 - climb * 62);
  antShadow(pix, ax, ay + 10, 20);
  ant(pix, { x: ax, y: ay, walk: t * 3, scale: 2 });

  fadeCaption(pix, 'TRABALHA AQUI', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'QUEM COMENTA', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.6);
}

/**
 * 4 — THE TEASE. "DEBAIXO / ELA CAVOU"
 *
 * "Debaixo" points the way the story will go: deeper. The frame cuts away
 * from the lamp to the surface — cold blue sky, tall green stalks — and she
 * digs with a pale sickle. It ends on a hole, not on a resolution.
 */
function shotDig(pix, t, c) {
  const t0 = c.t0;
  drawSky(pix, t);
  drawGround(pix, t);
  stalks(pix, { y: WORLD.surfaceY - WORLD.groundBand, h: 104, seed: 12, sway: t * 0.5, count: 22 });
  drawSoil(pix, t, WORLD.surfaceY, WORLD.h);
  drawBoundary(pix);

  // she has broken through: she stands on the line, in the open
  const ax = 84;
  const ay = WORLD.surfaceY - 22;
  antShadow(pix, ax, ay + 10, 20);
  ant(pix, { x: ax, y: ay, walk: t * 4, scale: 2, blade: true });

  // the soil she pushed up on the way
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

  fadeCaption(pix, 'DEBAIXO', CAP_Y, t, t0 + 0.1, t0 + 1.7, [PAL.cream, PAL.amber]);
  fadeCaption(pix, 'ELA CAVOU', CAP_Y + 24, t, t0 + 1.3, t0 + 4.3, [PAL.cream, PAL.amber]);

  vignette(pix, 0.5);
}

/**
 * 5 — THE CLOSER. The claim again, the emblem shrinking away, the frame
 * fading to black. It ends on the world it has established, and on the hole
 * that is still open.
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

  const ek = ease.expoOut(win(t, t0, t0 + 0.5));
  ringEmblem(pix, { x: 90, y: TY + 52, r: Math.max(1, Math.round(15 * ek)), t });

  fadeCaption(pix, 'ESTE FORMIGUEIRO', TY - 52, t, t0 + 0.1, t0 + 2.2, [PAL.cream]);
  fadeCaption(pix, 'FORMIGAS', TY + 88, t, t0 + 1.4, t0 + 3.6, [PAL.cream]);

  vignette(pix, 0.6);

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
  title:     { fn: shotTitle,    dur: 4.0 },
  ambition:  { fn: shotAmbition, dur: 5.0 },
  pursuit:   { fn: shotPursuit,  dur: 5.0 },
  dig:       { fn: shotDig,      dur: 5.0 },
  outro:     { fn: shotOutro,    dur: 4.0 },
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
