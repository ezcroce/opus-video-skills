// The cast and the props. Everything is painted with paint()/ink()/glow() so it belongs to one world.
// Numbers are in "u" (one body unit), so a character can be scaled from a wide shot to a close-up
// without redrawing it.
import {
  PAL, TAU, paint, ink, glow, hexA, hash, lerp, clamp, ease, kf, wob,
  ellPts, rectPts, rrPts, blobPts, arcPts, through, ribbonPts, rng,
} from './core.mjs';

// ------------------------------------------------------------------ Vivi --
// The host: a soft cream body with an ochre scarf, ink eyes that act, arms that gesture.
// Drawn from a single scale unit so the same body reads in a wide shot and in a close-up.
export function vivi(ctx, o = {}) {
  const {
    x = 0, y = 0, u = 40, t = 0, mood = 'idle', look = 0, lean = 0,
    armL = .12, armR = .12, blink = 0, squash = 1, seedKey = 'vivi', scarf = true,
  } = o;
  const sk = seedKey;
  const lw = u / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);

  const breathe = 1 + Math.sin(t * 1.7 + .4) * .008;

  // shadow on the paper, not a drop shadow
  paint(ctx, ellPts(.15 * u, 3.0 * u, 2.25 * u, .40 * u, 22), { wash: '#5B4A36', alpha: .13, edge: false, key: sk + 'sh' });

  // feet
  for (const sx of [-1, 1]) {
    paint(ctx, ellPts(sx * 1.0 * u, 2.72 * u, .60 * u, .34 * u, 18), { wash: PAL.cream, alpha: .30, ink: PAL.ink, sw: 2.0 * lw, key: sk + 'f' + sx });
  }

  // body: an egg, a little wider at the bottom, breathing
  const body = [];
  const N = 34;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const wobble = 1 + Math.sin(a * 3 + .6) * .018 + Math.sin(t * 1.2) * .005;
    body.push([Math.cos(a) * 2.35 * u * (1 + .10 * Math.sin(a)) * wobble,
               Math.sin(a) * 2.85 * u * squash * breathe]);
  }
  paint(ctx, body, { wash: PAL.cream, alpha: .34, ink: PAL.ink, sw: 2.6 * lw, key: sk + 'b' });
  // value: a cooler wash low-right, a paper highlight upper-left (no gradients)
  paint(ctx, blobPts(1.05 * u, 1.30 * u, 1.55 * u, 5, .14, 26), { wash: PAL.sky, alpha: .12, edge: false, key: sk + 'shd' });
  paint(ctx, blobPts(-.85 * u, -1.35 * u, 1.10 * u, 4, .12, 22), { wash: PAL.paper, alpha: .16, edge: false, key: sk + 'hi' });

  // scarf: a band across the body with a tail, the one saturated shape on her
  if (scarf) {
    const fl = Math.sin(t * 1.9) * .18;
    // band around the middle, following the body's curve so it reads as worn, not pasted on
    const band = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16, a = Math.PI * (.06 + .88 * k);
      band.push([Math.cos(a) * 2.42 * u, 1.42 * u + Math.sin(k * Math.PI) * .20 * u]);
    }
    paint(ctx, ribbonPts(through(band, 3), .52 * u), { wash: PAL.ochre, alpha: .34, ink: PAL.ink, sw: 1.9 * lw, key: sk + 'sc' });
    paint(ctx, ribbonPts(through([[1.95 * u, 1.55 * u], [2.52 * u + fl * u, 2.05 * u], [2.28 * u - fl * u, 2.62 * u]], 7), .60 * u, .38 * u),
      { wash: PAL.ochre, alpha: .34, ink: PAL.ink, sw: 1.7 * lw, key: sk + 'st' });
  }

  // cheeks
  for (const sx of [-1, 1]) paint(ctx, blobPts(sx * 1.30 * u, .42 * u, .44 * u, 4, .12, 16), { wash: PAL.rose, alpha: .18, edge: false, key: sk + 'ck' + sx });

  // ---- face
  const ex = .92 * u, ey = -.62 * u;
  const eyeKind = mood === 'squint' ? 'line' : mood === 'happy' ? 'arc' : 'dot';
  for (const sx of [-1, 1]) {
    const cx = sx * ex + look * .16 * u;
    if (eyeKind === 'dot') {
      const open = 1 - clamp(blink) * .85;
      const er = (mood === 'surprise' ? 1.22 : 1) * .33 * u;
      paint(ctx, ellPts(cx, ey, er, Math.max(.05 * u, er * open), 20), { wash: PAL.ink, alpha: .92, edge: false, key: sk + 'e' + sx });
      if (open > .4) {
        paint(ctx, ellPts(cx - er * .32, ey - er * .38, er * .28, er * .24 * open, 12), { wash: PAL.cream, alpha: .85, edge: false, key: sk + 'h' + sx });
      }
      // a brow only when the mood needs one
      if (mood === 'sad') ink(ctx, [[cx - .30 * u, ey - .58 * u], [cx + .24 * u, ey - .74 * u]], { w: 2.4 * lw, key: sk + 'br' + sx });
      if (mood === 'surprise') ink(ctx, arcPts(cx, ey - .48 * u, .30 * u, Math.PI * 1.2, Math.PI * 1.8, 8), { w: 2.2 * lw, key: sk + 'br' + sx });
    } else if (eyeKind === 'arc') {
      ink(ctx, arcPts(cx, ey + .12 * u, .32 * u, Math.PI * 1.12, Math.PI * 1.88, 12), { w: 3.0 * lw, key: sk + 'ea' + sx });
    } else {
      ink(ctx, [[cx - .32 * u, ey + .04 * u], [cx + .32 * u, ey - .04 * u]], { w: 3.0 * lw, key: sk + 'el' + sx });
    }
  }

  // ---- mouth
  const my = .58 * u;
  if (mood === 'talk') {
    const open = Math.abs(wob(t, 5.4)) * .13 + .04;
    paint(ctx, ellPts(0, my, .26 * u, open * u + .07 * u, 16), { wash: PAL.rust, alpha: .55, ink: PAL.ink, sw: 1.5 * lw, key: sk + 'm' });
  } else if (mood === 'happy') {
    ink(ctx, arcPts(0, my - .12 * u, .38 * u, .3, Math.PI - .3, 12), { w: 2.8 * lw, key: sk + 'mh' });
  } else if (mood === 'surprise') {
    paint(ctx, ellPts(0, my, .17 * u, .21 * u, 14), { wash: PAL.rust, alpha: .55, ink: PAL.ink, sw: 1.5 * lw, key: sk + 'ms' });
  } else if (mood === 'sad') {
    ink(ctx, arcPts(0, my + .30 * u, .36 * u, Math.PI + .4, TAU - .4, 12), { w: 2.6 * lw, key: sk + 'md' });
  } else if (mood === 'squint') {
    ink(ctx, [[-.24 * u, my + .02 * u], [.24 * u, my - .02 * u]], { w: 2.6 * lw, key: sk + 'mq' });
  } else {
    ink(ctx, arcPts(0, my - .10 * u, .28 * u, .45, Math.PI - .45, 10), { w: 2.4 * lw, key: sk + 'mi' });
  }

  // ---- arms: angle 0 = hanging, 1.6 = out to the side, 2.6 = up
  for (const [sx, ang] of [[-1, armL], [1, armR]]) {
    const sh = [sx * 1.95 * u, .28 * u];
    const L = 1.95 * u;
    const hand = [sh[0] + sx * Math.sin(ang) * L, sh[1] + Math.cos(ang) * L * .92];
    const elbow = [sh[0] + sx * Math.sin(ang * .55) * L * .62, sh[1] + Math.cos(ang * .55) * L * .56];
    paint(ctx, ribbonPts(through([sh, elbow, hand], 5), .40 * u, .30 * u),
      { wash: PAL.cream, alpha: .34, ink: PAL.ink, sw: 1.9 * lw, key: sk + 'a' + sx });
    paint(ctx, ellPts(hand[0], hand[1], .36 * u, .34 * u, 16), { wash: PAL.cream, alpha: .42, ink: PAL.ink, sw: 2.0 * lw, key: sk + 'hn' + sx });
  }
  ctx.restore();
}

