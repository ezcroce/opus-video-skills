// The Exodus, as thirteen panels. Each panel owns the audio window listed in timeline.json, so the
// lettering and the drawings land on the words instead of near them.
//
// Shapes are placed in page units, relative to the panel. Type, balloons and captions go through PX(),
// which converts screen pixels to page units for that panel's zoom.
import { readFileSync } from 'node:fs';
import {
  C, W, H, TAU, clamp, lerp, ease, easeOut, seg, hash, rng, seed, through, ellPts, rectPts, rrPts,
  blobPts, arcPts, ink, shape, sharp, box, halftone, path, balloon, caption, sfx, speedLines, impact,
  dots, newsprint, camFor,
} from '../engine/comic.mjs';

const TL = JSON.parse(readFileSync('timeline.json', 'utf8'));
const PX = (p, n) => n / camFor(p).zoom;

// ---------------------------------------------------------------- people ----
// Figures are symbols: a head, a body, a direction. At this size a face is one dot and one line.
function figure(ctx, o) {
  const { x, y, s = 1, tone = null, load = 0, staff = false, arms = 'down', turn = 1, line = C.ink } = o;
  const body = [[x - 26 * s, y + 96 * s], [x - 22 * s, y + 22 * s], [x - 34 * s, y - 4 * s], [x - 16 * s, y - 18 * s],
    [x + 16 * s, y - 18 * s], [x + 34 * s, y - 4 * s], [x + 22 * s, y + 22 * s], [x + 26 * s, y + 96 * s]];
  sharp(ctx, body, { fill: C.panel, line, w: 5 * s, key: 'fb' + Math.round(x) });
  if (tone) halftone(ctx, body, { col: tone, dens: 'mid', size: 7, op: .8 });
  // legs
  ink(ctx, [[x - 10 * s, y + 94 * s], [x - 14 * s, y + 150 * s]], { w: 8 * s, col: line, key: 'lg1' + Math.round(x) });
  ink(ctx, [[x + 10 * s, y + 94 * s], [x + 16 * s, y + 150 * s]], { w: 8 * s, col: line, key: 'lg2' + Math.round(x) });
  // head
  shape(ctx, ellPts(x, y - 40 * s, 22 * s, 25 * s, 20), { fill: C.panel, line, w: 5 * s, key: 'fh' + Math.round(x) });
  if (arms === 'up') {
    ink(ctx, [[x - 26 * s, y + 6 * s], [x - 52 * s, y - 46 * s]], { w: 8 * s, col: line, key: 'ua1' + Math.round(x) });
    ink(ctx, [[x + 26 * s, y + 6 * s], [x + 52 * s, y - 46 * s]], { w: 8 * s, col: line, key: 'ua2' + Math.round(x) });
  }
  if (staff) ink(ctx, [[x + 40 * s, y + 150 * s], [x + 34 * s, y - 90 * s]], { w: 7 * s, col: line, key: 'st' + Math.round(x) });
  if (load) {
    sharp(ctx, [[x - 20 * s, y - 48 * s], [x + 24 * s, y - 48 * s], [x + 24 * s, y - 26 * s], [x - 20 * s, y - 26 * s]],
      { fill: C.spot, line: C.ink, w: 4 * s, key: 'ld' + Math.round(x) });
  }
  return { x, y, s, turn };
}

