// The extract, drawn as a comic: three pages, nine panels, one panel per beat.
//
// Two coordinate systems, and it matters:
//   · shapes are placed in PAGE units, relative to the panel rect (so a panel is composed like a page);
//   · type, balloons and captions are placed in SCREEN pixels and divided by the framing zoom (PX),
//     so lettering is the same size on screen whether it sits in a wide strip or a tall panel.
import {
  C, W, H, TAU, clamp, lerp, ease, easeOut, seg, hash, rng, seed, through, ellPts, rectPts, rrPts,
  blobPts, arcPts, ink, shape, sharp, box, halftone, path, balloon, caption, sfx, speedLines, impact, dots,
  camFor,
} from '../engine/comic.mjs';

const PX = (p, n) => n / camFor(p).zoom;      // screen pixels -> page units

// ---------------------------------------------------------------- props ----
function mars(ctx, { x, y, r }) {
  const P = blobPts(x, y, r, 7, .028, 64);
  shape(ctx, P, { fill: C.spot, line: C.ink, w: 7 });
  halftone(ctx, P, { col: C.ink, dens: 'mid', size: 7, angle: Math.PI / 3, op: .34,
    clip: { x, y: y - r, w: r, h: r * 2 } });
  const rr = rng('cr' + Math.round(r), 0);
  for (let i = 0; i < 5; i++) {
    const a = -.6 + rr() * 4.2, d = rr() * r * .6, cr = r * (.09 + rr() * .09);
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * .9;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU);
    ctx.fillStyle = C.ink; ctx.globalAlpha = .32; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.restore();
  }
}

// The probe: a boxy spacecraft — body, two solar wings with cell lines, a dish, one thruster.
function probe(ctx, { x, y, s = 1, rot = 0, tone = C.spot2 }) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  // wings first, so the body sits on top of them
  for (const sx of [-1, 1]) {
    const wx = sx > 0 ? 62 : -236;
    sharp(ctx, [[wx, -52], [wx + 174, -52], [wx + 174, 52], [wx, 52]], { fill: C.panel, line: C.ink, w: 8, key: 'wing' + sx });
    halftone(ctx, [[wx, -52], [wx + 174, -52], [wx + 174, 52], [wx, 52]], { col: tone, dens: 'mid', size: 7, op: .8 });
    for (let i = 1; i < 5; i++) ink(ctx, [[wx + i * 35, -50], [wx + i * 35, 50]], { w: 4, key: 'wl' + sx + i });
    ink(ctx, [[wx, 0], [wx + 174, 0]], { w: 4, key: 'wm' + sx });
  }
  // body
  sharp(ctx, [[-64, -66], [64, -66], [64, 66], [-64, 66]], { fill: C.panel, line: C.ink, w: 10, key: 'body' });
  halftone(ctx, [[-64, -66], [64, -66], [64, 66], [-64, 66]], { col: tone, dens: 'mid', size: 7, op: .9,
    clip: { x: 6, y: -200, w: 200, h: 400 } });
  ink(ctx, [[-64, -18], [64, -18]], { w: 6, key: 'seam1' });
  ink(ctx, [[-64, 30], [64, 30]], { w: 6, key: 'seam2' });
  // dish on a mast, above the body
  ink(ctx, [[0, -66], [0, -96]], { w: 8, key: 'mast' });
  sharp(ctx, [[-54, -112], [-38, -152], [38, -152], [54, -112], [20, -104], [-20, -104]],
    { fill: C.panel, line: C.ink, w: 7, key: 'dish' });
  ink(ctx, [[-40, -126], [40, -126]], { w: 4, key: 'rim' });
  ink(ctx, [[0, -152], [-14, -186]], { w: 5, key: 'feed' });
  // thruster
  sharp(ctx, [[-16, 66], [16, 66], [10, 84], [-10, 84]], { fill: C.spot, line: C.ink, w: 5, key: 'thr' });
  ctx.restore();
}

