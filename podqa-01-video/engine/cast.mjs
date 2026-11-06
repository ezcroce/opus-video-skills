// The cast and the props. Everything is painted with paint()/ink()/glow() so it belongs to one world.
// Numbers are in "u" (one body unit), so a character can be scaled from a wide shot to a close-up
// without redrawing it.
import {
  PAL, TAU, paint, ink, glow, hexA, hash, lerp, clamp, ease, kf, wob,
  ellPts, rectPts, rrPts, blobPts, arcPts, through, ribbonPts, rng, VOICE, darken, clipTo,
} from './core.mjs';

// ------------------------------------------------------------------ Vivi --
// The host, drawn with adult proportions: a head that is a head, shoulders, a jacket, hair that frames
// the face, and a mouth with two lips driven by the measured speech envelope.
// Unit u is the head radius; the whole figure is about 9u tall and 4u wide at the shoulders.

const blinkCurve = (t, key) => {
  const period = 3.2 + hash(key.length * 3.7) * 1.9;
  const ph = (((t + hash(key.charCodeAt(0) || 5) * period) % period) + period) % period / period;
  if (ph > .962) { const k = Math.sin((ph - .962) / .038 * Math.PI); return k; }
  return 0;
};

function eyeShapes(ctx, cx, cy, u, o = {}) {
  const { open = 1, look = 0, mood = 'idle', key = 'eye' } = o;
  const lw = u / 40;
  const w = .255 * u, h = .098 * u * Math.max(.06, open);
  const ix = cx + look * .06 * u, iy = cy + (open < .4 ? 0 : .006 * u);

  // A narrow almond: cream sclera, warm iris, a heavy lash on the upper lid. The almond stays flat
  // and pointed at the outer corner so the face reads as an adult's, not a doll's.
  // the lid runs left to right, the lower lid right to left: one closed loop, no reversal spike
  const lid = [], low = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14, a2 = Math.PI * k;
    // pointed corners: the sine is raised to .78 so the ends come together more sharply
    const sx = Math.cos(a2), sy = Math.pow(Math.sin(a2), .78);
    lid.push([cx + sx * w, cy - sy * h * 1.25 - (1 - k) * .012 * u]);
  }
  for (let i = 14; i >= 0; i--) {
    const k = i / 14, a2 = Math.PI * k;
    const sx = Math.cos(a2), sy = Math.pow(Math.sin(a2), .78);
    low.push([cx + sx * w, cy + sy * h * .82]);
  }
  const shape = [...lid, ...low];
  paint(ctx, shape, { wash: PAL.cream, alpha: .46, edge: false, key: key + 'scl' });

  ctx.save();
  ctx.beginPath();
  shape.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.clip();
  // iris: a warm disc, not a black dot; it sits high in the almond so some sclera shows below
  paint(ctx, ellPts(ix, iy - .012 * u, .088 * u, .092 * u, 18), { wash: darken(PAL.terracotta, .18), alpha: .82, edge: false, key: key + 'iris' });
  paint(ctx, ellPts(ix, iy - .006 * u, .036 * u, .038 * u, 12), { wash: PAL.ink, alpha: .72, edge: false, key: key + 'pup' });
  paint(ctx, ellPts(ix - .028 * u, iy - .046 * u, .026 * u, .026 * u, 10), { wash: PAL.cream, alpha: .85, edge: false, key: key + 'hl' });
  ctx.restore();

  // upper lid: the heaviest line in the face, thickening towards the outer corner
  ink(ctx, lid, { w: 2.1 * lw, col: PAL.ink, key: key + 'lid' });
  ink(ctx, lid.slice(0, 4), { w: 3.4 * lw, col: PAL.ink, op: .85, key: key + 'lash' });
  // lower lid: soft, and only on the inner half, so the eye is not ringed
  ink(ctx, low.slice(1, 8), { w: 1.1 * lw, col: PAL.inkSoft, op: .34, key: key + 'low' });
  // crease: a short stroke above the lid, keeps the eye from floating
  ink(ctx, through([[cx - w * .78, cy - h * 1.62], [cx - w * .1, cy - h * 1.92], [cx + w * .62, cy - h * 1.66]], 4),
    { w: 1.0 * lw, col: PAL.inkSoft, op: .40, key: key + 'cr' });

  if (mood === 'squint') ink(ctx, [[cx - w * 1.04, cy - h * .1], [cx + w * 1.04, cy - h * .1]], { w: 2.4 * lw, key: key + 'sq' });
  else if (mood === 'happy') ink(ctx, arcPts(cx, cy + h * 1.1, w * .92, Math.PI * 1.1, Math.PI * 1.9, 12), { w: 2.6 * lw, key: key + 'hp' });

  // brow: low, short, nearly straight — a high arch reads as worry
  const by = cy - .30 * u + (mood === 'surprise' ? -.05 * u : 0);
  ink(ctx, through([[cx - .24 * u, by + .012 * u], [cx - .04 * u, by - .026 * u], [cx + .23 * u, by - .004 * u]], 5),
    { w: 2.0 * lw, col: PAL.hair, op: .85, key: key + 'brw' });
}