function pharaoh(ctx, o) {
  const { x, y, s = 1 } = o;
  // shoulders and chest
  const body = [[x - 190 * s, y + 400 * s], [x - 150 * s, y + 130 * s], [x - 70 * s, y + 84 * s],
    [x + 70 * s, y + 84 * s], [x + 150 * s, y + 130 * s], [x + 190 * s, y + 400 * s]];
  sharp(ctx, body, { fill: C.panel, line: C.ink, w: 9 * s, key: 'pb' });
  halftone(ctx, body, { col: C.spot2, dens: 'mid', size: 7, op: .85, clip: { x: x - 400, y: y - 400, w: 400, h: 900 } });
  // broad collar with two bands
  sharp(ctx, [[x - 96 * s, y + 96 * s], [x + 96 * s, y + 96 * s], [x + 66 * s, y + 168 * s], [x - 66 * s, y + 168 * s]],
    { fill: C.spot, line: C.ink, w: 7 * s, key: 'col' });
  ink(ctx, [[x - 78 * s, y + 132 * s], [x + 78 * s, y + 132 * s]], { w: 4 * s, key: 'colb' });
  // head with the nemes: a trapezoid that falls to the shoulders
  const nemes = [[x - 118 * s, y + 40 * s], [x - 132 * s, y - 96 * s], [x - 84 * s, y - 152 * s],
    [x + 84 * s, y - 152 * s], [x + 132 * s, y - 96 * s], [x + 118 * s, y + 40 * s],
    [x + 74 * s, y + 6 * s], [x + 74 * s, y - 74 * s], [x - 74 * s, y - 74 * s], [x - 74 * s, y + 6 * s]];
  sharp(ctx, nemes, { fill: C.panel, line: C.ink, w: 9 * s, key: 'nm' });
  for (let i = -3; i <= 3; i++) ink(ctx, [[x + i * 34 * s, y - 148 * s], [x + i * 34 * s, y - 4 * s]], { w: 7 * s, col: C.spot2, key: 'ns' + i });
  // face
  sharp(ctx, [[x - 74 * s, y - 74 * s], [x + 74 * s, y - 74 * s], [x + 62 * s, y + 24 * s], [x, y + 62 * s], [x - 62 * s, y + 24 * s]],
    { fill: C.panel, line: C.ink, w: 8 * s, key: 'fc' });
  for (const sx of [-1, 1]) {
    ink(ctx, [[x + sx * 34 * s, y - 22 * s], [x + sx * 66 * s, y - 16 * s]], { w: 7 * s, key: 'khl' + sx });   // kohl line
    ctx.save(); ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(x + sx * 40 * s, y - 8 * s, 8 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
    ink(ctx, [[x + sx * 26 * s, y - 30 * s], [x + sx * 56 * s, y - 30 * s]], { w: 5 * s, key: 'brw' + sx });
  }
  ink(ctx, [[x - 22 * s, y + 34 * s], [x + 22 * s, y + 34 * s]], { w: 5 * s, key: 'mo' });
  // false beard
  sharp(ctx, [[x - 14 * s, y + 56 * s], [x + 14 * s, y + 56 * s], [x + 10 * s, y + 116 * s], [x - 10 * s, y + 116 * s]],
    { fill: C.spot2, line: C.ink, w: 5 * s, key: 'bd' });
}

// ---------------------------------------------------------------- panels ----
const R = (x, y, w, h) => ({ x, y, w, h });

function egypt(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'sky' });
  // the sun: a flat disc with a halftone bite, no gradient
  const sun = ellPts(p.x + p.w - 330, p.y + 250, 210, 210, 40);
  shape(ctx, sun, { fill: C.spot, line: C.ink, w: 7 });
  halftone(ctx, sun, { col: C.ink, dens: 'light', size: 7, op: .35, clip: { x: p.x + p.w - 540, y: p.y + 40, w: 210, h: 420 } });
  // pyramids, with the lit face flat and the shade in halftone
  const pyr = (bx, by, w, h) => {
    const P = [[bx, by], [bx + w / 2, by - h], [bx + w, by]];
    sharp(ctx, P, { fill: C.panel, line: C.ink, w: 9, key: 'py' + bx });
    halftone(ctx, [[bx + w / 2, by - h], [bx + w, by], [bx + w * .58, by]], { col: C.spot2, dens: 'mid', size: 7, op: .9 });
  };
  pyr(p.x + 250, p.y + 620, 560, 330);
  pyr(p.x + 690, p.y + 620, 380, 220);
  ink(ctx, [[p.x, p.y + 620], [p.x + p.w, p.y + 620]], { w: 8, key: 'ground' });
  halftone(ctx, rectPts(p.x, p.y + 624, p.w, p.h - 624), { col: C.spot, dens: 'light', size: 8, op: .35 });
  // the file of workers, walking
  const walk = (lt * 24) % 150;
  for (let i = 0; i < 7; i++) {
    figure(ctx, { x: p.x + 150 + i * 205 + walk, y: p.y + 706, s: .84, load: 1, tone: i % 4 === 0 ? C.spot2 : null });
  }
  // the overseer, with a whip that flicks
  figure(ctx, { x: p.x + 1500, y: p.y + 690, s: 1.12, tone: C.spot2, arms: 'up' });
  const flick = Math.sin(lt * 3.1) * 26;
  ink(ctx, [[p.x + 1530, p.y + 616], [p.x + 1630, p.y + 566 + flick], [p.x + 1670, p.y + 626 + flick]], { w: 6, col: C.spot, key: 'whip' });
  caption(ctx, { x: p.x + 40, y: p.y + 40, w: PX(p, 300), text: 'EGITO', size: PX(p, 34), p: seg(lt, .2, .7) });
}

function pharaohPanel(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.ink, line: C.ink, lw: 0, key: 'dark' });
  dots(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * .5, n: 30, col: C.panel, size: 2.6, key: 'dust' });
  // a wall of hieroglyphs behind him
  const r = rng('gl', 0);
  for (let i = 0; i < 22; i++) {
    const gx = p.x + 40 + (i % 6) * 170, gy = p.y + 60 + Math.floor(i / 6) * 150;
    if (r() > .5) ink(ctx, [[gx, gy], [gx + 40, gy]], { w: 5, col: C.spot2, key: 'g' + i });
    else shape(ctx, ellPts(gx + 18, gy, 12, 16, 13), { fill: C.spot2, line: C.ink, w: 3, key: 'g' + i });
  }
  pharaoh(ctx, { x: p.x + p.w / 2, y: p.y + p.h * .46, s: 1.05 });
  // the crowd, at a tenth of his size: that is the whole sentence
  for (let i = 0; i < 9; i++) {
    const fx = p.x + 90 + i * 105, fy = p.y + p.h - 90;
    figure(ctx, { x: fx, y: fy, s: .3, tone: null });
  }
  caption(ctx, { x: p.x + p.w - PX(p, 340) - 36, y: p.y + 36, w: PX(p, 340), text: 'todo menino hebreu ao rio', size: PX(p, 28), p: seg(lt, 3.4, 4.2) });
}