// ------------------------------------------------------------------- Bot --
// The machine: a wind-up clay robot. Friendly, and completely confident about things it invents.
export function bot(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, t = 0, mood = 'idle', lean = 0, armL = .4, armR = .4, crank = 0, seedKey = 'bot', look = 0 } = o;
  const sk = seedKey;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  paint(ctx, ellPts(0, 2.85 * u, 1.9 * u, .38 * u, 18), { wash: '#6B5A44', alpha: .05, edge: false, key: sk + 'sh' });

  // wheels
  for (const sx of [-1, 1]) paint(ctx, ellPts(sx * .85 * u, 2.5 * u, .52 * u, .5 * u, 16), { wash: PAL.dusk, alpha: .2, ink: PAL.ink, sw: 1.6 * u / 40, key: sk + 'w' + sx });

  // body bell
  const bell = through([[-1.75 * u, 2.2 * u], [-1.95 * u, .35 * u], [-1.15 * u, -.55 * u], [1.15 * u, -.55 * u], [1.95 * u, .35 * u], [1.75 * u, 2.2 * u]], 5, .3);
  paint(ctx, [...bell, [-1.75 * u, 2.2 * u]], { wash: PAL.rust, alpha: .13, ink: PAL.ink, sw: 1.9 * u / 40, key: sk + 'bd' });
  // grille
  for (let i = 0; i < 3; i++) ink(ctx, [[-.7 * u, (.35 + i * .38) * u], [.7 * u, (.35 + i * .38) * u]], { w: 1.5 * u / 40, key: sk + 'g' + i });

  // head
  paint(ctx, blobPts(0, -1.75 * u, 1.32 * u, 6, .05, 26), { wash: PAL.steel, alpha: .17, ink: PAL.ink, sw: 2.0 * u / 40, key: sk + 'hd' });
  // antenna + its little light
  ink(ctx, [[0, -3.0 * u], [.12 * u, -3.75 * u]], { w: 2.0 * u / 40, key: sk + 'an' });
  paint(ctx, ellPts(.12 * u, -3.9 * u, .21 * u, .21 * u, 14), { wash: PAL.lamp, alpha: .5, ink: PAL.ink, sw: 1.4 * u / 40, key: sk + 'anb' });
  glow(ctx, .12 * u, -3.9 * u, 1.1 * u, PAL.lamp, .35);

  // face
  const ey = -1.85 * u;
  if (mood === 'happy') {
    for (const sx of [-1, 1]) ink(ctx, arcPts(sx * .45 * u, ey + .1 * u, .22 * u, Math.PI * 1.15, Math.PI * 1.85, 8), { w: 2.2 * u / 40, key: sk + 'eh' + sx });
  } else if (mood === 'eager') {
    for (const sx of [-1, 1]) paint(ctx, ellPts(sx * .45 * u, ey, .26 * u, .30 * u, 14), { wash: PAL.ink, alpha: .95, edge: false, key: sk + 'ee' + sx });
  } else {
    for (const sx of [-1, 1]) paint(ctx, ellPts(sx * .45 * u + look * .1 * u, ey, .22 * u, .24 * u, 14), { wash: PAL.ink, alpha: .9, edge: false, key: sk + 'e' + sx });
  }
  ink(ctx, through([[-.34 * u, -.95 * u], [0, -.82 * u], [.34 * u, -.95 * u]], 5), { w: 1.9 * u / 40, key: sk + 'mo' });

  // crank on the back
  const ca = crank * TAU;
  ink(ctx, [[-1.9 * u, .9 * u], [-2.5 * u, .9 * u + Math.sin(ca) * .5 * u]], { w: 2.0 * u / 40, key: sk + 'cr' });

  // arms
  for (const [sx, ang] of [[-1, armL], [1, armR]]) {
    const sh = [sx * 1.7 * u, .1 * u];
    const hd = [sh[0] + sx * 1.15 * u, sh[1] + ang * 1.9 * u];
    ink(ctx, through([sh, [(sh[0] + hd[0]) / 2 + sx * .2 * u, (sh[1] + hd[1]) / 2], hd], 4), { w: 2.3 * u / 40, key: sk + 'ar' + sx });
    paint(ctx, ellPts(hd[0], hd[1], .30 * u, .28 * u, 12), { wash: PAL.steel, alpha: .25, ink: PAL.ink, sw: 1.4 * u / 40, key: sk + 'hh' + sx });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scene ----
export function hills(ctx, y, t, o = {}) {
  const { back = PAL.olive, front = PAL.moss, key = 'hill' } = o;
  paint(ctx, through([[-120, y + 40], [Wv(.18), y - 130], [Wv(.42), y - 20], [Wv(.66), y - 150], [Wv(.88), y - 30], [2040, y + 40], [2040, H + 80], [-120, H + 80]], 8),
    { wash: back, alpha: .10, edge: false, key: key + 'b' });
  paint(ctx, through([[-120, y + 190], [Wv(.25), y + 90], [Wv(.5), y + 170], [Wv(.78), y + 60], [2040, y + 180], [2040, H + 80], [-120, H + 80]], 8),
    { wash: front, alpha: .12, edge: false, key: key + 'f' });
  // grass tufts, swaying
  const r = rng('tuft', 0);
  for (let i = 0; i < 26; i++) {
    const gx = r() * 1960 - 20, gy = y + 120 + r() * 220;
    const h = 20 + r() * 26, sw = Math.sin(t * 1.5 + i) * 5;
    ink(ctx, [[gx, gy], [gx + sw, gy - h]], { w: 1.6, col: PAL.inkSoft, key: 't' + i });
  }
}
const Wv = f => f * 1920;

export function planet(ctx, o = {}) {
  const { x = 1500, y = 330, r = 300, t = 0, key = 'mars', col = PAL.mars } = o;
  paint(ctx, blobPts(x, y, r, 9, .012, 54), { wash: col, alpha: .17, ink: PAL.ink, sw: 2.6, key: key + 'p' });
  // darker limb on one side: form from value, not from a gradient
  paint(ctx, blobPts(x + r * .42, y + r * .30, r * .68, 7, .05, 40), { wash: PAL.rust, alpha: .07, edge: false, key: key + 'l' });
  const rnd = rng(key + 'cr', 0);
  for (let i = 0; i < 7; i++) {
    const a = rnd() * TAU, d = rnd() * r * .68;
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, cr = r * (.07 + rnd() * .13);
    paint(ctx, blobPts(cx, cy, cr, 6, .14, 20), { wash: PAL.rust, alpha: .12, ink: PAL.ink, sw: 1.4, key: key + 'c' + i });
  }
}

export function stars(ctx, t, o = {}) {
  const { n = 30, key = 'st', yMax = 700, col = PAL.cream } = o;
  const r = rng(key, 0);
  for (let i = 0; i < n; i++) {
    const x = r() * 1920, y = r() * yMax, s = 1.2 + r() * 2.4;
    const tw = .45 + .55 * Math.abs(Math.sin(t * (.7 + r() * 1.6) + i));
    ctx.save();
    ctx.globalAlpha = tw * .8;
    paint(ctx, ellPts(x, y, s * 2.2, s * 2.2, 10), { wash: col, alpha: .5, edge: false, key: key + i });
    ctx.restore();
    if (i % 3 === 0) ink(ctx, [[x - s * 2.6, y], [x + s * 2.6, y]], { w: 1.1, col: hexA(PAL.cream, .5), key: key + 'c' + i });
  }
}

export function rocket(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, rot = 0, thrust = 1, t = 0, key = 'rk' } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // flame first, so the body overlaps it
  if (thrust > .02) {
    const f = 1 + Math.sin(t * 22) * .18;
    paint(ctx, through([[0, 2.2 * u], [.55 * u * f, 3.2 * u * thrust], [0, 4.1 * u * thrust * f], [-.55 * u * f, 3.2 * u * thrust]], 5),
      { wash: PAL.lamp, alpha: .22, edge: false, key: key + 'fl' });
    glow(ctx, 0, 3.0 * u, 2.6 * u * thrust, PAL.lamp, .5 * thrust);
  }
  // fins
  paint(ctx, through([[-.95 * u, 1.0 * u], [-1.75 * u, 2.15 * u], [-.95 * u, 2.0 * u]], 4), { wash: PAL.terracotta, alpha: .2, ink: PAL.ink, sw: 1.6, key: key + 'f1' });
  paint(ctx, through([[.95 * u, 1.0 * u], [1.75 * u, 2.15 * u], [.95 * u, 2.0 * u]], 4), { wash: PAL.terracotta, alpha: .2, ink: PAL.ink, sw: 1.6, key: key + 'f2' });
  // body
  const body = through([[-.95 * u, 2.0 * u], [-1.0 * u, -.6 * u], [-.62 * u, -1.7 * u], [0, -2.6 * u], [.62 * u, -1.7 * u], [1.0 * u, -.6 * u], [.95 * u, 2.0 * u]], 5, .35);
  paint(ctx, [...body, [-.95 * u, 2.0 * u]], { wash: PAL.cream, alpha: .26, ink: PAL.ink, sw: 2.2, key: key + 'b' });
  paint(ctx, ellPts(0, -.55 * u, .34 * u, .34 * u, 16), { wash: PAL.sky, alpha: .3, ink: PAL.ink, sw: 1.6, key: key + 'w' });
  ctx.restore();
}