// Lips, restrained: one ink bow for the upper lip, one soft wash for the lower, and a small dark
// interior that only appears when the voice is actually open. At talk speed this reads as speech.
function lips(ctx, cx, cy, u, o = {}) {
  const { open = 0, spread = .5, mood = 'idle', key = 'lips' } = o;
  const lw = u / 40;
  const w = (.225 + .075 * spread) * u;
  const gap = Math.min(.13 * u, Math.pow(Math.max(0, open), 1.6) * .21 * u);
  const smile = mood === 'happy' ? -.035 * u : mood === 'sad' ? .03 * u : 0;

  // lower lip
  paint(ctx, through([[cx - w, cy + smile], [cx - w * .46, cy + .07 * u + smile * .6], [cx, cy + .095 * u + smile * .7],
                      [cx + w * .46, cy + .07 * u + smile * .6], [cx + w, cy + smile]], 5),
    { wash: PAL.rose, alpha: .34, edge: false, key: key + 'low' });
  // interior: a lens, small, warm — never a black hole
  if (gap > .010) {
    paint(ctx, through([[cx - w * .78, cy + smile * .6], [cx, cy - gap * .30], [cx + w * .78, cy + smile * .6],
                        [cx + w * .58, cy + gap * .84], [cx, cy + gap], [cx - w * .58, cy + gap * .84]], 5),
      { wash: PAL.rust, alpha: .42, edge: false, key: key + 'in' });
  }
  // the upper lip: a single line with a cupid's bow, the cleanest read at any size
  ink(ctx, through([[cx - w, cy + smile], [cx - w * .40, cy - .022 * u - gap * .20 + smile * .5], [cx, cy - .040 * u - gap * .26],
                    [cx + w * .40, cy - .022 * u - gap * .20 + smile * .5], [cx + w, cy + smile]], 4),
    { w: 2.0 * lw, key: key + 'up' });
  if (gap > .010) ink(ctx, through([[cx - w * .60, cy + gap * .82], [cx, cy + gap * .94], [cx + w * .60, cy + gap * .82]], 4),
    { w: 1.0 * lw, col: PAL.inkSoft, op: .5, key: key + 'lowline' });
}