function basket(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'dawn' });
  // far bank and sky
  halftone(ctx, rectPts(p.x, p.y, p.w, p.h * .34), { col: C.spot, dens: 'light', size: 8, op: .30 });
  // water
  box(ctx, { x: p.x, y: p.y + p.h * .34, w: p.w, h: p.h * .66, fill: C.spot2, line: C.ink, lw: 0, key: 'wat' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .34, p.w, p.h * .66), { col: C.ink, dens: 'light', size: 8, op: .30 });
  for (let i = 0; i < 7; i++) {
    const wy = p.y + p.h * .40 + i * 46, ph = Math.sin(lt * 1.2 + i) * 16;
    ink(ctx, [[p.x + 80 + ph, wy], [p.x + 520 + ph, wy - 6], [p.x + 980 + ph, wy + 4]], { w: 4, col: C.panel, key: 'rip' + i });
  }
  ink(ctx, [[p.x, p.y + p.h * .34], [p.x + p.w, p.y + p.h * .34]], { w: 6, key: 'shore' });
  // reeds
  const r = rng('reed', 0);
  for (let i = 0; i < 16; i++) {
    const rx = p.x + 40 + i * 110 + r() * 30, rh = 180 + r() * 190, sw = Math.sin(lt * .9 + i) * 10;
    ink(ctx, [[rx, p.y + p.h * .40], [rx + sw * .5, p.y + p.h * .40 - rh * .6], [rx + sw, p.y + p.h * .40 - rh]], { w: 5, key: 'rd' + i });
    shape(ctx, ellPts(rx + sw, p.y + p.h * .40 - rh - 12, 10, 22, 12), { fill: C.ink, line: C.ink, w: 3, key: 'ph' + i });
  }
  // the basket: woven, with the child in it
  const bx = p.x + 760 - lt * 14, by = p.y + p.h * .70 + Math.sin(lt * 1.6) * 5;
  const hull = [[bx - 96, by - 12], [bx - 76, by + 44], [bx + 76, by + 44], [bx + 96, by - 12]];
  sharp(ctx, hull, { fill: C.panel, line: C.ink, w: 8, key: 'bask' });
  for (let i = -2; i <= 2; i++) ink(ctx, [[bx + i * 34, by - 10], [bx + i * 34, by + 42]], { w: 3, key: 'bw' + i });
  shape(ctx, ellPts(bx, by - 30, 26, 30, 18), { fill: C.panel, line: C.ink, w: 6, key: 'baby' });
  ctx.save(); ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(bx - 9, by - 26, 4, 5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx + 9, by - 26, 4, 5, 0, 0, TAU); ctx.fill(); ctx.restore();
  // the princess and her maid on the near bank
  box(ctx, { x: p.x + p.w - 420, y: p.y + p.h * .34 - 34, w: 420, h: 40, fill: C.panel, line: C.ink, lw: 6, key: 'bk' });
  halftone(ctx, rectPts(p.x + p.w - 420, p.y + p.h * .34 - 34, 420, 40), { col: C.spot, dens: 'light', size: 7, op: .5 });
  figure(ctx, { x: p.x + p.w - 300, y: p.y + p.h * .34 - 40, s: 1.15, tone: C.spot });
  figure(ctx, { x: p.x + p.w - 180, y: p.y + p.h * .34 - 30, s: 1.0, tone: C.spot2 });
  ink(ctx, [[p.x + p.w - 360, p.y + p.h * .34], [p.x + p.w, p.y + p.h * .34]], { w: 7, key: 'bank2' });
  caption(ctx, { x: p.x + 40, y: p.y + 36, w: PX(p, 260), text: 'O NILO', size: PX(p, 32), p: seg(lt, .2, .7) });
}

function desert(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'sky' });
  halftone(ctx, rectPts(p.x, p.y, p.w, p.h), { col: C.spot, dens: 'light', size: 8, op: .28 });
  // a low sun and two dunes: the whole panel is air
  const sun = ellPts(p.x + p.w * .68, p.y + p.h * .62, 150, 150, 36);
  shape(ctx, sun, { fill: C.spot, line: C.ink, w: 6 });
  sharp(ctx, [[p.x, p.y + p.h * .74], [p.x + p.w * .42, p.y + p.h * .64], [p.x + p.w, p.y + p.h * .72], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]],
    { fill: C.panel, line: C.ink, w: 7, key: 'dune' });
  halftone(ctx, [[p.x + p.w * .42, p.y + p.h * .64], [p.x + p.w, p.y + p.h * .72], [p.x + p.w, p.y + p.h], [p.x + p.w * .42, p.y + p.h]],
    { col: C.spot2, dens: 'light', size: 8, op: .5 });
  // one man, walking away, with a long shadow
  const wx = p.x + p.w * .30 + lt * 11;
  sharp(ctx, [[wx + 26, p.y + p.h * .735], [wx + 40, p.y + p.h * .755], [wx + 400, p.y + p.h * .80], [wx + 380, p.y + p.h * .775]],
    { fill: C.spot2, line: C.spot2, w: 0, key: 'shd' });
  halftone(ctx, [[wx + 26, p.y + p.h * .735], [wx + 40, p.y + p.h * .755], [wx + 400, p.y + p.h * .80], [wx + 380, p.y + p.h * .775]],
    { col: C.spot2, dens: 'light', size: 7, op: .5 });
  // a vulture on the thermals: the desert has one other inhabitant
  const vx = p.x + p.w * .58 + Math.sin(lt * .4) * 30, vy = p.y + p.h * .20;
  ink(ctx, [[vx - 46, vy], [vx - 18, vy + 16], [vx, vy + 2], [vx + 18, vy + 16], [vx + 46, vy]], { w: 5, key: 'vult' });
  figure(ctx, { x: wx, y: p.y + p.h * .70, s: 1.1, staff: true, tone: C.spot2 });
  dots(ctx, { x: p.x, y: p.y + p.h * .7, w: p.w, h: p.h * .3, n: 30, col: C.ink, size: 2.4, key: 'sand' });
  caption(ctx, { x: p.x + p.w - PX(p, 330) - 40, y: p.y + 40, w: PX(p, 330), text: 'O DESERTO', size: PX(p, 32), p: seg(lt, .3, .9) });
}