export function mic(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, t = 0, key = 'mic', lit = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  // stand and boom
  ink(ctx, [[1.9 * u, 4.4 * u], [0, 3.4 * u], [-.15 * u, .2 * u]], { w: 3.4, key: key + 'st' });
  paint(ctx, ellPts(0, 3.45 * u, 1.55 * u, .34 * u, 20), { wash: PAL.dusk, alpha: .30, ink: PAL.ink, sw: 2.0, key: key + 'bs' });
  // shock mount ring
  paint(ctx, ellPts(0, -.55 * u, 1.35 * u, 1.30 * u, 22), { wash: PAL.steel, alpha: .30, ink: PAL.ink, sw: 2.0, key: key + 'ring' });
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + .3;
    ink(ctx, [[Math.cos(a) * 1.02 * u, -.55 * u + Math.sin(a) * .98 * u], [Math.cos(a) !== 0 ? .0 : 0, -.55 * u]], { w: 1.3, col: PAL.inkSoft, key: key + 'sp' + i });
  }
  // capsule
  paint(ctx, rrPts(-.74 * u, -2.35 * u, 1.48 * u, 2.5 * u, .72 * u, 1.4), { wash: PAL.steel, alpha: .40, ink: PAL.ink, sw: 2.4, key: key + 'cp' });
  for (let i = 0; i < 5; i++) ink(ctx, [[-.44 * u, (-1.95 + i * .34) * u], [.44 * u, (-1.95 + i * .34) * u]], { w: 1.3, col: hexA(PAL.ink, .5), key: key + 'g' + i });
  paint(ctx, ellPts(-.22 * u, -2.0 * u, .22 * u, .30 * u, 12), { wash: PAL.cream, alpha: .30, edge: false, key: key + 'hi' });
  glow(ctx, 0, -1.0 * u, 4.6 * u, PAL.lamp, .20 * lit);
  ctx.restore();
}