export function vivi(ctx, o = {}) {
  const {
    x = 0, y = 0, u = 40, t = 0, mood = 'idle', look = 0, lean = 0,
    armL = .10, armR = .10, seedKey = 'vivi', open = null, spread = null, mouthOpen = null,
  } = o;
  const sk = seedKey, lw = u / 40;

  const voiceOpen = clamp(open ?? mouthOpen ?? (VOICE && VOICE.open) ?? 0);
  const voiceSpread = clamp(spread ?? (VOICE && VOICE.spread) ?? .5);
  const talking = mood === 'talk';
  const blink = blinkCurve(t, sk + mood);
  const swayA = Math.sin(t * .77) * .014;             // she never quite stops moving
  const breath = 1 + Math.sin(t * 1.45 + .3) * .006;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean + swayA * .5);

  // ---- hair, back mass: it falls behind the shoulders and never crosses the face
  // (the outline starts and ends at the same point: a closing chord would draw a line across the shape)
  paint(ctx, through([[0, 1.18 * u], [-1.02 * u, 1.12 * u], [-1.26 * u, .60 * u], [-1.16 * u, -.24 * u],
                      [-1.24 * u, -1.04 * u], [-.78 * u, -1.50 * u], [0, -1.66 * u],
                      [.78 * u, -1.50 * u], [1.24 * u, -1.04 * u], [1.16 * u, -.24 * u],
                      [1.26 * u, .60 * u], [1.02 * u, 1.12 * u], [0, 1.18 * u]], 7),
    { wash: PAL.hair, alpha: .56, ink: PAL.ink, sw: 2.0 * lw, key: sk + 'hairB' });

  // ---- neck and shoulders: a real neck, a ribcage, a waist, so the body is not one slab
  paint(ctx, through([[-.30 * u, .92 * u], [.30 * u, .92 * u], [.31 * u, 1.76 * u], [-.31 * u, 1.76 * u]], 3),
    { wash: PAL.skin, alpha: .40, ink: PAL.inkSoft, sw: 1.3 * lw, key: sk + 'neck' });
  paint(ctx, blobPts(0, 1.06 * u, .44 * u, 4, .14, 18), { wash: PAL.terracotta, alpha: .09, edge: false, key: sk + 'jawshadow' });
  // collarbones: two short strokes, the cheapest way to say "an adult body"
  for (const sx of [-1, 1]) ink(ctx, through([[sx * .12 * u, 1.62 * u], [sx * .34 * u, 1.58 * u], [sx * .52 * u, 1.64 * u]], 4),
    { w: 1.2 * lw, col: PAL.inkSoft, op: .32, key: sk + 'clav' + sx });

  paint(ctx, through([[0, 1.90 * u], [-1.14 * u, 1.72 * u], [-1.68 * u, 1.94 * u], [-1.34 * u, 3.40 * u],
                      [-1.72 * u, 5.10 * u], [-1.90 * u, 6.9 * u], [1.90 * u, 6.9 * u], [1.72 * u, 5.10 * u],
                      [1.34 * u, 3.40 * u], [1.68 * u, 1.94 * u], [1.14 * u, 1.72 * u], [0, 1.90 * u]], 5),
    { wash: PAL.sea, alpha: .38, ink: PAL.ink, sw: 2.2 * lw, key: sk + 'coat' });
  // collar: two strokes that make the shoulders read as a garment
  ink(ctx, through([[-.70 * u, 1.80 * u], [0, 2.28 * u], [.70 * u, 1.80 * u]], 5), { w: 1.6 * lw, col: PAL.inkSoft, op: .7, key: sk + 'collar' });
  // a belt breaks the mass and gives the eye a scale reference
  paint(ctx, ribbonPts(through([[-1.38 * u, 3.30 * u], [-.4 * u, 3.44 * u], [.4 * u, 3.38 * u], [1.38 * u, 3.28 * u]], 7), .30 * u),
    { wash: PAL.ochre, alpha: .34, ink: PAL.ink, sw: 1.7 * lw, key: sk + 'belt' });
  paint(ctx, blobPts(1.04 * u, 3.44 * u, .17 * u, 4, .2, 14), { wash: PAL.ochre, alpha: .40, ink: PAL.ink, sw: 1.3 * lw, key: sk + 'knot' });
  paint(ctx, ribbonPts(through([[1.10 * u, 3.50 * u], [1.30 * u, 4.10 * u], [1.06 * u, 4.42 * u]], 5), .16 * u, .09 * u),
    { wash: PAL.ochre, alpha: .34, ink: PAL.ink, sw: 1.2 * lw, key: sk + 'knotTail' });

  // ---- head
  ctx.save();
  ctx.translate(0, -.05 * u);
  const head = through([[-1.00 * u, -.30 * u], [-.97 * u, -.96 * u], [-.62 * u, -1.26 * u], [-.20 * u, -1.36 * u],
                        [.20 * u, -1.36 * u], [.62 * u, -1.26 * u], [.97 * u, -.96 * u], [1.00 * u, -.30 * u],
                        [.94 * u, .34 * u], [.74 * u, .78 * u], [.34 * u, 1.02 * u], [0, 1.06 * u],
                        [-.34 * u, 1.02 * u], [-.74 * u, .78 * u], [-.94 * u, .34 * u]], 6);
  paint(ctx, head, { wash: PAL.skin, alpha: .44, ink: PAL.ink, sw: 2.3 * lw, key: sk + 'head' });
  // blush and a jaw shade: two soft fields, no hard edges anywhere on the face
  for (const sx of [-1, 1]) paint(ctx, blobPts(sx * .58 * u, .26 * u, .26 * u, 6, .1, 22), { wash: PAL.rose, alpha: .13, edge: false, key: sk + 'blush' + sx });

  // ---- fringe: filled *inside* the head silhouette, so no hair line can cross the face
  ctx.save();
  clipTo(ctx, head);
  const fringe = through([[-1.40 * u, -.86 * u], [-1.30 * u, -1.34 * u], [-.62 * u, -1.62 * u], [.30 * u, -1.62 * u],
                          [1.10 * u, -1.36 * u], [1.40 * u, -.80 * u], [1.40 * u, .10 * u],
                          [.96 * u, -.34 * u], [.42 * u, -.56 * u], [-.16 * u, -.62 * u], [-.72 * u, -.50 * u], [-1.40 * u, -.20 * u]], 6);
  paint(ctx, fringe, { wash: PAL.hair, alpha: .58, edge: false, key: sk + 'fringe' });
  // the hairline itself: one stroke, clipped with the fill
  ink(ctx, through([[-1.06 * u, -.30 * u], [-.78 * u, -.50 * u], [-.20 * u, -.62 * u], [.40 * u, -.56 * u], [.90 * u, -.36 * u], [1.06 * u, -.16 * u]], 6),
    { w: 2.0 * lw, key: sk + 'hairline' });
  // parting and two strands inside the fringe: direction, so the hair is not a helmet
  ink(ctx, through([[-.06 * u, -1.26 * u], [-.28 * u, -.86 * u], [-.44 * u, -.62 * u]], 5), { w: 1.1 * lw, col: PAL.inkSoft, op: .45, key: sk + 'part' });
  ctx.restore();

  // sheen on the hair: one pale band, no highlight gradient
  paint(ctx, ribbonPts(through([[-.50 * u, -1.16 * u], [-.02 * u, -1.30 * u], [.40 * u, -1.14 * u]], 5), .10 * u), { wash: PAL.cream, alpha: .16, edge: false, key: sk + 'sheen' });

  // ---- rim light from the lamp: a single pale stroke, never a glow
  ink(ctx, through([[-.98 * u, -.72 * u], [-1.02 * u, -.06 * u], [-.92 * u, .44 * u]], 5), { w: 1.5 * lw, col: PAL.cream, op: .22, key: sk + 'rim' });
  ink(ctx, through([[-1.52 * u, 2.02 * u], [-1.34 * u, 2.90 * u]], 4), { w: 1.4 * lw, col: PAL.cream, op: .22, key: sk + 'rim2' });

  // ---- eyes, nose, mouth
  const eyeOpen = mood === 'squint' ? .22 : mood === 'happy' ? .5 : mood === 'surprise' ? 1.2 : 1 - blink * .93;
  eyeShapes(ctx, -.42 * u, -.22 * u, u, { open: eyeOpen, look, mood, key: sk + 'eL' });
  eyeShapes(ctx, .42 * u, -.22 * u, u, { open: eyeOpen, look, mood, key: sk + 'eR' });

  // nose: two soft dabs (tip and nostril shadow), no stroke
  paint(ctx, blobPts(-.02 * u, .13 * u, .07 * u, 6, .08, 14), { wash: PAL.terracotta, alpha: .10, edge: false, key: sk + 'nose' });
  paint(ctx, blobPts(0, .07 * u, .10 * u, 6, .08, 14), { wash: PAL.cream, alpha: .10, edge: false, key: sk + 'noseHl' });

  const mOpen = talking ? Math.pow(voiceOpen, 1.35) * .92 : mood === 'surprise' ? .55 : mood === 'happy' ? .12 : 0;
  lips(ctx, 0, .44 * u, u, { open: mOpen, spread: talking ? voiceSpread : .5, mood, key: sk + 'mouth' });
  ctx.restore();

  // ---- arms: shoulder, elbow, hand; a slow trailing motion so nothing snaps
  for (const [sx, ang] of [[-1, armL], [1, armR]]) {
    const sh = [sx * 1.56 * u, 1.96 * u];
    const a = ang + Math.sin(t * .9 + (sx > 0 ? .4 : 1.9)) * .05;
    const L1 = 1.5 * u, L2 = 1.35 * u;
    const elbow = [sh[0] + sx * Math.sin(a * .62) * L1, sh[1] + Math.cos(a * .62) * L1];
    const hand = [elbow[0] + sx * Math.sin(a * .96) * L2, elbow[1] + Math.cos(a * .96) * L2];
    paint(ctx, ribbonPts(through([sh, elbow], 4), .46 * u, .38 * u), { wash: darken(PAL.sea, .30), alpha: .42, ink: PAL.ink, sw: 1.9 * lw, key: sk + 'ua' + sx });
    paint(ctx, ribbonPts(through([elbow, hand], 4), .38 * u, .27 * u), { wash: PAL.skin, alpha: .40, ink: PAL.ink, sw: 1.8 * lw, key: sk + 'fa' + sx });
    // hand: a mitten, elongated along the forearm, so it reads as a hand at 25 px
    const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1], L = Math.hypot(dx, dy) || 1;
    const hang = Math.atan2(dy, dx);
    paint(ctx, ellPts(hand[0] + dx / L * .10 * u, hand[1] + dy / L * .10 * u, .26 * u, .19 * u, 16, 0, hang),
      { wash: PAL.skin, alpha: .46, ink: PAL.ink, sw: 1.7 * lw, key: sk + 'hd' + sx });
  }
  ctx.restore();
}