function bush(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.ink, line: C.ink, lw: 0, key: 'night' });
  dots(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * .62, n: 48, col: C.panel, size: 2.2, key: 'stars' });
  const cx = p.x + p.w * .54, cy = p.y + p.h * .56;
  const flick = Math.sin(lt * 6.4) * 9 + Math.sin(lt * 2.7) * 7;
  const hz = p.y + p.h * .88;
  // branches in paper white: on a black page the ink is the negative
  for (let i = 0; i < 15; i++) {
    const a = -Math.PI * .95 + (i / 14) * Math.PI * .9, len = 190 + (i % 4) * 52;
    ink(ctx, [[cx, cy + 150], [cx + Math.cos(a) * len * .6, cy + 130 + Math.sin(a) * len * .44],
      [cx + Math.cos(a) * len, cy + 96 + Math.sin(a) * len * .74]], { w: 6, col: C.panel, key: 'br' + i });
  }
  // fire: three tongues, red plate + paper core, halftone on the shadow side only
  const tongue = (tx, ty, tw, th, k = 1, d = 0) => {
    const P = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU, c = Math.cos(a), sn = Math.sin(a);
      const pinch = sn < 0 ? 1 - .80 * (-sn) : .96;
      P.push([tx + c * tw * pinch * k, ty + sn * th * (sn < 0 ? 1.55 : .92) * k + d]);
    }
    return P;
  };
  const F = [
    tongue(cx - 96, cy + 34, 132, 118, 1, flick * .3),
    tongue(cx + 94, cy + 30, 136, 126, 1, flick * .22),
    tongue(cx, cy - 6, 168, 158, 1, flick * .5),
  ];
  for (const t of F) shape(ctx, t, { fill: C.spot, line: C.ink, w: 9 });
  const core = [
    tongue(cx - 92, cy + 60, 62, 64, 1, flick * .3),
    tongue(cx + 90, cy + 56, 64, 68, 1, flick * .22),
    tongue(cx, cy + 24, 80, 92, 1, flick * .5),
  ];
  for (const t of core) shape(ctx, t, { fill: C.panel, line: C.spot, w: 4 });
  // rays, kept clear of the flames
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + .1, r0 = 300, r1 = 340 + (i % 3) * 60;
    ink(ctx, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .8], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * .8]],
      { w: i % 2 ? 4 : 6, col: C.panel, key: 'ray' + i });
  }
  // the ground, and Moses barefoot at the foot of it
  ink(ctx, [[p.x + 40, hz], [p.x + p.w - 40, hz]], { w: 6, col: C.panel, key: 'gnd' });
  figure(ctx, { x: p.x + p.w * .22, y: p.y + p.h * .72, s: 1.0, staff: true, arms: 'up', tone: C.panel, line: C.panel });
  // the voice: a spiky balloon, the one shape on the page that is not round
  const k = seg(lt, 1.2, 1.9);
  if (k > .01) {
    const bw = PX(p, 500), bh = PX(p, 146), bx0 = p.x + 40, by0 = p.y + 40;
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU, rr = i % 2 ? 1 : 1.14;
      pts.push([bx0 + bw / 2 + Math.cos(a) * bw / 2 * rr * (0.6 + 0.4 * k), by0 + bh / 2 + Math.sin(a) * bh / 2 * rr * (0.6 + 0.4 * k)]);
    }
    sharp(ctx, pts, { fill: C.panel, line: C.ink, w: 6, key: 'shout' });
    ctx.save();
    ctx.fillStyle = C.ink; ctx.font = `${PX(p, 40)}px Bebas`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EU SOU O QUE SOU', bx0 + bw / 2, by0 + bh / 2);
    ctx.restore();
  }
}


function confront(ctx, lt, bp, p) {
  const mid = p.x + p.w / 2;
  box(ctx, { x: p.x, y: p.y, w: p.w / 2, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'l' });
  box(ctx, { x: mid, y: p.y, w: p.w / 2, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'r' });
  halftone(ctx, rectPts(p.x, p.y, p.w / 2, p.h), { col: C.spot2, dens: 'light', size: 8, op: .40 });
  halftone(ctx, rectPts(mid, p.y, p.w / 2, p.h), { col: C.spot, dens: 'light', size: 8, op: .28 });
  // left: the pharaoh, seated, staff across his knees
  pharaoh(ctx, { x: p.x + p.w * .25, y: p.y + p.h * .50, s: .78 });
  // right: Moses, staff raised
  figure(ctx, { x: mid + p.w * .25, y: p.y + p.h * .52, s: 1.9, staff: true, arms: 'up', tone: C.spot });
  shape(ctx, rectPts(mid - 26, p.y, 52, p.h), { fill: C.ink, line: C.ink, w: 0, key: 'gut' });
  balloon(ctx, { x: mid + 60, y: p.y + 40, w: PX(p, 470), h: PX(p, 132), tail: [mid + p.w * .25, p.y + p.h * .36],
    text: 'deixa o meu povo ir', size: PX(p, 36), p: seg(lt, .8, 1.4), key: 'say' });
  caption(ctx, { x: mid + 60, y: p.y + p.h - PX(p, 120), w: PX(p, 330), text: 'e ele recusa', size: PX(p, 30), p: seg(lt, 3.6, 4.2) });
  caption(ctx, { x: p.x + 40, y: p.y + 40, w: PX(p, 300), text: 'O EGITO', size: PX(p, 30), p: seg(lt, .2, .6) });
}

function blood(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'bank' });
  halftone(ctx, rectPts(p.x, p.y, p.w, p.h * .40), { col: C.spot2, dens: 'light', size: 8, op: .35 });
  // the river, filling with the red plate from the left
  const fillW = p.w * ease(clamp(lt / 2.2));
  box(ctx, { x: p.x, y: p.y + p.h * .40, w: fillW, h: p.h * .74, fill: C.spot, line: C.ink, lw: 0, key: 'red' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .40, fillW, p.h * .74), { col: C.ink, dens: 'mid', size: 7, op: .35 });
  ink(ctx, [[p.x, p.y + p.h * .40], [p.x + p.w, p.y + p.h * .40]], { w: 8, key: 'sh' });
  for (let i = 0; i < 5; i++) {
    const fx = p.x + 180 + i * 300, fy = p.y + p.h * .58 + (i % 2) * 46;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(.42 + i * .06);
    shape(ctx, ellPts(0, 0, 84, 42, 22), { fill: C.panel, line: C.ink, w: 7, key: 'fish' + i });
    sharp(ctx, [[-84, -28], [-128, 4], [-84, 6]], { fill: C.panel, line: C.ink, w: 6, key: 'tail' + i });
    ink(ctx, [[30, 30], [56, 56]], { w: 6, key: 'fin' + i });       // the fin that no longer moves
    ink(ctx, [[46, -30], [46, 26]], { w: 5, key: 'gill' + i });     // and the gill, open
    ctx.restore();
    ctx.save(); ctx.fillStyle = C.panel;
    ctx.beginPath(); ctx.arc(fx + 46, fy - 8, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(fx + 46, fy - 8, 4.5, 0, TAU); ctx.fill(); ctx.restore();
  }
  figure(ctx, { x: p.x + p.w - 220, y: p.y + p.h * .40 - 158, s: 1.2, tone: C.spot2, arms: 'up' });
  sfx(ctx, { text: 'SANGUE', x: p.x + p.w * .52, y: p.y + p.h * .46, size: PX(p, 150), rot: -.05, p: seg(lt, 2.4, 3.0) });
  caption(ctx, { x: p.x + 40, y: p.y + 36, w: PX(p, 360), text: 'a primeira praga', size: PX(p, 28), p: seg(lt, .3, .9) });
}