export function lamp(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, lit = 1, key = 'lamp', t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  if (lit > .02) {
    glow(ctx, 0, 1.0 * u, 11 * u * lit, PAL.lamp, .34 * lit);
    paint(ctx, ellPts(0, 1.1 * u, 4.6 * u, 3.2 * u, 26), { wash: PAL.lamp, alpha: .10 * lit, edge: false, key: key + 'pool' });
  }
  ink(ctx, [[1.5 * u, 4.4 * u], [0, 3.6 * u], [-.1 * u, 1.3 * u]], { w: 3.2, key: key + 'st' });
  paint(ctx, ellPts(0, 4.5 * u, 1.9 * u, .38 * u, 18), { wash: PAL.dusk, alpha: .28, ink: PAL.ink, sw: 2.0, key: key + 'bs' });
  // shade: a cone, painted, with a lit inner lip
  paint(ctx, through([[-2.1 * u, 1.35 * u], [-1.15 * u, -1.05 * u], [1.15 * u, -1.05 * u], [2.1 * u, 1.35 * u]], 6),
    { wash: PAL.terracotta, alpha: .30, ink: PAL.ink, sw: 2.6, key: key + 'sd' });
  paint(ctx, ellPts(0, 1.30 * u, 2.08 * u, .40 * u, 20), { wash: PAL.lamp, alpha: .55 * lit, edge: false, key: key + 'bl' });
  ink(ctx, ellPts(0, 1.30 * u, 2.08 * u, .40 * u, 20), { w: 1.6, key: key + 'bll', close: true });
  ctx.restore();
}