// ------------------------------------------------------------------- Bot --
// The machine: a slim brass-and-steel automaton with one lens, not a toy robot.
export function bot(ctx, o = {}) {
  const { x = 0, y = 0, u = 40, t = 0, mood = 'idle', lean = 0, armL = .4, armR = .4, crank = 0, seedKey = 'bot', look = 0 } = o;
  const sk = seedKey, lw = u / 40;
  const sway = Math.sin(t * .63 + .9) * .012;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean + sway);

  // body: a tapered column with a chest plate
  paint(ctx, through([[-1.10 * u, 1.30 * u], [-.95 * u, -.10 * u], [-1.05 * u, -.55 * u], [1.05 * u, -.55 * u], [.95 * u, -.10 * u], [1.10 * u, 1.30 * u], [.80 * u, 2.05 * u], [-.80 * u, 2.05 * u]], 4),
    { wash: PAL.steel, alpha: .38, ink: PAL.ink, sw: 2.2 * lw, key: sk + 'bd' });
  paint(ctx, rrPts(-.62 * u, -.30 * u, 1.24 * u, .78 * u, .16 * u, 1), { wash: PAL.ochre, alpha: .22, ink: PAL.inkSoft, sw: 1.4 * lw, key: sk + 'plate' });
  for (let i = 0; i < 3; i++) paint(ctx, ellPts(-.34 * u + i * .34 * u, .48 * u, .07 * u, .07 * u, 10), { wash: PAL.inkSoft, alpha: .5, edge: false, key: sk + 'rv' + i });
  // base
  paint(ctx, through([[-.80 * u, 2.05 * u], [.80 * u, 2.05 * u], [.92 * u, 2.42 * u], [-.92 * u, 2.42 * u]], 3), { wash: PAL.dusk, alpha: .30, ink: PAL.ink, sw: 1.8 * lw, key: sk + 'base' });

  // neck + head: a rounded column, one lens
  ink(ctx, [[0, -.55 * u], [0, -.95 * u]], { w: 5 * lw, key: sk + 'neck' });
  paint(ctx, through([[-.72 * u, -1.62 * u], [-.72 * u, -2.28 * u], [-.44 * u, -2.62 * u], [.44 * u, -2.62 * u], [.72 * u, -2.28 * u], [.72 * u, -1.62 * u], [.44 * u, -1.36 * u], [-.44 * u, -1.36 * u]], 4),
    { wash: PAL.steel, alpha: .42, ink: PAL.ink, sw: 2.1 * lw, key: sk + 'hd' });
  // collar ring
  paint(ctx, ribbonPts(through([[-.66 * u, -1.40 * u], [0, -1.30 * u], [.66 * u, -1.40 * u]], 5), .16 * u), { wash: PAL.ochre, alpha: .32, ink: PAL.ink, sw: 1.4 * lw, key: sk + 'ring' });
  // lens
  const lx = look * .07 * u;
  paint(ctx, ellPts(lx, -2.0 * u, .30 * u, .30 * u, 20), { wash: PAL.ink, alpha: .55, ink: PAL.ink, sw: 1.8 * lw, key: sk + 'lens' });
  paint(ctx, ellPts(lx - .09 * u, -2.10 * u, .11 * u, .10 * u, 12), { wash: PAL.cream, alpha: .55, edge: false, key: sk + 'lh' });
  if (mood === 'happy') ink(ctx, arcPts(lx, -1.92 * u, .24 * u, Math.PI * 1.15, Math.PI * 1.85, 10), { w: 2.2 * lw, key: sk + 'smile' });
  // antenna
  ink(ctx, [[.1 * lx, -2.62 * u], [.16 * lx, -3.18 * u]], { w: 1.8 * lw, key: sk + 'ant' });
  paint(ctx, ellPts(.16 * lx, -3.26 * u, .10 * u, .10 * u, 12), { wash: PAL.lamp, alpha: .55, ink: PAL.ink, sw: 1.2 * lw, key: sk + 'anb' });
  glow(ctx, .16 * lx, -3.26 * u, .9 * u, PAL.lamp, .30);

  // arms: two thin segments, hands like small blocks
  for (const [sx, ang] of [[-1, armL], [1, armR]]) {
    const sh = [sx * 1.02 * u, -.20 * u];
    const a = ang + Math.sin(t * .8 + sx) * .05;
    const el = [sh[0] + sx * Math.sin(a * .7) * .95 * u, sh[1] + Math.cos(a * .7) * .95 * u];
    const hd = [el[0] + sx * Math.sin(a) * .85 * u, el[1] + Math.cos(a) * .85 * u];
    ink(ctx, through([sh, el, hd], 5), { w: 3.0 * lw, col: PAL.inkSoft, key: sk + 'ar' + sx });
    paint(ctx, rrPts(hd[0] - .16 * u, hd[1] - .14 * u, .34 * u, .30 * u, .10 * u, 1), { wash: PAL.steel, alpha: .42, ink: PAL.ink, sw: 1.5 * lw, key: sk + 'hh' + sx });
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