// eight stamps, each one a plague: the grid is the list the narration reads.
function plagueGlyph(ctx, kind, cx, cy, s) {
  // everything is drawn in units of 100 and scaled by s, so the six plates keep one drawing weight
  const pt = ([x, y]) => [cx + x * s, cy + y * s];
  const L = (A, B, w = 8) => ink(ctx, [pt(A), pt(B)], { w: w * s, key: kind + A + B });
  const P = (pts, o = {}) => shape(ctx, pts.map(pt), { fill: C.panel, line: C.ink, w: 7 * s, key: kind + 'p', ...o });
  const dot = (x, y, r, fill = C.ink) => { ctx.save(); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, r * s, 0, TAU); ctx.fill(); ctx.restore(); };
  const ell = (x, y, rx, ry, n = 20) => ellPts(cx + x * s, cy + y * s, rx * s, ry * s, n);

  if (kind === 'ran') {                            // frog: the riddle of the second plague
    L([-74, 46], [-116, 96], 9); L([-52, 56], [-66, 104], 9);
    L([74, 46], [116, 96], 9); L([52, 56], [66, 104], 9);
    shape(ctx, ell(0, 16, 96, 58, 26), { fill: C.panel, line: C.ink, w: 7 * s, key: 'kran' });
    shape(ctx, ell(-44, -44, 30, 28, 18), { fill: C.panel, line: C.ink, w: 7 * s, key: 'ke1' });
    shape(ctx, ell(44, -44, 30, 28, 18), { fill: C.panel, line: C.ink, w: 7 * s, key: 'ke2' });
    dot(-44, -46, 9); dot(44, -46, 9);
    L([-44, 8], [44, 8], 7);                       // the flat mouth: no smile
  } else if (kind === 'piolho') {                  // lice: small, many, everywhere
    for (const [bx, by, a0] of [[-56, -34, -.4], [10, 26, .5], [56, -40, 2.4]]) {
      shape(ctx, ell(bx, by, 26, 15, 14), { fill: C.ink, line: C.ink, w: 4 * s, key: 'kl' + bx });
      for (let i = 0; i < 4; i++) {
        const t = -18 + i * 12, sw = Math.cos(a0) * 22, sh = Math.sin(a0) * 22;
        L([bx + t, by + 12], [bx + t + sw, by + 26 + sh], 4);
        L([bx + t, by - 12], [bx + t + sw, by - 26 - sh], 4);
      }
      L([bx + 24, by - 4], [bx + 44, by - 18], 4); L([bx + 24, by + 4], [bx + 46, by + 14], 4);
    }
  } else if (kind === 'mosca') {                   // flies: a fat body and two plates of wing
    for (let i = 0; i < 4; i++) L([-6, 24 + i * 12], [-40 - i * 6, 46 + i * 10], 5);
    shape(ctx, ell(0, 6, 26, 56, 22), { fill: C.ink, line: C.ink, w: 4 * s, key: 'kmos' });
    shape(ctx, ell(-52, -30, 44, 20, 16), { fill: C.panel, line: C.ink, w: 6 * s, key: 'kw1' });
    shape(ctx, ell(52, -30, 44, 20, 16), { fill: C.panel, line: C.ink, w: 6 * s, key: 'kw2' });
    dot(-14, -44, 7); dot(14, -44, 7);
  } else if (kind === 'gado') {                    // the cattle: an ox head, horns and all
    L([-62, -46], [-104, -96], 12); L([-96, -96], [-72, -84], 10);
    L([62, -46], [104, -96], 12); L([96, -96], [72, -84], 10);
    P([[-70, 44], [-60, -30], [-24, -58], [24, -58], [60, -30], [70, 44], [40, 74], [-40, 74]], { key: 'kgd' });
    P([[-42, 66], [42, 66], [54, 108], [-54, 108]], { key: 'kmz' });
    dot(-30, -14, 9); dot(30, -14, 9);
    dot(-18, 88, 6); dot(18, 88, 6);
  } else if (kind === 'ferida') {                  // boils: blisters on a plate of skin
    P([[-96, -80], [96, -80], [96, 80], [-96, 80]], { key: 'kskin' });
    for (const [bx, by, r] of [[-48, -34, 30], [22, -44, 22], [56, 26, 26], [-22, 36, 20], [-74, 50, 14]]) {
      shape(ctx, ell(bx, by, r, r * .86, 16), { fill: C.spot, line: C.ink, w: 6 * s, key: 'kb' + bx });
      dot(bx - r * .2, by - r * .2, r * .26, C.ink);
    }
  } else {                                          // hail: it comes down at an angle
    for (let i = 0; i < 12; i++) {
      const hx = -86 + (i % 4) * 58, hy = -76 + Math.floor(i / 4) * 74;
      L([hx + 22, hy - 30], [hx - 6, hy + 6], 6);
      dot(hx, hy + 20, 11);
    }
  }
}

function plagues(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'bg' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .52, p.w, p.h * .48), { col: C.spot2, dens: 'light', size: 8, op: .30 });
  // a plate per plague: the story lists them, the page shows them
  const kinds = ['ran', 'piolho', 'mosca', 'gado', 'ferida', 'granizo'];
  const bw = 380, bh = 306, gx = 34, gy = 26, x0 = p.x + 58, y0 = p.y + 190;
  kinds.forEach((kind, i) => {
    const cx = x0 + (i % 3) * (bw + gx), cy = y0 + Math.floor(i / 3) * (bh + gy);
    const k = seg(lt, .1 + i * .85, .45 + i * .85);
    if (k <= .01) return;
    ctx.save();
    ctx.globalAlpha = clamp(k * 1.6);
    ctx.translate(cx + bw / 2, cy + bh / 2); ctx.scale(.86 + .14 * easeOut(k), .86 + .14 * easeOut(k)); ctx.translate(-bw / 2, -bh / 2);
    box(ctx, { x: 0, y: 0, w: bw, h: bh, r: 4, fill: C.panel, line: C.ink, lw: 6, key: 'pc' + i });
    plagueGlyph(ctx, kind, bw / 2, bh / 2, bh / 300);
    ctx.restore();
  });
  caption(ctx, { x: p.x + 44, y: p.y + 40, w: PX(p, 330), text: 'AS PRAGAS', size: PX(p, 32), p: seg(lt, .2, .6) });
}