export function desk(ctx, o = {}) {
  const { x = 0, y = 0, w = 800, col = PAL.sand, key = 'desk' } = o;
  const d = 46;                                   // depth of the top, drawn as a flat trapezoid
  // legs and crossbar first
  for (const sx of [-1, 1]) {
    paint(ctx, through([[x + sx * (w / 2 - 66), y + d + 30], [x + sx * (w / 2 - 74), y + 250], [x + sx * (w / 2 - 88), y + 268]], 3),
      { wash: PAL.inkSoft, alpha: .18, ink: PAL.ink, sw: 1.4, key: key + 'l' + sx });
  }
  // front face, then the top: two values, no gradient
  paint(ctx, through([[x - w / 2, y + d], [x + w / 2, y + d], [x + w / 2 - 8, y + d + 40], [x - w / 2 + 8, y + d + 40]], 3),
    { wash: PAL.terracotta, alpha: .26, ink: PAL.ink, sw: 2.2, key: key + 'f' });
  paint(ctx, through([[x - w / 2 - 26, y + d], [x - w / 2 + 20, y], [x + w / 2 - 20, y], [x + w / 2 + 26, y + d]], 4),
    { wash: col, alpha: .38, ink: PAL.ink, sw: 2.4, key: key + 't' });
  paint(ctx, ellPts(x - w * .16, y + d * .40, w * .30, d * .30, 24), { wash: PAL.cream, alpha: .07, edge: false, key: key + 'hl' });
}