function rocketSmall(ctx, { x, y, s = 1, rot = -.6, flame = 1, col = C.spot }) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (flame > 0) {
    const f = 74 * flame * (.75 + .25 * Math.sin(x * .05));
    shape(ctx, [[-18, 52], [0, 52 + f], [18, 52]], { fill: col, line: C.ink, w: 5, key: 'rfl' });
  }
  shape(ctx, through([[0, -76], [26, -34], [26, 40], [0, 54], [-26, 40], [-26, -34]], 5),
    { fill: C.panel, line: C.ink, w: 7, key: 'rb' });
  shape(ctx, ellPts(0, -22, 9, 9, 14), { fill: C.spot2, line: C.ink, w: 4, key: 'rw' });
  shape(ctx, through([[-26, 14], [-58, 54], [-26, 44]], 4), { fill: col, line: C.ink, w: 5, key: 'rf1' });
  shape(ctx, through([[26, 14], [58, 54], [26, 44]], 4), { fill: col, line: C.ink, w: 5, key: 'rf2' });
  ctx.restore();
}

// A person, front on, cropped by the panel: flat plate, ink, halftone on one side. The face is a
// symbol — two eyes, two brows, one mouth.
function person(ctx, o) {
  const { x, y, s = 1, tone = C.spot2, arms = 'up' } = o;
  const sh = (a, b) => [x + a * s, y + b * s];
  const body = [sh(-178, 680), sh(-178, 168), sh(-152, 116), sh(-72, 74), sh(0, 88), sh(72, 74), sh(152, 116), sh(178, 168), sh(178, 680)];
  sharp(ctx, body, { fill: C.panel, line: C.ink, w: 8 * s, key: 'bd' + Math.round(x) });
  halftone(ctx, body, { col: tone, dens: 'mid', size: 7, op: .95,
    clip: { x: x - 400 * s, y: y - 400 * s, w: 400 * s + 60 * s, h: 900 * s } });
  ink(ctx, [sh(-56, 76), sh(0, 132), sh(56, 76)], { w: 7 * s, key: 'cl' });
  ink(ctx, [sh(-96, 112), sh(0, 220), sh(96, 112)], { w: 4 * s, key: 'lapel' });
  shape(ctx, rectPts(x - 27 * s, y + 18 * s, 54 * s, 44 * s, 2), { fill: C.panel, line: C.ink, w: 6 * s, key: 'nk' });
  const head = ellPts(x, y - 24 * s, 64 * s, 74 * s, 30);
  shape(ctx, head, { fill: C.panel, line: C.ink, w: 8 * s, key: 'hd' });
  halftone(ctx, head, { col: tone, dens: 'light', size: 6, op: .5,
    clip: { x: x - 200 * s, y: y - 200 * s, w: 200 * s, h: 400 * s } });
  shape(ctx, through([sh(-66, -14), sh(-58, -70), sh(0, -96), sh(58, -70), sh(66, -14),
    sh(44, -34), sh(0, -46), sh(-46, -30)], 5), { fill: C.ink, line: C.ink, w: 4 * s, key: 'hr' });
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(x + sx * 26 * s, y - 16 * s, 8 * s, 10.5 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ink(ctx, [sh(-15, 30), [x, y + 30.5 * s], sh(15, 30)], { w: 5 * s, key: 'mo' });
  if (arms === 'up') {
    for (const sx of [-1, 1]) {
      const el = sh(sx * 172, 104), hd = sh(sx * 240, -34);
      ink(ctx, [sh(sx * 120, 128), el], { w: 24 * s, key: 'ua' + sx });
      ink(ctx, [el, hd], { w: 19 * s, key: 'fa' + sx });
      shape(ctx, ellPts(hd[0] + sx * 6 * s, hd[1] - 6 * s, 15 * s, 13 * s, 12), { fill: C.panel, line: C.ink, w: 6 * s, key: 'hh' + sx });
      ink(ctx, [sh(sx * 150, 112), sh(sx * 158, 96)], { w: 6 * s, key: 'cuff' + sx });
    }
  }
}

// ---------------------------------------------------------------- shots ----
const shots = [];

// ============ B1 — the probe lost on Mars ============
const p1 = { x: 60, y: 60, w: 1720, h: 860 };
const p2 = { x: 60, y: 60, w: 1240, h: 860 };
const p3 = { x: 60, y: 60, w: 1760, h: 700 };

shots.push({
  id: 'B1', start: 0, end: 13.53,
  beats: [
    { a: 0, b: 5.6, panel: p1, draw(ctx, lt, bp) {
      box(ctx, { x: p1.x, y: p1.y, w: p1.w, h: p1.h, fill: C.ink, line: C.ink, lw: 0, key: 'sky' });
      dots(ctx, { x: p1.x, y: p1.y, w: p1.w, h: p1.h, n: 120, col: C.panel, size: 3.2, key: 'st' });
      mars(ctx, { x: p1.x + p1.w - 330, y: p1.y + 250, r: 250 });
      const px = lerp(p1.x + 420, p1.x + 540, ease(clamp(bp * 1.2)));
      speedLines(ctx, { x: p1.x + 70, y: p1.y + 500, w: 300, h: 200, n: 14, col: C.panel, op: .42, ang: .08, len: .9 });
      probe(ctx, { x: px, y: p1.y + 470, s: 1.22, rot: -.26 });
      caption(ctx, { x: p1.x + 40, y: p1.y + 40, w: PX(p1, 330), text: 'MARTE · 1999', size: PX(p1, 34), p: seg(lt, .2, .7) });
      balloon(ctx, { x: p1.x + 70, y: p1.y + 600, w: PX(p1, 560), h: PX(p1, 130), tail: [p1.x + 470, p1.y + 800],
        text: 'a agência perdeu uma sonda', size: PX(p1, 34), p: seg(lt, 1.5, 2.1), key: 'b1a' });
      sfx(ctx, { text: 'PSSHH', x: p1.x + 780, y: p1.y + 440, size: PX(p1, 150), rot: -.13, fill: C.panel, p: seg(lt, 3.3, 3.8) });
    } },
    { a: 5.6, b: 9.4, panel: p2, draw(ctx, lt, bp) {
      shape(ctx, rectPts(p2.x, p2.y, p2.w, p2.h), { fill: C.ink, line: C.ink, w: 0, key: 'void' });
      dots(ctx, { x: p2.x, y: p2.y, w: p2.w, h: p2.h, n: 60, col: C.panel, size: 2.8, key: 'st2' });
      probe(ctx, { x: p2.x + p2.w / 2, y: p2.y + p2.h * .56, s: 1.34, rot: -.10, tone: C.spot });
      balloon(ctx, { x: p2.x + 40, y: p2.y + 40, w: PX(p2, 460), h: PX(p2, 120), tail: [p2.x + p2.w / 2 - 60, p2.y + p2.h * .34],
        text: 'para sempre', size: PX(p2, 38), p: seg(lt, 1.3, 1.9), key: 'b1b' });
    } },
    { a: 9.4, b: 13.53, panel: p3, draw(ctx, lt, bp) {
      shape(ctx, rectPts(p3.x, p3.y, p3.w, p3.h), { fill: C.panel, line: C.ink, w: 0, key: 'flat' });
      halftone(ctx, rectPts(p3.x, p3.y + p3.h * .64, p3.w, p3.h * .36), { col: C.spot2, dens: 'light', size: 8, op: .5 });
      const ruler = (rx, ry, len, lbl, col, p) => {
        const tkKey = 'r' + rx + ry;
        if (p <= .01) return;
        const rh = 104, l = len * ease(clamp(p));
        box(ctx, { x: rx, y: ry, w: l, h: rh, r: 4, fill: C.panel, line: C.ink, lw: 6, key: tkKey });
        for (let i = 1; i < 12; i++) {
          const x = rx + (l / 12) * i, big = i % 3 === 0;
          if (x > rx + l - 12) break;
          ink(ctx, [[x, ry], [x, ry + (big ? 56 : 32)]], { w: big ? 5 : 3, key: 'tk' + i + rx });
        }
        ctx.save(); ctx.font = `${PX(p3, 46)}px Bebas`; ctx.fillStyle = col;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(lbl, rx, ry - PX(p3, 16)); ctx.restore();
      };
      ruler(p3.x + 80, p3.y + 190, 1080, 'METROS', C.spot2, seg(lt, .3, .8));
      ruler(p3.x + 80, p3.y + 420, 780, 'PÉS', C.spot, seg(lt, 1.1, 1.6));
      sfx(ctx, { text: 'UMA', x: p3.x + 1420, y: p3.y + 220, size: PX(p3, 132), rot: -.07, p: seg(lt, 1.9, 2.3) });
      sfx(ctx, { text: 'UNIDADE', x: p3.x + 1420, y: p3.y + 350, size: PX(p3, 132), rot: .05, p: seg(lt, 2.1, 2.5) });
      caption(ctx, { x: p3.x + p3.w - PX(p3, 60) - PX(p3, 620), y: p3.y + p3.h - PX(p3, 126), w: PX(p3, 620), text: 'o motivo? uma unidade de medida', size: PX(p3, 30), p: seg(lt, 3.0, 3.5) });
    } },
  ],
});

// ============ B2 — the two teams, and the gap ============
const q1 = { x: 60, y: 60, w: 1760, h: 880 };
const q2 = { x: 60, y: 60, w: 1180, h: 780 };
const q3 = { x: 60, y: 60, w: 1180, h: 780 };

shots.push({
  id: 'B2', start: 13.53, end: 31.04,
  beats: [
    { a: 0, b: 7.5, panel: q1, draw(ctx, lt, bp) {
      const mid = q1.x + q1.w / 2;
      shape(ctx, rectPts(q1.x, q1.y, q1.w / 2, q1.h), { fill: C.panel, line: C.ink, w: 0, key: 'l' });
      shape(ctx, rectPts(mid, q1.y, q1.w / 2, q1.h), { fill: C.panel, line: C.ink, w: 0, key: 'r' });
      halftone(ctx, rectPts(q1.x, q1.y, q1.w / 2, q1.h), { col: C.spot2, dens: 'light', size: 8, op: .40 });
      halftone(ctx, rectPts(mid, q1.y, q1.w / 2, q1.h), { col: C.spot, dens: 'light', size: 8, op: .26 });
      person(ctx, { x: q1.x + 330, y: q1.y + 430, s: 1.15, tone: C.spot2, arms: 'up' });
      person(ctx, { x: q1.x + q1.w - 330, y: q1.y + 430, s: 1.15, tone: C.spot, arms: 'up' });
      // the table, drawn over the figures: they are standing behind it
      ink(ctx, [[q1.x + 40, q1.y + 660], [mid - 30, q1.y + 660]], { w: 9, key: 'tl' });
      ink(ctx, [[mid + 30, q1.y + 660], [q1.x + q1.w - 40, q1.y + 660]], { w: 9, key: 'tr' });
      halftone(ctx, rectPts(q1.x + 40, q1.y + 664, q1.w / 2 - 70, 120), { col: C.spot2, dens: 'light', size: 8, op: .35 });
      // each draws a stroke on the table; the strokes stop well short of the gutter
      const la = ease(clamp((lt - 1.3) / 1.0)), lb = ease(clamp((lt - 2.7) / 1.0));
      ink(ctx, [[q1.x + 560, q1.y + 700], [q1.x + 560 + 430 * la, q1.y + 700]], { w: 22, col: C.spot2, key: 'sa' });
      ink(ctx, [[q1.x + q1.w - 560 - 430 * lb, q1.y + 700], [q1.x + q1.w - 560, q1.y + 700]], { w: 22, col: C.spot, key: 'sb' });
      shape(ctx, rectPts(mid - 26, q1.y, 52, q1.h), { fill: C.ink, line: C.ink, w: 0, key: 'gut' });
      balloon(ctx, { x: q1.x + 60, y: q1.y + 40, w: PX(q1, 470), h: PX(q1, 120), tail: [q1.x + 380, q1.y + 300],
        text: 'nós medimos em metros', size: PX(q1, 34), p: seg(lt, .6, 1.2), key: 'q1a' });
      balloon(ctx, { x: q1.x + q1.w - 60 - PX(q1, 470), y: q1.y + 40, w: PX(q1, 470), h: PX(q1, 120), tail: [q1.x + q1.w - 380, q1.y + 300],
        text: 'nós, em pés', size: PX(q1, 34), p: seg(lt, 3.2, 3.8), key: 'q1b' });
      sfx(ctx, { text: '?', x: mid, y: q1.y + 250, size: PX(q1, 210), rot: .05, fill: C.spot, p: seg(lt, 5.0, 5.5) });
    } },
    { a: 7.5, b: 11.5, panel: q2, draw(ctx, lt, bp) {
      shape(ctx, rectPts(q2.x, q2.y, q2.w, q2.h), { fill: C.panel, line: C.ink, w: 0, key: 'q2' });
      halftone(ctx, rectPts(q2.x, q2.y + q2.h * .58, q2.w, q2.h * .42), { col: C.spot2, dens: 'light', size: 8, op: .5 });
      const k = ease(clamp(lt / 3.6));
      speedLines(ctx, { x: q2.x + 40, y: q2.y + 520, w: 380, h: 200, n: 16, col: C.ink, op: .45, ang: -.42, len: 1 });
      rocketSmall(ctx, { x: lerp(q2.x + 210, q2.x + 800, k), y: lerp(q2.y + 520, q2.y + 230, k), s: 1.9, rot: -.5, flame: .9 });
      sfx(ctx, { text: 'FOOOSH', x: q2.x + 320, y: q2.y + 620, size: PX(q2, 140), rot: -.08, p: seg(lt, .2, .7) });
      caption(ctx, { x: q2.x + 40, y: q2.y + 40, w: PX(q2, 440), text: 'ninguém errou a conta', size: PX(q2, 30), p: seg(lt, 1.2, 1.7) });
    } },
    { a: 11.5, b: 17.51, panel: q3, draw(ctx, lt, bp) {
      box(ctx, { x: q3.x, y: q3.y, w: q3.w, h: q3.h, fill: C.spot2, line: C.ink, lw: 0, key: 'q3' });
      dots(ctx, { x: q3.x, y: q3.y, w: q3.w, h: q3.h * .6, n: 46, col: C.panel, size: 2.6, key: 'q3s' });
      // ground: a flat horizon, then the craters read as rings, not hills
      box(ctx, { x: q3.x, y: q3.y + q3.h * .62, w: q3.w, h: q3.h * .38, fill: C.ink, line: C.ink, lw: 0, key: 'gnd' });
      halftone(ctx, rectPts(q3.x, q3.y + q3.h * .62, q3.w, q3.h * .38), { col: C.spot, dens: 'light', size: 8, op: .35 });
      ink(ctx, [[q3.x, q3.y + q3.h * .62], [q3.x + q3.w, q3.y + q3.h * .62]], { w: 7, key: 'hz' });
      for (const [cx, r] of [[q3.x + 300, 96], [q3.x + 690, 62], [q3.x + 980, 118]]) {
        const cy = q3.y + q3.h * .62;
        ctx.save(); ctx.strokeStyle = C.panel; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .34, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = .5; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(cx, cy + r * .10, r * .66, r * .22, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      // the rocket: far away, upside of where it should be
      rocketSmall(ctx, { x: q3.x + q3.w - 250, y: q3.y + q3.h * .34, s: 1.05, rot: .42, flame: .35, col: C.spot });
      balloon(ctx, { x: q3.x + 40, y: q3.y + 40, w: PX(q3, 470), h: PX(q3, 120), tail: [q3.x + 380, q3.y + 300],
        text: 'o lugar errado', size: PX(q3, 38), p: seg(lt, .4, .9), key: 'q3b' });
      caption(ctx, { x: q3.x + 40, y: q3.y + q3.h - PX(q3, 120), w: PX(q3, 300), text: 'nunca mais respondeu', size: PX(q3, 26), p: seg(lt, 3.2, 3.7) });
    } },
  ],
});

// ============ B3 — the pattern ============
const r1 = { x: 60, y: 60, w: 1760, h: 720 };
const r2 = { x: 60, y: 60, w: 1240, h: 860 };
const r3 = { x: 60, y: 60, w: 1000, h: 860 };

shots.push({
  id: 'B3', start: 31.04, end: 44.57,
  beats: [
    { a: 0, b: 5.0, panel: r1, draw(ctx, lt, bp) {
      shape(ctx, rectPts(r1.x, r1.y, r1.w, r1.h), { fill: C.panel, line: C.ink, w: 0, key: 'r1' });
      halftone(ctx, rectPts(r1.x, r1.y + r1.h * .22, r1.w, r1.h * .78), { col: C.spot2, dens: 'light', size: 8, op: .45 });
      [0, 1, 2].forEach(n => {
        person(ctx, { x: r1.x + 430 + n * 450, y: r1.y + 330 + (n === 1 ? 24 : 0), s: n === 1 ? 1.08 : 1.0,
          tone: [C.spot2, C.spot, C.spot2][n], arms: 'down' });
      });
      balloon(ctx, { x: r1.x + 40, y: r1.y + 30, w: PX(r1, 520), h: PX(r1, 120), tail: [r1.x + 430, r1.y + 240],
        text: 'não foi falta de gente boa', size: PX(r1, 32), p: seg(lt, .6, 1.2), key: 'r1b' });
    } },
    { a: 5.0, b: 9.5, panel: r2, draw(ctx, lt, bp) {
      shape(ctx, rectPts(r2.x, r2.y, r2.w, r2.h), { fill: C.panel, line: C.ink, w: 0, key: 'r2' });
      halftone(ctx, rectPts(r2.x, r2.y + r2.h * .52, r2.w, r2.h * .48), { col: C.spot2, dens: 'light', size: 8, op: .42 });
      const bw = 150, bh = 132, gap = 24, x0 = r2.x + 60, y0 = r2.y + 210;
      for (let i = 0; i < 21; i++) {
        const cx = x0 + (i % 7) * (bw + gap), cy = y0 + Math.floor(i / 7) * (bh + gap);
        const empty = i === 9;
        box(ctx, { x: cx, y: cy, w: bw, h: bh, r: 3, fill: empty ? C.spot : C.panel, line: C.ink, lw: 5, key: 'tb' + i });
        const P = rectPts(cx, cy, bw, bh);
        if (empty) {
          halftone(ctx, P, { col: C.ink, dens: 'light', size: 7, op: .25 });
          sfx(ctx, { text: '?', x: cx + bw / 2, y: cy + bh / 2 - 4, size: PX(r2, 96), rot: .05, fill: C.panel, p: seg(lt, 2.2, 2.7) });
        } else {
          const k = clamp((lt - .1 - i * .035) / .12);
          if (k > .02) ink(ctx, [[cx + 32, cy + bh * .52], [cx + 62, cy + bh * .74], [cx + 118, cy + bh * .26]],
            { w: 9 * k + 1, key: 'tk' + i });
        }
      }
      caption(ctx, { x: r2.x + 40, y: r2.y + 40, w: PX(r2, 460), text: 'não foi falta de teste', size: PX(r2, 30), p: seg(lt, .8, 1.3) });
    } },
    { a: 9.5, b: 13.53, panel: r3, draw(ctx, lt, bp) {
      shape(ctx, rectPts(r3.x, r3.y, r3.w, r3.h), { fill: C.spot, line: C.ink, w: 0, key: 'r3' });
      halftone(ctx, rectPts(r3.x, r3.y, r3.w, r3.h), { col: C.ink, dens: 'light', size: 8, op: .28 });
      const side = 420, sx0 = r3.x + (r3.w - side) / 2, sy0 = r3.y + 260;
      // rays: the printed way to say "look here", no glow, no gradient
      const cx = sx0 + side / 2, cy = sy0 + side / 2, k = ease(seg(lt, .8, 1.5));
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + .12, long = i % 2 === 0;
        const r0 = side * .60, r1 = side * (.72 + (long ? .42 : .2)) * k;
        ink(ctx, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]],
          { w: long ? 14 : 7, col: C.panel, key: 'ray' + i });
      }
      sharp(ctx, rectPts(sx0, sy0, side, side), { fill: C.panel, line: C.ink, w: 11, key: 'sq', wob: .15 });
      sfx(ctx, { text: '?', x: sx0 + side / 2, y: sy0 + side / 2 - 10, size: PX(r3, 230), rot: .04, fill: C.spot, p: seg(lt, 1.4, 1.9) });
      caption(ctx, { x: r3.x + 40, y: r3.y + 40, w: PX(r3, 260), text: 'o padrão', size: PX(r3, 34), p: seg(lt, .3, .8) });
    } },
  ],
});

export default shots;