function darkness(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.ink, line: C.ink, lw: 0, key: 'dark' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .52, p.w, p.h * .48), { col: C.spot2, dens: 'light', size: 9, op: .45 });
  // a door, shut, in a panel where nothing else can be seen
  const dh = 500, dw = 290, dx = p.x + (p.w - dw) / 2, dy = p.y + p.h - dh - 80;
  box(ctx, { x: dx, y: dy, w: dw, h: dh, fill: C.ink, line: C.panel, lw: 6, key: 'door' });
  ink(ctx, [[dx + 12, dy + dh - 6], [dx + dw - 12, dy + dh - 6]], { w: 14, col: C.panel, key: 'sill' });
  ink(ctx, [[dx + dw - 54, dy + dh * .5], [dx + dw - 54, dy + dh * .5 + 44]], { w: 8, col: C.spot, key: 'latch' });
  // the sliver of light that still gets under it
  const glow = ease(seg(lt, .5, 2.2));
  if (glow > .01) {
    const k = glow, mid = dx + dw / 2;
    shape(ctx, [[mid - (dw / 2 - 16) * k, dy + dh - 1], [mid + (dw / 2 - 16) * k, dy + dh - 1],
      [mid + (dw / 2 - 4) * k, dy + dh + 22], [mid - (dw / 2 - 4) * k, dy + dh + 22]],
      { fill: C.panel, line: C.panel, w: 0, key: 'leak' });
  }
  // a man feeling his way along the wall
  figure(ctx, { x: dx + dw + 132, y: dy + dh - 196, s: 1.5, arms: 'down', tone: C.panel, line: C.panel });
  caption(ctx, { x: p.x + 40, y: p.y + 40, w: PX(p, 300), text: 'TRÊS DIAS', size: PX(p, 30), p: seg(lt, .2, .7) });
}


function departure(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.spot2, line: C.ink, lw: 0, key: 'night' });
  dots(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * .4, n: 30, col: C.panel, size: 2.6, key: 'st' });
  // moon
  const moon = ellPts(p.x + p.w - 240, p.y + 150, 90, 90, 30);
  shape(ctx, moon, { fill: C.panel, line: C.ink, w: 6 });
  halftone(ctx, moon, { col: C.spot2, dens: 'light', size: 7, op: .45 });
  // ground
  ink(ctx, [[p.x, p.y + p.h * .74], [p.x + p.w, p.y + p.h * .72]], { w: 8, key: 'gnd' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .74, p.w, p.h * .26), { col: C.ink, dens: 'light', size: 8, op: .3 });
  // the door with the sign, in the foreground: the blood on the posts
  const dx = p.x + 90, dh = 330;
  box(ctx, { x: dx, y: p.y + p.h - dh, w: 240, h: dh, fill: C.panel, line: C.ink, lw: 7, key: 'door2' });
  ink(ctx, [[dx + 14, p.y + p.h - dh + 18], [dx + 14, p.y + p.h - 20]], { w: 16, col: C.spot, key: 'post1' });
  ink(ctx, [[dx + 226, p.y + p.h - dh + 18], [dx + 226, p.y + p.h - 20]], { w: 16, col: C.spot, key: 'post2' });
  ink(ctx, [[dx + 14, p.y + p.h - dh + 18], [dx + 226, p.y + p.h - dh + 18]], { w: 16, col: C.spot, key: 'lintel' });
  // the crowd, walking out
  const walk = (lt * 30) % 120;
  for (let i = 0; i < 8; i++) {
    figure(ctx, { x: p.x + 430 + i * 170 + walk, y: p.y + p.h * .60 - (i % 2) * 14, s: .78, load: i % 3 === 0 ? 1 : 0, tone: i % 2 ? C.spot : null });
  }
  caption(ctx, { x: p.x + p.w - PX(p, 380) - 40, y: p.y + 40, w: PX(p, 380), text: 'e o povo sai', size: PX(p, 30), p: seg(lt, 2.4, 3.0) });
}

