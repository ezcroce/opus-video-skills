// The shot list. Every shot is a pure function of local time, cut to the measured sentence cues.
// Timings below are seconds inside the shot; the audio cues they answer are named in the comments.
import {
  PAL, TAU, W, H, paint, ink, glow, hexA, hash, lerp, clamp, ease, easeOut, easeIn, backOut, kf,
  seg, wob, spring, shake, ellPts, rectPts, rrPts, blobPts, arcPts, through, ribbonPts, withCam,
  rng, darken,
} from '../engine/core.mjs';
import { vivi, bot, hills, planet, stars, rocket, mic, lamp, desk, arrow, slip, sketchbook, scroll, mark, island, bridge, mug, papers, plant } from '../engine/cast.mjs';

const U = 40;
const BPM = 84, BEAT = 60 / BPM;
const pulse = (t, k = 6) => Math.exp(-((t / BEAT) % 1) * k);
const cam = (t, keys) => ({ cx: kf(t, keys.cx || [[0, W / 2]]), cy: kf(t, keys.cy || [[0, H / 2]]), zoom: kf(t, keys.z || [[0, 1]]), rot: kf(t, keys.r || [[0, 0]]) });

// ---------------------------------------------------------------- studio ---
// One room for the whole film: warm wall, a floor that meets it in a soft wash, a lamp on the left
// and the microphone on the right. Returning to it is how the film breathes.
function studio(ctx, t, o = {}) {
  const { lit = 1, dim = 0 } = o;
  // value first: a deep warm wall, so a cream character has something to sit against
  // the wall: a warm upper field, a deeper lower field, and one lamp pool — three values, no gradient
  paint(ctx, rectPts(-200, -200, W + 400, H + 400), { wash: PAL.sand, alpha: .30, edge: false, key: 'wall' });
  paint(ctx, rectPts(-200, -200, W + 400, 560), { wash: PAL.ochre, alpha: .11, edge: false, key: 'walltop' });
  paint(ctx, rectPts(-200, 560, W + 400, 220), { wash: PAL.terracotta, alpha: .09, edge: false, key: 'wainscot' });
  paint(ctx, rectPts(-200, 690, W + 400, 120), { wash: PAL.dusk, alpha: .07, edge: false, key: 'wallshadow' });
  ink(ctx, [[-200, 566], [400, 560], [1200, 568], [2100, 558]], { w: 2.0, col: hexA(PAL.inkSoft, .35), key: 'wainline' });
  paint(ctx, blobPts(430, 420, 560, 6, .10, 30), { wash: PAL.lamp, alpha: .16 * lit, edge: false, key: 'wallpool' });
  // shelf and plant live high on the wall, clear of the cast
  paint(ctx, rectPts(150, 250, 320, 13, 2), { wash: PAL.inkSoft, alpha: .30, ink: PAL.ink, sw: 1.8, key: 'shelf' });
  for (let i = 0; i < 3; i++) paint(ctx, rrPts(188 + i * 72, 190 + (i % 2) * 8, 42, 60 - (i % 2) * 12, 6, 1.5), { wash: [PAL.terracotta, PAL.sea, PAL.ochre][i], alpha: .30, ink: PAL.ink, sw: 1.7, key: 'book' + i });
  plant(ctx, { x: 1700, y: 620, u: 30, t, key: 'plantBack' });
  // floor
  paint(ctx, through([[-200, 748], [520, 724], [1200, 746], [2100, 718], [2100, 1300], [-200, 1300]], 10), { wash: PAL.moss, alpha: .26, edge: false, key: 'floor' });
  ink(ctx, [[-200, 750], [520, 726], [1200, 748], [2100, 720]], { w: 1.8, col: hexA(PAL.inkSoft, .55), key: 'skirt' });
  lamp(ctx, { x: 300, y: 320, u: 30, lit, t, key: 'lamp' });
  mic(ctx, { x: 1275, y: 450, u: 30, t, key: 'mic', lit });
  desk(ctx, { x: 950, y: 806, w: 940, key: 'desk' });
  mug(ctx, { x: 1310, y: 758, u: 24, t, key: 'mugBack', steam: .7 });
  papers(ctx, { x: 620, y: 776, w: 120, n: 4, rot: -.04, key: 'papersBack' });
  if (dim > 0) { ctx.save(); ctx.globalAlpha = dim * .55; ctx.fillStyle = PAL.dusk; ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); }
}

// Space is not black: it is deep watercolour dusk, with the paper still showing through.
function dark(ctx, col = PAL.dusk) {
  paint(ctx, rectPts(-200, -200, W + 400, H + 400), { wash: col, alpha: .42, edge: false, key: 'space' });
  paint(ctx, blobPts(960, 1080, 1100, 5, .10, 30), { wash: '#1B2230', alpha: .18, edge: false, key: 'spacefloor' });
}

// Anything in front of the cast is depth: leaves entering the corner of frame, painted last,
// darker and larger than anything behind them.
function fore(ctx, t, side = 'left') {
  const dir = side === 'left' ? 1 : -1;
  const x0 = side === 'left' ? -90 : W + 90;
  ctx.save();
  ctx.globalAlpha = .82;
  for (let i = 0; i < 2; i++) {
    const ang = (side === 'left' ? -.15 : Math.PI + .15) + dir * (i * .34);
    const L = 620 - i * 70, w = 150 - i * 18;
    const sway = Math.sin(t * .9 + i) * .06;
    const tip = [x0 + Math.cos(ang + sway) * L, 1080 + Math.sin(ang + sway) * L * .95];
    const mid = [x0 + Math.cos(ang + sway) * L * .55 + dir * 40, 1080 + Math.sin(ang + sway) * L * .55];
    paint(ctx, ribbonPts(through([[x0, 1120], mid, tip], 6), w, w * .25),
      { wash: PAL.moss, alpha: .46, ink: darken(PAL.moss, .55), sw: 2.4, key: 'fore' + side + i });
  }
  ctx.restore();
}