export function arrow(ctx, from, to, o = {}) {
  const { bend = .25, w = 4, col = PAL.ink, key = 'arw', headSize = 1 } = o;
  const P = through([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - bend * Math.hypot(to[0] - from[0], to[1] - from[1])], to], 6);
  ink(ctx, P, { w, col, key: key + 's' });
  const a = Math.atan2(to[1] - P[P.length - 3][1], to[0] - P[P.length - 3][0]);
  const L = 26 * headSize, spread = .5;
  ink(ctx, [[to[0] - Math.cos(a - spread) * L, to[1] - Math.sin(a - spread) * L], to], { w, col, key: key + 'h1' });
  ink(ctx, [[to[0] - Math.cos(a + spread) * L, to[1] - Math.sin(a + spread) * L], to], { w, col, key: key + 'h2' });
}

export function slip(ctx, o = {}) {
  const { x = 0, y = 0, w = 90, h = 120, rot = 0, kind = 'plain', t = 0, key = 'slip', fade = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = clamp(fade);
  const quad = through([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2 - 16], [w / 2 - 16, h / 2], [-w / 2, h / 2]], 3, .0);
  paint(ctx, quad, { wash: PAL.cream, alpha: .22, ink: PAL.ink, sw: 1.8, key: key + 'p' });
  ink(ctx, [[w / 2, h / 2], [w / 2, h / 2 - 16], [w / 2 - 16, h / 2]], { w: 1.4, key: key + 'fl' });
  if (kind === 'empty') paint(ctx, ellPts(0, 0, w * .22, h * .13, 14), { wash: PAL.sky, alpha: .1, ink: PAL.ink, sw: 1.4, key: key + 'e' });
  if (kind === 'huge') { paint(ctx, ellPts(0, 0, w * .34, h * .30, 18), { wash: PAL.ochre, alpha: .14, ink: PAL.ink, sw: 1.6, key: key + 'h' }); }
  if (kind === 'spiky') ink(ctx, through([[-w * .28, h * .1], [-w * .1, -h * .16], [w * .02, h * .16], [w * .16, -h * .14], [w * .3, h * .08]], 4), { w: 2.0, key: key + 'sp' });
  if (kind === 'fake') { ink(ctx, through([[-w * .3, h * .12], [0, -h * .2], [w * .3, h * .14], [0, h * .2], [-w * .3, h * .12]], 5), { w: 2.0, col: PAL.rust, key: key + 'fk' }); }
  if (kind === 'ok') glow(ctx, 0, 0, w * .8, PAL.leaf, .35 * (.7 + .3 * Math.sin(t * 4)));
  ctx.restore();
}