function chariots(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.panel, line: C.ink, lw: 0, key: 'sky' });
  halftone(ctx, rectPts(p.x, p.y + p.h * .62, p.w, p.h * .38), { col: C.spot, dens: 'light', size: 8, op: .45 });
  ink(ctx, [[p.x, p.y + p.h * .72], [p.x + p.w, p.y + p.h * .70]], { w: 8, key: 'gnd' });
  // three chariots, coming from the right
  const adv = ease(clamp(lt / 6)) * 260;
  for (let i = 0; i < 3; i++) {
    const bx = p.x + p.w - 380 - i * 430 + adv, by = p.y + p.h * .70 - i * 8, s = 1.1 + i * .06;
    // horse: rump, barrel, chest; then a neck that reaches forward and a long head
    shape(ctx, [[bx - 300 * s, by - 96 * s], [bx - 236 * s, by - 128 * s], [bx - 140 * s, by - 122 * s], [bx - 82 * s, by - 88 * s],
      [bx - 54 * s, by - 34 * s], [bx - 96 * s, by + 4 * s], [bx - 280 * s, by + 6 * s]],
      { fill: C.spot2, line: C.ink, w: 7 * s, key: 'hs' + i });
    shape(ctx, [[bx - 90 * s, by - 100 * s], [bx - 34 * s, by - 168 * s], [bx + 34 * s, by - 184 * s], [bx + 62 * s, by - 164 * s],
      [bx + 6 * s, by - 128 * s], [bx - 38 * s, by - 62 * s]],
      { fill: C.spot2, line: C.ink, w: 7 * s, key: 'hd' + i });
    ink(ctx, [[bx - 96 * s, by - 112 * s], [bx - 62 * s, by - 146 * s], [bx - 40 * s, by - 166 * s]], { w: 5 * s, col: C.spot, key: 'mane' + i });
    ink(ctx, [[bx + 30 * s, by - 186 * s], [bx + 40 * s, by - 214 * s]], { w: 5 * s, key: 'ear' + i });
    ink(ctx, [[bx - 296 * s, by - 102 * s], [bx - 348 * s, by - 62 * s], [bx - 326 * s, by - 10 * s]], { w: 7 * s, key: 'tail' + i });
    // four legs, the far pair thinner
    ink(ctx, [[bx - 246 * s, by + 2 * s], [bx - 258 * s, by + 100 * s]], { w: 7 * s, key: 'hf1' + i });
    ink(ctx, [[bx - 152 * s, by + 2 * s], [bx - 140 * s, by + 100 * s]], { w: 7 * s, key: 'hf2' + i });
    ink(ctx, [[bx - 280 * s, by + 2 * s], [bx - 288 * s, by + 96 * s]], { w: 13 * s, key: 'hl1' + i });
    ink(ctx, [[bx - 112 * s, by + 2 * s], [bx - 100 * s, by + 96 * s]], { w: 13 * s, key: 'hl2' + i });
    // chariot and wheel
    sharp(ctx, [[bx - 30 * s, by - 40 * s], [bx + 90 * s, by - 40 * s], [bx + 80 * s, by + 40 * s], [bx - 20 * s, by + 40 * s]],
      { fill: C.panel, line: C.ink, w: 8 * s, key: 'ch' + i });
    const wheel = (wx) => {
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 8 * s;
      ctx.beginPath(); ctx.arc(wx, by + 60 * s, 44 * s, 0, TAU); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + lt * .6;
        ink(ctx, [[wx, by + 60 * s], [wx + Math.cos(a) * 42 * s, by + 60 * s + Math.sin(a) * 42 * s]], { w: 4 * s, key: 'sp' + i + k });
      }
      ctx.restore();
    };
    wheel(bx + 50 * s);
    // rider
    figure(ctx, { x: bx + 30 * s, y: by - 96 * s, s: .55, tone: C.spot });
  }
  speedLines(ctx, { x: p.x + 40, y: p.y + p.h * .8, w: p.w * .6, h: 120, n: 18, col: C.ink, op: .35, ang: .02, len: 1 });
  sfx(ctx, { text: 'GALOPE', x: p.x + 300, y: p.y + 260, size: PX(p, 130), rot: -.06, p: seg(lt, 1.4, 2.0) });
}

function sea(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.ink, line: C.ink, lw: 0, key: 'night' });
  dots(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * .55, n: 40, col: C.panel, size: 2.3, key: 'st' });
  const base = p.y + p.h, hz = p.y + p.h * .50, mid = p.x + p.w / 2;
  const rise = ease(clamp(lt / 3.2));
  const inner = p.w * .30, innerT = 58;
  // the walls: two quads in perspective, running to the horizon
  const walls = [
    { A: [p.x + inner, base], B: [p.x, base], C: [p.x, hz - 200 * rise], D: [mid - innerT, hz], side: -1 },
    { A: [p.x + p.w - inner, base], B: [p.x + p.w, base], C: [p.x + p.w, hz - 200 * rise], D: [mid + innerT, hz], side: 1 },
  ];
  // the dry path first, so the water closes onto it
  sharp(ctx, [[p.x + inner, base], [p.x + p.w - inner, base], [mid + innerT, hz], [mid - innerT, hz]],
    { fill: C.panel, line: C.ink, w: 8, key: 'path' });
  halftone(ctx, [[p.x + inner, base], [p.x + p.w - inner, base], [mid + innerT, hz], [mid - innerT, hz]],
    { col: C.spot2, dens: 'light', size: 8, op: .28 });
  for (const w of walls) {
    const P = [w.A, w.B, w.C, w.D];
    sharp(ctx, P, { fill: C.spot2, line: C.ink, w: 9, key: 'wl' + w.side });
    halftone(ctx, P, { col: C.ink, dens: 'mid', size: 7, op: .40 });
    // ripples: nested quads, so they converge with the wall
    for (let i = 1; i < 8; i++) {
      const t = i / 8, wob = Math.sin(lt * 1.4 + i + w.side) * 10;
      const o = [lerp(w.B[0], w.C[0], t), lerp(w.B[1], w.C[1], t) + wob];
      const n = [lerp(w.A[0], w.D[0], t), lerp(w.A[1], w.D[1], t) + wob];
      ink(ctx, [[o[0] + (w.side < 0 ? 20 : -20), o[1]], [n[0] - (w.side < 0 ? 18 : -18), n[1]]], { w: 5, col: C.panel, key: 'rip' + i + w.side });
    }
    // foam along the top edge, scalloped
    const sc = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      sc.push([lerp(w.C[0], w.D[0], t), lerp(w.C[1], w.D[1], t) + (i % 2 ? -14 : 10)]);
    }
    ink(ctx, sc, { w: 7, col: C.panel, key: 'foam' + w.side });
  }
  // spray between the walls
  const r = rng('spray', 0);
  for (let i = 0; i < 26; i++) {
    const t = r(), sx = lerp(mid - innerT, p.x + inner, t), sy = lerp(hz, base - 40, r());
    ctx.save(); ctx.fillStyle = C.panel;
    ctx.beginPath(); ctx.arc(sx + (i % 2 ? -1 : 1) * r() * 40, sy, 2 + r() * 3, 0, TAU); ctx.fill(); ctx.restore();
  }
  // the people on the path: every pair of feet lands on it, every figure is smaller than the last
  const walk = ((lt * 40) % 150) / 150;
  const pathY = (t) => lerp(base - 16, hz + 10, t);
  for (let i = 0; i < 8; i++) {
    const t = .06 + i * .108 + walk * .025;
    const s2 = lerp(1.0, .30, t);
    const xOff = (i % 2 ? 1 : -1) * lerp(inner * .55, 6, t);
    figure(ctx, { x: mid + xOff, y: pathY(t) - 150 * s2, s: s2, load: i % 3 === 0 ? 1 : 0, tone: i % 2 ? C.spot : C.panel });
  }
  // Moses at the near bank, staff up over the water
  figure(ctx, { x: p.x + 250, y: base - 16 - 150 * 1.6, s: 1.6, staff: true, arms: 'up', tone: C.spot });
  caption(ctx, { x: p.x + 40, y: p.y + 40, w: PX(p, 300), text: 'O MAR', size: PX(p, 32), p: seg(lt, .3, .8) });
}