// ============================================================== shots ======
const SHOTS = [
  // ---------------------------------------------------------------- A1 ----
  { // "Imagina que você sobe uma alteração de uma linha só. Uma linha."
    id: 'a1-line', start: 0, end: 7.05,
    draw(ctx, lt, t) {
      const z = 1.02 + .05 * ease(seg(lt, 0, 7));
      withCam(ctx, cam(lt, { cx: [[0, 860], [7, 900]], cy: [[0, 640], [7, 620]], z: [[0, z]] }), () => {
        studio(ctx, t, { lit: 1 });
        const mood = lt < 1.6 ? 'idle' : lt < 3.4 ? 'talk' : 'idle';
        vivi(ctx, { x: 700, y: 640, u: 62, t, mood, armL: .55 + .06 * wob(t, .5), armR: .95, look: 1, seedKey: 'viviA' });
        // the single line: drawn across the room, then held
        const k = ease(seg(lt, 1.7, 3.9));
        if (k > 0) {
          const P = [[300, 300], [900, 250], [1500, 320], [1820, 250]];
          const cut = through(P, 10).slice(0, Math.max(2, Math.round(through(P, 10).length * k)));
          ink(ctx, cut, { w: 9, col: PAL.ink, key: 'oneline' });
          if (lt > 3.9) glow(ctx, 1500, 300, 260 * (.7 + .3 * pulse(t)), PAL.lamp, .30);   // "Uma linha." — it glows, held
        }
      });
    } },

  // ---------------------------------------------------------------- A2 ----
  { // "E ela derruba o login de todo mundo." — the line becomes a rail, the block slides, the door shuts.
    id: 'a2-login', start: 7.05, end: 16.38,
    draw(ctx, lt, t) {
      const tilt = .30 * ease(seg(lt, .1, 1.6));
      const slide = ease(seg(lt, 1.2, 3.0));
      withCam(ctx, cam(lt, { cx: [[0, 980], [6, 1020]], cy: [[0, 610], [6, 630]], z: [[0, 1.04], [2, 1.0], [9.3, 1.06]] }), () => {
        studio(ctx, t, { lit: .9 });
        vivi(ctx, { x: 470, y: 645, u: 54, t, mood: lt > 5.6 ? 'surprise' : 'idle', armL: lt > 5.6 ? 2.15 : .5, armR: lt > 5.6 ? 2.35 : .85, look: 1, seedKey: 'viviA' });
        ctx.save();
        ctx.translate(1120, 470);
        ctx.rotate(tilt);
        // the rail (the line from the previous shot), now a beam
        ink(ctx, [[-780, 0], [760, 8]], { w: 9, key: 'rail' });
        // the block that rides it
        const bx = -520 + slide * 1240;
        ctx.save();
        ctx.translate(bx, -100 + Math.sin(slide * Math.PI) * 40);
        ctx.rotate(slide * .2);
        paint(ctx, rrPts(-70, -60, 140, 120, 10, 2), { wash: PAL.sea, alpha: .22, ink: PAL.ink, sw: 2.6, key: 'block' });
        ctx.restore();
        ctx.restore();

        // the login door: swings shut the moment the block leaves the rail
        const shut = ease(seg(lt, 2.4, 3.3));
        ctx.save();
        ctx.translate(1560, 500);
        paint(ctx, rectPts(-110, -160, 220, 320, 2), { wash: PAL.dusk, alpha: .18, ink: PAL.ink, sw: 3, key: 'frame' });
        ctx.save();
        ctx.translate(-110, 0);
        ctx.scale(1 - shut * .96, 1);           // flat 2D: the door narrows as it swings, never projected
        paint(ctx, rectPts(0, -150, 210, 300, 2), { wash: PAL.terracotta, alpha: .2, ink: PAL.ink, sw: 2.4, key: 'door' });
        paint(ctx, ellPts(180, 10, 12, 12, 12), { wash: PAL.lamp, alpha: .5, ink: PAL.ink, sw: 1.6, key: 'knob' });
        ctx.restore();
        ctx.restore();
        // the people who just lost the login: three little ones tumbling out of the door
        const tf = seg(lt, 3.2, 6.4);
        if (tf > 0) {
          for (let i = 0; i < 3; i++) {
            const d = Math.max(0, tf - i * .12);
            const x = 1450 - d * (300 + i * 60), y = 640 - Math.sin(clamp(d * 1.6) * Math.PI) * 150 + d * 120;
            ctx.save();
            ctx.globalAlpha = clamp(1 - d * .5);
            paint(ctx, blobPts(x, y, 34, 5, .12, 16), { wash: PAL.cream, alpha: .3, ink: PAL.ink, sw: 2, key: 'ppl' + i });
            ink(ctx, [[x - 12, y - 12], [x - 12, y - 4]], { w: 3, key: 'pe' + i });
            ink(ctx, [[x + 12, y - 12], [x + 12, y - 4]], { w: 3, key: 'pe2' + i });
            ctx.restore();
          }
        }
        mark(ctx, { x: 470, y: 300, u: 26, kind: '!', alpha: clamp(seg(lt, 5.7, 6.1)), key: 'em1' });
        fore(ctx, t, 'left');
      });
    } },

  // ---------------------------------------------------------------- A3 ----
  { // "Eu sou a Vivi..." + "Hoje eu trago duas coisas." — the promise: a rocket and a sketchbook arrive.
    id: 'a3-promise', start: 16.38, end: 26.71,
    draw(ctx, lt, t) {
      const wave = Math.sin(t * 9) * .5;
      withCam(ctx, cam(lt, { cx: [[0, 960]], cy: [[0, 620]], z: [[0, 1.0], [10.3, 1.07]] }), () => {
        studio(ctx, t, { lit: 1 });
        vivi(ctx, {
          x: 900, y: 638, u: 64, t, seedKey: 'viviA',
          mood: lt < 6.6 ? 'happy' : 'talk', look: 0,
          armR: lt < 6.6 ? 2.35 + wave * .35 : .95, armL: .5,
        });
        // the two promises rise into frame, one per read
        const rk = backOut(seg(lt, 8.3, 9.5)), sb = backOut(seg(lt, 9.6, 10.7));
        if (rk > 0) {
          ctx.save(); ctx.globalAlpha = rk;
          rocket(ctx, { x: 420, y: lerp(900, 300, rk), u: 42, rot: -.25, t, thrust: .6, key: 'rkA' });
          planet(ctx, { x: 300, y: 160, r: 90, t, key: 'marsMini' });
          ctx.restore();
        }
        if (sb > 0) {
          ctx.save(); ctx.globalAlpha = sb;
          sketchbook(ctx, { x: 1520, y: lerp(940, 330, sb), w: 260, h: 180, rot: .18, t, key: 'sbA' });
          ctx.restore();
        }
        fore(ctx, t, 'right');
      });
    } },

  // ---------------------------------------------------------------- A4 ----
  { // "...uma história de um erro que ninguém conseguiu ver..." — push into the little planet.
    id: 'a4-push', start: 26.71, end: 39.40,
    draw(ctx, lt, t) {
      const z = lerp(1.0, 1.22, ease(seg(lt, 4.0, 12.4)));
      withCam(ctx, cam(lt, { cx: [[0, 960], [12.7, 700]], cy: [[0, 620], [12.7, 430]], z: [[0, 1], [12.7, z]] }), () => {
        studio(ctx, t, { lit: 1 - .3 * ease(seg(lt, 6.0, 11.4)) });
        vivi(ctx, { x: 900, y: 638, u: 64, t, mood: 'talk', armL: .5, armR: 1.05, look: -1, seedKey: 'viviA' });
        rocket(ctx, { x: 420, y: 300, u: 42, rot: -.25 + .1 * wob(t, .3), t, thrust: .6, key: 'rkA' });
        planet(ctx, { x: 300, y: 160, r: 90, t, key: 'marsMini' });
        sketchbook(ctx, { x: 1520, y: 330, w: 260, h: 180, rot: .18, t, key: 'sbA' });
        // the room dissolves into space under the objects, so the cut to Mars is continuous
        const dis = ease(seg(lt, 6.4, 11.6));
        if (dis > 0) {
          ctx.save();
          ctx.globalAlpha = dis;
          dark(ctx);
          stars(ctx, t, { n: 26, key: 'stA4' });
          ctx.restore();
          planet(ctx, { x: 300, y: 160, r: 90 * (1 + .5 * dis), t, key: 'marsMini' });
          rocket(ctx, { x: 420, y: 300, u: 42, rot: -.25 + .1 * wob(t, .3), t, thrust: .6, key: 'rkA' });
        }
      });
    } },

  // ---------------------------------------------------------------- B1 ----
  { // "Em 1999 a agência espacial perdeu uma sonda em Marte..." — space, the probe glides in.
    id: 'b1-mars', start: 39.40, end: 52.93,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 900], [13.5, 960]], cy: [[0, 540], [13.5, 500]], z: [[0, 1], [13.5, 1.1]] }), () => {
        dark(ctx);
        stars(ctx, t, { n: 34, key: 'stB1' });
        planet(ctx, { x: 1450, y: 330, r: 300, t, key: 'marsB' });
        // the probe: one clean arc, one long breath
        const k = ease(seg(lt, 0, 7.2));
        const pos = [lerp(-260, 640, k), lerp(880, 300, k) - Math.sin(k * Math.PI) * 90];
        ink(ctx, through([[-260, 880], [120, 620], pos], 8), { w: 2.2, col: hexA(PAL.cream, .45), key: 'trail' });
        rocket(ctx, { x: pos[0], y: pos[1], u: 54, rot: -.7 + k * .5, t, thrust: .8, key: 'rkB' });
        // the price: a tag swings on the probe
        const swing = .34 * Math.sin(t * 2.2) * clamp(seg(lt, 5.4, 6.4));
        ctx.save();
        ctx.translate(pos[0] + 40, pos[1] + 130);
        ctx.rotate(-.7 + k * .5 + swing);
        ink(ctx, [[0, -120], [0, 0]], { w: 1.6, key: 'tagstr' });
        paint(ctx, through([[-70, 0], [70, 0], [96, 46], [70, 92], [-70, 92], [-96, 46]], 4), { wash: PAL.ochre, alpha: .22, ink: PAL.ink, sw: 2.2, key: 'tag' });
        paint(ctx, ellPts(-62, 46, 9, 9, 10), { wash: PAL.paper, alpha: .4, ink: PAL.ink, sw: 1.4, key: 'tagh' });
        for (let i = 0; i < 3; i++) ink(ctx, [[-30, 24 + i * 20], [46, 24 + i * 20]], { w: 2.2, col: PAL.inkSoft, key: 'tagl' + i });
        ctx.restore();
        // "o motivo foi uma unidade de medida": two rulers appear, in different lengths
        const rk = backOut(seg(lt, 9.3, 10.6));
        if (rk > 0) {
          ctx.save();
          ctx.globalAlpha = clamp(rk);
          const drawRuler = (x, y, len, ticks, rot, key) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
            paint(ctx, rrPts(0, -16, len, 32, 6, 1.4), { wash: PAL.cream, alpha: .3, ink: PAL.ink, sw: 2.2, key: key + 'r' });
            for (let i = 1; i < ticks; i++) ink(ctx, [[i * len / ticks, -16], [i * len / ticks, i % 2 ? -4 : 6]], { w: 1.8, key: key + 't' + i });
            ctx.restore();
          };
          drawRuler(180, 780, 300, 4, -.06, 'ru1');
          drawRuler(300, 900, 430, 8, .04, 'ru2');
          mark(ctx, { x: 620, y: 830, u: 22, kind: '?', alpha: clamp(seg(lt, 11.4, 12)), key: 'em2' });
          ctx.restore();
        }
      });
    } },

  // ---------------------------------------------------------------- B2 ----
  { // "Uma equipe calculou numa unidade, a outra esperava outra. Ninguém errou a conta."
    id: 'b2-mismatch', start: 52.93, end: 70.44,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960], [17.5, 940]], cy: [[0, 560], [17.5, 520]], z: [[0, 1.02], [17.5, 1.12]] }), () => {
        dark(ctx, PAL.dusk);
        stars(ctx, t, { n: 26, key: 'stB2' });
        // two platforms, two teams, each with its own perfect stroke
        island(ctx, { x: 420, y: 800, w: 420, h: 110, key: 'isl1', col: PAL.moss });
        island(ctx, { x: 1500, y: 800, w: 420, h: 110, key: 'isl2', col: PAL.olive });
        const a = easeOut(seg(lt, 0, 1.6)), b = easeOut(seg(lt, 1.4, 3.0));
        ctx.save();
        ctx.globalAlpha = a;
        vivi(ctx, { x: 420, y: 705, u: 42, t, mood: 'talk', armL: .4, armR: 2.1, seedKey: 'teamA' });
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = b;
        bot(ctx, { x: 1500, y: 705, u: 42, t, mood: 'eager', armL: .9, armR: -.9, crank: t * .4, seedKey: 'teamB' });
        ctx.restore();

        // each paints a stroke towards the rocket; both are perfect, they are just not the same length
        const s1 = ease(seg(lt, 4.0, 6.2)), s2 = ease(seg(lt, 4.6, 6.8));
        if (s1 > 0) {
          const P = through([[560, 620], [820, 470], [980, 420]], 8);
          ink(ctx, P.slice(0, Math.max(2, Math.round(P.length * s1))), { w: 7, col: PAL.lamp, key: 'strokeA' });
        }
        if (s2 > 0) {
          const P = through([[1360, 620], [1180, 470], [1080, 430]], 8);
          ink(ctx, P.slice(0, Math.max(2, Math.round(P.length * s2))), { w: 7, col: PAL.sky, key: 'strokeB' });
        }
        // the gap where the two should meet, and the "?" neither of them can see
        const gap = clamp(seg(lt, 7.4, 8.6));
        if (gap > 0) {
          ctx.save();
          ctx.globalAlpha = gap * (.6 + .4 * Math.abs(Math.sin(t * 2)));
          paint(ctx, blobPts(1030, 424, 26 + 8 * Math.sin(t * 3), 6, .2, 18), { wash: PAL.rose, alpha: .2, edge: false, key: 'gap' });
          mark(ctx, { x: 1030, y: 300, u: 26, kind: '?', alpha: gap, key: 'emB2' });
          ctx.restore();
        }
        // "o software não reclamou": nothing happens. The rocket sits between them, unbothered.
        const rkx = 1030, rky = lerp(620, 560, ease(seg(lt, 8.6, 10.4)));
        if (lt > 9.2) rocket(ctx, { x: rkx, y: rky, u: 40, rot: -.1 + .05 * wob(t, .4), t, thrust: .25 * pulse(t), key: 'rkC' });
        // "e o foguete foi para o lugar errado": the arrow bends away, off the top of frame
        const away = ease(seg(lt, 14.5, 17.4));
        if (away > 0) {
          const P = through([[1030, 520], [1120, 300], [1500, 120], [1830, -40]], 8).slice(0, Math.max(2, Math.round(28 * away)));
          ink(ctx, P, { w: 5, col: PAL.terracotta, key: 'wrongway' });
          ctx.save(); ctx.globalAlpha = away;
          rocket(ctx, { x: 1830, y: -40 + 40, u: 34, rot: -.9, t, thrust: .9, key: 'rkC' });
          ctx.restore();
        }
      });
    } },

  // ---------------------------------------------------------------- B3 ----
  { // "Repara no padrão. Não foi falta de gente boa. Não foi falta de teste. Foi falta de UM teste."
    id: 'b3-pattern', start: 70.44, end: 83.97,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960], [13.5, 900]], cy: [[0, 620], [13.5, 640]], z: [[0, 1.0], [13.5, 1.12]] }), () => {
        studio(ctx, t, { lit: .85 });
        vivi(ctx, { x: 300, y: 660, u: 52, t, mood: lt > 11 ? 'talk' : 'idle', armL: .45, armR: lt > 11 ? 2.0 : .8, look: -1, seedKey: 'viviA' });
        // the good people arrive: three of them, unremarkable and competent
        for (let i = 0; i < 3; i++) {
          const k = backOut(seg(lt, 1.0 + i * .35, 2.0 + i * .35));
          if (k <= 0) continue;
          ctx.save();
          ctx.globalAlpha = clamp(k);
          paint(ctx, blobPts(700 + i * 170, lerp(900, 700, k), 40, 5, .14, 16), { wash: PAL.cream, alpha: .3, ink: PAL.ink, sw: 2.2, key: 'folk' + i });
          ink(ctx, [[700 + i * 170 - 14, 686], [700 + i * 170 - 14, 694]], { w: 3.4, key: 'fke' + i });
          ink(ctx, [[700 + i * 170 + 14, 686], [700 + i * 170 + 14, 694]], { w: 3.4, key: 'fke2' + i });
          ctx.restore();
        }
        // the wall of tests that were run: a grid of small stamped squares, all ticked off
        const grid = clamp(seg(lt, 3.2, 6.2));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
          const n = (r * 6 + c) / 18;
          if (grid < n) continue;
          const x = 1120 + c * 96, y = 420 + r * 96;
          paint(ctx, rrPts(x, y, 74, 74, 8, 1.6), { wash: PAL.sky, alpha: .16, ink: PAL.ink, sw: 1.8, key: 'cell' + r + c });
          ink(ctx, [[x + 18, y + 40], [x + 32, y + 56], [x + 58, y + 22]], { w: 4, col: PAL.moss, key: 'tick' + r + c });
        }
        // one square stays empty: the test that was missing
        fore(ctx, t, 'left');
        const miss = clamp(seg(lt, 6.6, 7.6));
        if (miss > 0) {
          const x = 1120 + 5 * 96, y = 420 + 2 * 96;
          ctx.save();
          ctx.globalAlpha = miss;
          paint(ctx, rrPts(x, y, 74, 74, 8, 1.6), { wash: PAL.cream, alpha: .28, ink: PAL.ink, sw: 2.6, key: 'hole' });
          glow(ctx, x + 37, y + 37, 130 * (.8 + .2 * pulse(t)), PAL.rose, .40 * miss);
          ctx.restore();
        }
      });
    } },

  // ---------------------------------------------------------------- B4 ----
  { // "Isso tem nome: teste de contrato. A ideia é simples: as duas pontas falando a mesma língua."
    id: 'b4-contract', start: 83.97, end: 97.43,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960]], cy: [[0, 620]], z: [[0, 1.0], [13.4, 1.08]] }), () => {
        dark(ctx, PAL.sea);
        stars(ctx, t, { n: 18, key: 'stB4' });
        island(ctx, { x: 420, y: 820, w: 460, h: 150, key: 'isl3', col: PAL.moss });
        island(ctx, { x: 1500, y: 820, w: 460, h: 150, key: 'isl4', col: PAL.olive });
        // the bridge is built while the name lands
        bridge(ctx, { x0: 520, x1: 1400, y: 780, k: ease(seg(lt, 1.2, 4.6)), key: 'brg1' });
        // a plug and a socket on the two islands: the contract, in one shape
        const meet = ease(seg(lt, 9.0, 11.6));
        const px = lerp(430, 900, meet), sx = lerp(1480, 1010, meet);
        paint(ctx, rrPts(px, 700, 150 - 40 * meet, 90, 14, 1.6), { wash: PAL.terracotta, alpha: .22, ink: PAL.ink, sw: 2.4, key: 'plug' });
        ink(ctx, [[px + 150 - 40 * meet, 745], [px + 210 - 40 * meet, 745]], { w: 8, key: 'pin' });
        paint(ctx, rrPts(sx, 690, 170, 110, 16, 1.6), { wash: PAL.steel, alpha: .2, ink: PAL.ink, sw: 2.4, key: 'sock' });
        if (meet > .95) glow(ctx, 1000, 745, 220 * (.75 + .25 * pulse(t)), PAL.lamp, .35);   // they speak the same language
        // the question that does the work, held over the join
        mark(ctx, { x: 1000, y: 420, u: 30, kind: '?', alpha: clamp(seg(lt, 5.4, 6.4)) * (1 - .8 * seg(lt, 11.8, 12.6)), key: 'emB4' });
      });
    } },

  // ---------------------------------------------------------------- B5 ----
  { // "Na prática é uma pergunta só, feita em voz alta na reunião: quem consome isso espera o quê?"
    id: 'b5-question', start: 97.43, end: 109.43,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 900], [12, 960]], cy: [[0, 620]], z: [[0, 1.02], [12, 1.14]] }), () => {
        studio(ctx, t, { lit: .95 });
        // Vivi leans across the table towards two colleagues
        const lean = -.10 * ease(seg(lt, 1.0, 3.0));
        vivi(ctx, { x: 480, y: 645, u: 54, t, mood: lt > 1.2 ? 'talk' : 'idle', lean, armL: .45, armR: 1.5 + .18 * wob(t, .6), look: 1, seedKey: 'viviA' });
        vivi(ctx, { x: 1180, y: 660, u: 46, t, mood: lt > 6.4 ? 'idle' : 'surprise', armL: .35, armR: .55, look: -1, seedKey: 'col1' });
        bot(ctx, { x: 1490, y: 660, u: 44, t, mood: lt > 6.4 ? 'happy' : 'idle', armL: .5, armR: .6, crank: t * .2, look: -1, seedKey: 'col2' });
        // the question, in the air between them
        const qk = clamp(seg(lt, 2.6, 3.4));
        mark(ctx, { x: 830, y: 300 - 10 * Math.sin(t * 2), u: 34, kind: '?', alpha: qk * (1 - .35 * seg(lt, 8, 9)), key: 'emB5' });
        // "quase todo bug caro começa com essa pergunta sem resposta": the wall behind cracks
        fore(ctx, t, 'right');
        const cr = clamp(seg(lt, 8.4, 10.4));
        if (cr > 0) {
          const P = through([[1260, 210], [1330, 330], [1290, 430], [1400, 520]], 6).slice(0, Math.max(2, Math.round(16 * cr)));
          ink(ctx, P, { w: 3.2, col: PAL.rust, key: 'crack' });
        }
      });
    } },

  // ---------------------------------------------------------------- C1 ----
  { // "Agora a parte prática. Você tem uma função que valida um formulário... abre um chat e cola a função."
    id: 'c1-tool', start: 109.43, end: 132.76,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960], [23, 900]], cy: [[0, 600], [23, 620]], z: [[0, 1.0], [23, 1.1]] }), () => {
        studio(ctx, t, { lit: .9 });
        // the form: a sheet with one wobbly field that will not sit still
        const formIn = backOut(seg(lt, 1.2, 2.4));
        if (formIn > 0) {
          ctx.save();
          ctx.translate(lerp(400, 640, formIn), 660);
          ctx.rotate(-.03);
          paint(ctx, rrPts(-210, -150, 420, 300, 10, 2), { wash: PAL.cream, alpha: .28, ink: PAL.ink, sw: 2.6, key: 'form' });
          for (let i = 0; i < 3; i++) ink(ctx, [[-170, -90 + i * 46], [150, -90 + i * 46]], { w: 2.4, col: PAL.inkSoft, key: 'fl' + i });
          // the field being validated: it wobbles like a live thing
          const fw = 300 + Math.sin(t * 3) * 18;
          paint(ctx, rrPts(-170, 60, fw, 70, 10, 2 + Math.sin(t * 4) * 2), { wash: PAL.sky, alpha: .16, ink: PAL.ink, sw: 2.2, key: 'field' });
          ink(ctx, through([[-150, 95], [-90, 78], [-20, 112], [60, 84], [120, 100]], 6), { w: 2.4, col: PAL.inkSoft, key: 'scrib' });
          ctx.restore();
        }
        // the machine arrives, winds up, and opens its mouth
        const botIn = ease(seg(lt, 7.0, 9.6));
        const bx = lerp(2150, 1360, botIn);
        bot(ctx, { x: bx, y: 640, u: 62, t, mood: lt < 10 ? 'idle' : 'eager', armL: .3, armR: lt > 10 ? -.9 : .4, crank: t * .8, look: -1, seedKey: 'botC' });
        // "cola a função": the sheet is fed into the machine
        const feed = ease(seg(lt, 12.4, 16.0));
        if (feed > 0) {
          ctx.save();
          ctx.globalAlpha = 1 - .55 * feed;
          ctx.translate(lerp(640, 1270, feed), lerp(660, 580, feed));
          ctx.rotate(-.03 + feed * .5);
          ctx.scale(1 - .35 * feed, 1 - .35 * feed);
          paint(ctx, rrPts(-210, -150, 420, 300, 10, 2), { wash: PAL.cream, alpha: .28, ink: PAL.ink, sw: 2.6, key: 'form' });
          for (let i = 0; i < 3; i++) ink(ctx, [[-170, -90 + i * 46], [150, -90 + i * 46]], { w: 2.4, col: PAL.inkSoft, key: 'fl' + i });
          ctx.restore();
        }
        glow(ctx, 1360, 560, 260 * pulse(t, 4), PAL.lamp, .25 * clamp(seg(lt, 15, 17)));
      });
    } },

  // ---------------------------------------------------------------- C2 ----
  { // "Ele vai te devolver uma lista. A lista é uma proposta, não uma verdade. Leia caso por caso."
    id: 'c2-list', start: 132.76, end: 143.84,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960], [11, 1010]], cy: [[0, 600], [11, 620]], z: [[0, 1.03], [11, 1.12]] }), () => {
        studio(ctx, t, { lit: .9 });
        bot(ctx, { x: 1440, y: 630, u: 58, t, mood: 'eager', armL: .5 + .3 * wob(t, .8), armR: -.4, crank: t * 1.4, look: -1, seedKey: 'botC' });
        // the list: slips fly out in an arc and settle into a row
        const kinds = ['empty', 'huge', 'spiky', 'fake', 'plain', 'spiky', 'empty'];
        for (let i = 0; i < kinds.length; i++) {
          const t0 = .05 + i * .22, k = seg(lt, t0, t0 + 1.1);
          if (k <= 0) continue;
          const from = [1340, 560], to = [320 + i * 176, 742];
          const x = lerp(from[0], to[0], easeOut(k)), y = lerp(from[1], to[1], easeOut(k)) - Math.sin(k * Math.PI) * 190;
          slip(ctx, { x, y, w: 80, h: 106, rot: -.08 + (i % 3) * .07 + (1 - k) * .8, kind: kinds[i], t, key: 'slipC' + i });
        }
        // "a lista é uma proposta, não uma verdade": Vivi reads one and squints at it
        const vin = ease(seg(lt, 1.4, 3.0));
        vivi(ctx, { x: lerp(-320, 300, vin), y: 662, u: 48, t, mood: lt > 2.4 ? 'squint' : 'idle', armR: 1.35, armL: .4, look: 1, seedKey: 'viviA' });
        fore(ctx, t, 'left');
        mark(ctx, { x: 296, y: 366, u: 24, kind: '?', alpha: clamp(seg(lt, 2.4, 3.0)) * (1 - clamp(seg(lt, 5.6, 6.4))), key: 'emC2' });
        // "leia caso por caso": she lifts them one at a time and turns each over
        const pick = seg(lt, 6.4, 10.6);
        if (pick > 0) {
          const f = clamp(pick * 6.5), idx = Math.min(6, Math.floor(f));
          const lift = Math.sin(clamp(f * 7 - idx) * Math.PI);
          const x = 320 + idx * 176, y = 742;
          slip(ctx, { x: lerp(x, 520, lift), y: lerp(y, 500, lift), w: 96, h: 128, rot: .1 * Math.sin(t * 2.4) + lift * .5, kind: kinds[idx], t, key: 'pick' + idx });
        }
      });
    } },

  // ---------------------------------------------------------------- C3 ----
  { // "Os que puderem viram teste de verdade. Os que não, descarta. Um faz a lista, o outro corta."
    id: 'c3-sort', start: 143.84, end: 161.02,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960]], cy: [[0, 620]], z: [[0, 1.04], [17.1, 1.14]] }), () => {
        studio(ctx, t, { lit: .9 });
        vivi(ctx, { x: 400, y: 660, u: 50, t, mood: lt > 13 ? 'happy' : lt > 3 ? 'squint' : 'idle', armL: .4, armR: lt > 13 ? 2.3 : 1.2, look: 1, seedKey: 'viviA' });
        bot(ctx, { x: 1480, y: 640, u: 56, t, mood: 'eager', armL: .6, armR: -.6, crank: t * .9, look: -1, seedKey: 'botC' });
        // "os que puderem viram teste de verdade": the keepers stack up as a solid block
        const keep = clamp(seg(lt, .2, 4.4));
        for (let i = 0; i < 4; i++) {
          const k = clamp(keep * 4 - i);
          if (k <= 0) continue;
          slip(ctx, { x: 760 + i * 24, y: 736 - i * 22, w: 84, h: 110, rot: -.04 * i, kind: 'ok', t, key: 'keep' + i, fade: clamp(k * 1.6) });
        }
        // "os que não puderem, você descarta sem culpa": they tip off the desk and are gone
        const drop = seg(lt, 5.0, 8.4);
        for (let i = 0; i < 3; i++) {
          const k = clamp(drop * 3 - i);
          if (k <= 0 || k >= 1) continue;
          slip(ctx, { x: 1200 + i * 84 + k * 70, y: 700 + k * 330, w: 80, h: 104, rot: k * 2.4, kind: 'fake', t, key: 'drop' + i, fade: 1 - k * .95 });
        }
        // "a máquina é boa em imaginar o improvável": a tangle of impossible cases
        const wild = clamp(seg(lt, 8.2, 10.6));
        if (wild > 0) {
          ctx.save();
          ctx.globalAlpha = wild * .9;
          const P = through([[1180, 500], [1320, 380], [1240, 300], [1420, 250], [1330, 390], [1480, 440]], 6);
          ink(ctx, P.slice(0, Math.max(2, Math.round(P.length * wild))), { w: 3, col: PAL.rust, key: 'tangle' });
          mark(ctx, { x: 1540, y: 330, u: 22, kind: '!', alpha: wild * .85, key: 'emC3' });
          ctx.restore();
        }
        // "um faz a lista, o outro corta": the scissors come down and the list is trimmed
        const cut = ease(seg(lt, 13.6, 16.4));
        if (cut > 0) {
          const cx = lerp(1250, 640, cut);
          ink(ctx, [[cx, 290], [cx, 430]], { w: 5, col: PAL.ink, key: 'sc1' });
          paint(ctx, through([[cx - 46, 430], [cx, 486], [cx + 46, 430]], 4), { wash: PAL.steel, alpha: .3, ink: PAL.ink, sw: 2, key: 'sc2' });
          paint(ctx, ellPts(cx, 380, 12, 12, 12), { wash: PAL.ochre, alpha: .35, ink: PAL.ink, sw: 1.6, key: 'scp' });
        }
        fore(ctx, t, 'right');
      });
    } },

  // ---------------------------------------------------------------- C4 ----
  { // "O cuidado é um só: ela não conhece a sua regra de negócio e inventa requisito com confiança."
    id: 'c4-trap', start: 161.02, end: 174.38,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 1020], [13.3, 930]], cy: [[0, 600]], z: [[0, 1.02], [13.3, 1.16]] }), () => {
        studio(ctx, t, { lit: .85 });
        bot(ctx, { x: 1450, y: 640, u: 56, t, mood: 'happy', armL: -.4, armR: -.9 - .15 * wob(t, .7), crank: t * .5, look: -1, seedKey: 'botC' });
        // the confident scroll unrolls over the desk
        const unroll = ease(seg(lt, .4, 3.4));
        ctx.save();
        ctx.globalAlpha = 1 - .9 * ease(seg(lt, 8.6, 10.2));
        ctx.translate(lerp(1450, 980, unroll), 700);
        ctx.rotate(-.02 - .05 * ease(seg(lt, 8.6, 10.2)));
        scroll(ctx, { x: 0, y: 0, w: 320 + 420 * unroll, h: 130, rot: 0, open: unroll, key: 'scr1' });
        ctx.restore();
        // fake requirements sprout off it: confident, wobbly, and not in the rules
        const sprout = seg(lt, 3.4, 7.4);
        for (let i = 0; i < 4; i++) {
          const k = clamp(sprout * 4 - i);
          if (k <= 0) continue;
          ctx.save();
          ctx.globalAlpha = k * (1 - .85 * ease(seg(lt, 8.6, 10.2)));
          const fx = 700 + i * 156, fy = 560 - Math.sin(i * 1.7) * 56 - k * 26;
          ink(ctx, through([[fx, 690], [fx + 18 * Math.sin(t * 2 + i), fy]], 4), { w: 2.4, col: PAL.rust, key: 'spr' + i });
          slip(ctx, { x: fx, y: fy, w: 72, h: 96, rot: .12 * Math.sin(t * 1.6 + i), kind: 'fake', t, key: 'fak' + i });
          ctx.restore();
        }
        // "se você aceitar a lista inteira sem revisar": the scroll keeps coming and covers her desk
        vivi(ctx, { x: 300, y: 660, u: 52, t, mood: lt > 8.8 ? 'squint' : 'idle', armL: .4, armR: 1.4 + .7 * seg(lt, 8.8, 9.8), look: 1, seedKey: 'viviA' });
        // she tears it: two halves separate and fall away
        const tear = ease(seg(lt, 10.2, 12.8));
        if (tear > 0) {
          ctx.save();
          ctx.globalAlpha = 1 - tear * .85;
          ctx.translate(980, 700);
          scroll(ctx, { x: -tear * 300, y: tear * 60, w: 680, h: 130, rot: -tear * .35, open: 1, key: 'scr2' });
          scroll(ctx, { x: tear * 300, y: tear * 90, w: 680, h: 130, rot: tear * .45, open: 1, key: 'scr3' });
          ctx.restore();
        }
      });
    } },

  // ---------------------------------------------------------------- D1 ----
  { // "O bug caro quase nunca está na conta. Ele está na conversa que ninguém teve."
    id: 'd1-talk', start: 174.38, end: 182.66,
    draw(ctx, lt, t) {
      withCam(ctx, cam(lt, { cx: [[0, 960]], cy: [[0, 620]], z: [[0, 1.04], [8.2, 1.12]] }), () => {
        studio(ctx, t, { lit: 1, lampSwing: 1 });
        // the account: a stack of coins that topples and rolls away, meaning nothing
        const fall = ease(seg(lt, 1.2, 3.6));
        for (let i = 0; i < 5; i++) {
          const k = clamp(fall * 5 - i);
          const x = 1080 + i * 4 + k * (160 + i * 40), y = 736 - i * 26 + k * (i * 30);
          ctx.save();
          ctx.globalAlpha = 1 - k * .85;
          paint(ctx, ellPts(x, y, 42, 14, 18), { wash: PAL.ochre, alpha: .24, ink: PAL.ink, sw: 1.8, key: 'coin' + i });
          ctx.restore();
        }
        // two people, one conversation that is not happening
        vivi(ctx, { x: 560, y: 655, u: 48, t, mood: lt > 4 ? 'talk' : 'idle', armL: .4, armR: lt > 4.6 ? 1.8 : .8, look: 1, seedKey: 'viviA' });
        vivi(ctx, { x: 1380, y: 658, u: 46, t, mood: 'idle', armL: .5 + .08 * wob(t, .5), armR: .8, look: -1, seedKey: 'col1' });
        // the gap between them: a thin unpainted strip of paper
        const gapK = clamp(seg(lt, 5.4, 7.4));
        if (gapK > 0) {
          ctx.save();
          ctx.globalAlpha = gapK * .9;
          paint(ctx, rectPts(930, 400, 60 * gapK, 330), { wash: PAL.paper, alpha: .5, edge: false, key: 'gapD' });
          ink(ctx, [[960, 420], [960, 730]], { w: 1.6, col: hexA(PAL.ink, .35), key: 'gapline' });
          ctx.restore();
        }
        mark(ctx, { x: 960, y: 320, u: 26, kind: '?', alpha: gapK * .8, key: 'emD1' });
        fore(ctx, t, 'left');
      });
    } },

  // ---------------------------------------------------------------- D2 ----
  { // "Escolhe uma parte do sistema e pergunta em voz alta... Eu sou a Vivi e esse foi o Podcast Inteligente."
    id: 'd2-signoff', start: 182.66, end: 197.40,
    draw(ctx, lt, t) {
      const z = lerp(1.04, 1.18, ease(seg(lt, 0, 14.7)));
      withCam(ctx, cam(lt, { cx: [[0, 900], [14.7, 940]], cy: [[0, 610], [14.7, 560]], z: [[0, z]] }), () => {
        const dim = .55 * ease(seg(lt, 11.4, 14.4));
        studio(ctx, t, { lit: 1 - .55 * seg(lt, 11.4, 14.4), dim, lampSwing: 0 });
        // the two motifs from the opening come back, small, at the edge of the desk
        rocket(ctx, { x: 1660, y: 660, u: 26, rot: -.2, t, thrust: .2 * pulse(t), key: 'rkE' });
        sketchbook(ctx, { x: 250, y: 660, w: 150, h: 106, rot: -.12, t, key: 'sbE' });
        const wave = Math.sin(t * 8) * .5;
        vivi(ctx, {
          x: 900, y: 640, u: 60, t, seedKey: 'viviA', mood: lt < 9.6 ? 'talk' : 'happy',
          armR: lt < 9.6 ? .95 : 2.35 + wave * .35, armL: .5, look: 0,
        });
        // the signature: one ink spiral, held on the last beat
        const sig = clamp(seg(lt, 10.6, 13.4));
        if (sig > 0) {
          const P = [];
          for (let i = 0; i < 40 * sig; i++) {
            const a = i / 6, r = 8 + i * 2.4;
            P.push([1500 + Math.cos(a) * r, 240 + Math.sin(a) * r]);
          }
          ink(ctx, P, { w: 3.2, col: PAL.inkSoft, key: 'sig' });
        }
      });
    } },
];

export default SHOTS;