export function sketchbook(ctx, o = {}) {
  const { x = 0, y = 0, w = 300, h = 200, rot = 0, key = 'sb', t = 0 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, through([[-w / 2, -h / 2], [0, -h / 2 + 8], [w / 2, -h / 2], [w / 2, h / 2], [0, h / 2 + 8], [-w / 2, h / 2]], 4),
    { wash: PAL.cream, alpha: .24, ink: PAL.ink, sw: 2.0, key: key + 'p' });
  ink(ctx, [[0, -h / 2 + 8], [0, h / 2 + 8]], { w: 1.8, key: key + 'sp' });
  for (let i = 0; i < 6; i++) paint(ctx, ellPts(-w / 2 + 14 + i * 12, 0, 6, 6, 10), { wash: PAL.steel, alpha: .25, ink: PAL.ink, sw: 1.2, key: key + 'r' + i });
  // a wild sketch on the page: the improbable edge cases
  ink(ctx, through([[w * .1, h * .12], [w * .3, -h * .2], [w * .42, h * .1], [w * .2, h * .22], [w * .12, -h * .06]], 5), { w: 1.8, col: PAL.inkSoft, key: key + 'sk' });
  ctx.restore();
}

export function scroll(ctx, o = {}) {
  const { x = 0, y = 0, w = 320, h = 90, rot = 0, key = 'scr', open = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  paint(ctx, rrPts(-w / 2, -h / 2, w, h, 10, 1.5), { wash: PAL.cream, alpha: .26, ink: PAL.ink, sw: 2.0, key: key + 'p' });
  for (const sx of [-1, 1]) {
    paint(ctx, ellPts(sx * (w / 2 - 6), 0, 12, h / 2 - 4, 16), { wash: PAL.sand, alpha: .3, ink: PAL.ink, sw: 1.8, key: key + 'r' + sx });
  }
  const lines = open > .3 ? 4 : 0;
  for (let i = 0; i < lines; i++) ink(ctx, [[-w * .3, (-h * .22 + i * h * .15)], [w * .3 * (0.6 + hash(i) * .5), (-h * .22 + i * h * .15)]], { w: 1.5, col: PAL.inkSoft, key: key + 'l' + i });
  ctx.restore();
}

export function mark(ctx, o = {}) {
  // painted punctuation emotes: ! ? ... (allowed by the guide; words are not)
  const { x = 0, y = 0, u = 40, kind = '?', alpha = 1, rot = 0, col = PAL.ink, key = 'mk' } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  if (kind === '?') {
    ink(ctx, through([[-.45 * u, -.55 * u], [0, -.85 * u], [.45 * u, -.5 * u], [.1 * u, 0], [.05 * u, .28 * u]], 6), { w: 5, col, key: key + 'q' });
    paint(ctx, ellPts(.05 * u, .72 * u, .11 * u, .11 * u, 12), { wash: col, alpha: .9, edge: false, key: key + 'd' });
  } else if (kind === '!') {
    ink(ctx, [[0, -.85 * u], [0, .18 * u]], { w: 6, col, key: key + 'e' });
    paint(ctx, ellPts(0, .62 * u, .13 * u, .13 * u, 12), { wash: col, alpha: .9, edge: false, key: key + 'd' });
  } else if (kind === 'heart') {
    paint(ctx, through([[-.5 * u, -.2 * u], [-.45 * u, -.6 * u], [0, -.25 * u], [.45 * u, -.6 * u], [.5 * u, -.2 * u], [0, .55 * u]], 5), { wash: PAL.rose, alpha: .35, ink: PAL.ink, sw: 1.8, key: key + 'h' });
  } else if (kind === 'zzz') {
    ink(ctx, through([[-.4 * u, 0], [.1 * u, 0], [-.4 * u, .55 * u], [.15 * u, .55 * u]], 4), { w: 3, col, key: key + 'z' });
  }
  ctx.restore();
}

export function island(ctx, o = {}) {
  const { x = 0, y = 0, w = 380, h = 150, key = 'isl', col = PAL.moss } = o;
  paint(ctx, through([[x - w / 2, y], [x - w * .2, y - h], [x + w * .22, y - h * .85], [x + w / 2, y], [x + w * .2, y + h * .5], [x - w * .24, y + h * .45]], 6),
    { wash: col, alpha: .17, ink: PAL.ink, sw: 2.2, key: key + 'p' });
  paint(ctx, ellPts(x, y - h * .85, w * .3, 16, 18), { wash: PAL.leaf, alpha: .18, edge: false, key: key + 'g' });
}

export function bridge(ctx, o = {}) {
  const { x0 = 0, x1 = 400, y = 0, k = 1, key = 'brg', col = PAL.sand } = o;
  if (k <= .01) return;
  const mid = (x0 + x1) / 2, span = x1 - x0;
  const P = arcPts(mid, y, span / 2, Math.PI, TAU, 16, 90 * k);
  const seg = through(P.filter((_, i) => i <= Math.max(2, Math.floor(P.length * k))), 3);
  paint(ctx, ribbonPts(seg, 26), { wash: col, alpha: .22, ink: PAL.ink, sw: 2.0, key: key + 'd' });
  for (let i = 0; i < 6; i++) {
    const p = seg[Math.min(seg.length - 1, Math.floor(i / 6 * seg.length))];
    if (p) ink(ctx, [[p[0], p[1]], [p[0], p[1] - 26]], { w: 1.6, key: key + 'r' + i });
  }
}

// Foreground props. Anything in front of the cast makes the flat drawing feel like a room.
export function mug(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, t = 0, key = 'mug', steam = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  paint(ctx, through([[-.9 * u, 0], [.9 * u, 0], [.72 * u, 1.2 * u], [-.72 * u, 1.2 * u]], 5), { wash: PAL.cream, alpha: .40, ink: PAL.ink, sw: 2.2, key: key + 'b' });
  ink(ctx, ellPts(0, 0, .9 * u, .22 * u, 18), { w: 2.0, key: key + 'r', close: true });
  paint(ctx, ellPts(0, .12 * u, .72 * u, .16 * u, 16), { wash: PAL.rust, alpha: .35, edge: false, key: key + 'c' });
  paint(ctx, arcPts(1.0 * u, .55 * u, .34 * u, -1.2, 1.2, 10), { wash: PAL.cream, alpha: .3, ink: PAL.ink, sw: 2.0, key: key + 'h' });
  if (steam > .02) for (let i = 0; i < 3; i++) {
    const ph = t * 1.4 + i * 1.1;
    ink(ctx, through([[(-.3 + i * .3) * u, (-.2 - (ph % 1) * 1.5) * u], [(.1 + i * .3) * u, (-.6 - (ph % 1) * 1.8) * u]], 4),
      { w: 1.5, col: hexA(PAL.inkSoft, .5 * (1 - (ph % 1)) * steam * .8), key: key + 's' + i });
  }
  ctx.restore();
}

export function papers(ctx, o = {}) {
  const { x = 0, y = 0, w = 150, n = 4, rot = 0, key = 'pp' } = o;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    paint(ctx, rrPts(-w / 2 + k * 8, -k * 7, w, 22, 3, 1.2), { wash: PAL.cream, alpha: .34, ink: PAL.ink, sw: 1.6, key: key + i });
  }
  ctx.restore();
}