function cross(ctx, lt, bp, p) {
  box(ctx, { x: p.x, y: p.y, w: p.w, h: p.h, fill: C.ink, line: C.ink, lw: 0, key: 'night' });
  dots(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * .52, n: 42, col: C.panel, size: 2.3, key: 'st' });
  const base = p.y + p.h, shore = p.y + p.h * .74;
  // the sea comes back up behind them, as a band that rises
  const rise = ease(clamp((lt - .3) / 3.2));
  const top = shore - p.h * .46 * rise;
  if (rise > .01) {
    box(ctx, { x: p.x, y: top, w: p.w, h: shore - top, fill: C.spot2, line: C.ink, lw: 0, key: 'sea' });
    halftone(ctx, rectPts(p.x, top, p.w, shore - top), { col: C.ink, dens: 'mid', size: 7, op: .40 });
    // the crest, scalloped and moving
    const sc = [];
    for (let i = 0; i <= 16; i++) sc.push([p.x + (p.w / 16) * i, top + Math.sin(i * 1.7 + lt * 2) * 12 + (i % 2 ? -12 : 8)]);
    ink(ctx, sc, { w: 8, col: C.panel, key: 'crest' });
    // foam lines, and the spray of the crossing
    for (let i = 1; i < 5; i++) {
      const yy = top + (shore - top) * (i / 5), wob = Math.sin(lt * 1.6 + i) * 10;
      ink(ctx, [[p.x + 40, yy], [p.x + p.w * .45, yy + wob], [p.x + p.w - 40, yy + 8]], { w: 5, col: C.panel, key: 'rip' + i });
    }
    for (let i = 0; i < 12; i++) {
      const t = i / 11, sx = p.x + p.w * (.30 + .40 * t), hh = 30 + (i % 4) * 26 * rise;
      ink(ctx, [[sx, top + 12], [sx + (t - .5) * 70, top - hh]], { w: i % 2 ? 6 : 4, col: C.panel, key: 'sp' + i });
      if (i % 3 === 0) {
        ctx.save(); ctx.fillStyle = C.panel;
        ctx.beginPath(); ctx.arc(sx + (t - .5) * 84, top - hh - 10, 5, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    // the water still moving: short ticks all over the plate
    const rt = rng('ticks', 0);
    for (let i = 0; i < 30; i++) {
      const tx = p.x + 40 + rt() * (p.w - 80), ty = top + 34 + rt() * (shore - top - 60);
      ink(ctx, [[tx, ty], [tx + 24 + rt() * 14, ty + 4]], { w: 4, col: C.panel, key: 'tk' + i });
    }
    // what went under: a wheel, half swallowed
    const wxx = p.x + p.w * .62, wyy = top + 26;
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(wxx, wyy, 56, .05 * Math.PI, .95 * Math.PI); ctx.stroke(); ctx.restore();
    for (let k2 = 0; k2 < 4; k2++) {
      const a3 = .16 + k2 * .22;
      ink(ctx, [[wxx, wyy], [wxx + Math.cos(Math.PI * a3) * 52, wyy + Math.sin(Math.PI * a3) * 52]], { w: 6, col: C.ink, key: 'spk' + k2 });
    }
  }
  // the far shore, where they are already walking
  sharp(ctx, [[p.x, shore + 26], [p.x + p.w * .5, shore], [p.x + p.w, shore + 20], [p.x + p.w, base], [p.x, base]],
    { fill: C.panel, line: C.ink, w: 8, key: 'shore' });
  halftone(ctx, rectPts(p.x, shore + 26, p.w, base - shore - 26), { col: C.spot2, dens: 'light', size: 8, op: .30 });
  const walk = (lt * 26) % 110;
  for (let i = 0; i < 9; i++) {
    figure(ctx, { x: p.x + 120 + i * 150 + walk, y: shore + 34, s: .66, load: i % 3 === 0 ? 1 : 0, tone: i % 2 ? C.spot : null });
  }
  caption(ctx, { x: p.x + p.w - PX(p, 400) - 40, y: p.y + 40, w: PX(p, 400), text: 'do outro lado, a liberdade', size: PX(p, 32), p: seg(lt, 6.5, 7.5) });
}

// ---------------------------------------------------------------- shots ----
const RECTS = {
  egypt: R(60, 60, 1720, 860),
  pharaoh: R(60, 60, 1100, 860),
  basket: R(60, 60, 1720, 760),
  desert: R(60, 60, 1240, 860),
  bush: R(60, 60, 1000, 860),
  confront: R(60, 60, 1760, 880),
  blood: R(60, 60, 1720, 760),
  plagues: R(60, 60, 1320, 860),
  darkness: R(60, 60, 1000, 860),
  departure: R(60, 60, 1720, 700),
  chariots: R(60, 60, 1520, 760),
  sea: R(60, 60, 1760, 880),
  cross: R(60, 60, 1760, 880),
};
const DRAW = { egypt, pharaoh: pharaohPanel, basket, desert, bush, confront, blood, plagues, darkness, departure, chariots, sea, cross };

const shots = TL.panels.map((row) => {
  const p = RECTS[row.panel];
  const span = row.end - row.start;
  return {
    id: row.panel,
    start: row.start,
    end: row.end,
    beats: [{ a: 0, b: span, panel: p, draw: (ctx, lt, bp) => DRAW[row.panel](ctx, lt, bp, p) }],
  };
});

export { shots };
export default shots;