export function plant(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, key = 'pl', t = 0, front = false } = o;
  const leaves = 5;
  for (let i = 0; i < leaves; i++) {
    const a = -1.55 + i * .36;
    const L = (1.9 + hash(i) * .7) * u, W2 = (.34 + hash(i * 5) * .12) * u;
    const sway = Math.sin(t * 1.1 + i * .7) * .07;
    const tip = [x + Math.cos(a + sway) * L, y + Math.sin(a + sway) * L];
    const mid = [x + Math.cos(a + sway) * L * .55 + Math.cos(a + 1.6) * W2, y + Math.sin(a + sway) * L * .55 + Math.sin(a + 1.6) * W2];
    paint(ctx, ribbonPts(through([[x, y], mid, tip], 5), W2 * 2, W2 * .5),
      { wash: front ? PAL.moss : PAL.leaf, alpha: front ? .38 : .30, ink: PAL.ink, sw: 1.4, key: key + 'lf' + i });
  }
  ink(ctx, [[x, y], [x - .05 * u, y - 1.2 * u]], { w: 2.0, col: PAL.moss, key: key + 'st' });
  paint(ctx, through([[x - 1.05 * u, y], [x + 1.05 * u, y], [x + .8 * u, y + 1.25 * u], [x - .8 * u, y + 1.25 * u]], 5),
    { wash: PAL.terracotta, alpha: .34, ink: PAL.ink, sw: 2.0, key: key + 'pot' });
}

