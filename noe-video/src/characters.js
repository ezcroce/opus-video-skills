// characters.js — the Noah cartoon cast, built from rounded primitives.
import * as THREE from 'three';
import { mat, outlined, addOutline, canvasTexture, giraffeTexture, stripeTexture, makeBlobShadow, hash, TAU, lerp, clamp } from './engine.js';

const SKIN = 0xe8b98a, SKIN_DARK = 0xd9a273, WHITE = 0xf7f1e6, DARK = 0x3a2a22;

function capsule(radius, length, material, seg = 8) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, seg), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sphere(radius, material, w = 16, h = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, w, h), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, material, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function createPerson(cfg = {}) {
  const c = {
    skin: cfg.skin ?? SKIN, robe: cfg.robe ?? 0xb98a55, robeDark: cfg.robeDark ?? 0x8a5f38,
    sash: cfg.sash ?? 0x7a4a2a, wrap: cfg.wrap ?? 0xe6d7bd, wrapColor: cfg.wrapColor ?? 0xe6d7bd,
    beard: cfg.beard ?? null, beardColor: cfg.beardColor ?? 0xf2ede2, hair: cfg.hair ?? 0x4a3020,
    female: cfg.female ?? false, child: cfg.child ?? false, staff: cfg.staff ?? false,
    eye: cfg.eye ?? 0x3a2a1a, scale: cfg.scale ?? 1, bulk: cfg.bulk ?? 1,
  };
  const g = new THREE.Group();
  const skinM = mat(c.skin, { roughness: 0.62 });
  const robeM = mat(c.robe, { roughness: 0.92 });
  const robeDarkM = mat(c.robeDark, { roughness: 0.95 });
  const sashM = mat(c.sash, { roughness: 0.9 });
  const wrapM = mat(c.wrapColor, { roughness: 0.95 });
  const hairM = mat(c.hair, { roughness: 0.9 });
  const whiteM = mat(c.beardColor, { roughness: 0.95 });
  const darkM = mat(DARK, { roughness: 0.6 });
  const eyeM = mat(c.eye, { roughness: 0.35 });
  const whiteEyeM = mat(0xfbf7ee, { roughness: 0.3 });

  const profile = [
    [0.0, 0.0], [0.40 * c.bulk, 0.02], [0.37 * c.bulk, 0.16], [0.31 * c.bulk, 0.55],
    [0.275 * c.bulk, 0.95], [0.245 * c.bulk, 1.18], [0.19 * c.bulk, 1.30], [0.0, 1.33],
  ].map(p => new THREE.Vector2(p[0], p[1]));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), robeM);
  body.castShadow = true; body.receiveShadow = true; addOutline(body, 0.010, 0x3a2418); g.add(body);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.285 * c.bulk, 0.035, 6, 20), sashM);
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.98; belt.castShadow = true; g.add(belt);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.95, 0.025), sashM);
  sash.position.set(0.02, 0.78, 0.275 * c.bulk); sash.rotation.z = 0.42; sash.castShadow = true; g.add(sash);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.165 * c.bulk, 0.032, 6, 18), robeDarkM);
  collar.rotation.x = Math.PI / 2; collar.position.y = 1.30; g.add(collar);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.12, 0.42, 0);
    const shin = capsule(0.065, 0.26, skinM); shin.position.y = -0.18; leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.24), mat(0x6b4a2e, { roughness: 1 }));
    foot.position.set(0, -0.36, 0.05); foot.castShadow = true; leg.add(foot);
    g.add(leg); legs.push(leg);
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.265 * c.bulk, 1.24, 0);
    const shoulder = sphere(0.10, robeM); shoulder.position.y = -0.01; arm.add(shoulder);
    const upper = capsule(0.062, 0.20, robeM); upper.position.y = -0.15; arm.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.29; arm.add(elbow);
    const fore = capsule(0.050, 0.19, skinM); fore.position.y = -0.12; elbow.add(fore);
    const hand = sphere(0.062, skinM); hand.position.y = -0.25; elbow.add(hand);
    elbow.rotation.x = -0.12;
    g.add(arm); arms.push(arm);
  }

  const head = new THREE.Group(); head.position.y = 1.49; g.add(head);
  const neck = cyl(0.075, 0.085, 0.14, skinM); neck.position.y = -0.06; head.add(neck);
  const skull = sphere(0.205, skinM, 20, 16); skull.position.y = 0.09; skull.scale.set(1, 1.04, 0.96); head.add(skull);
  addOutline(skull, 0.008, 0x3a2418);
  const earL = sphere(0.045, skinM, 10, 8); earL.position.set(-0.20, 0.08, 0.0); head.add(earL);
  const earR = earL.clone(); earR.position.x = 0.20; head.add(earR);

  if (c.female) {
    const scarf = sphere(0.222, wrapM, 20, 16); scarf.position.set(0, 0.10, -0.012); scarf.scale.set(1.02, 1.02, 1.0); head.add(scarf);
    const face = sphere(0.196, skinM, 20, 16); face.position.set(0, 0.075, 0.035); face.scale.set(0.98, 1.0, 0.92); head.add(face);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.198, 0.028, 6, 20), robeDarkM);
    band.rotation.x = Math.PI / 2; band.position.set(0, 0.155, 0.01); head.add(band);
    const drape = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.55, 10, 1, true), wrapM);
    drape.position.set(0, -0.18, -0.14); drape.rotation.x = 0.18; head.add(drape);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.212, 20, 14, 0, TAU, 0, Math.PI * 0.58), hairM);
    cap.position.y = 0.10; cap.castShadow = true; head.add(cap);
    if (c.wrap) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.030, 6, 20), wrapM);
      band.rotation.x = Math.PI / 2; band.position.y = 0.175; head.add(band);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8, 1, true), wrapM);
      tail.position.set(0, -0.02, -0.19); tail.rotation.x = -0.25; head.add(tail);
    }
  }

  const eyes = [], pupils = [], lids = [], brows = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * 0.077, 0.105, 0.172); head.add(eye);
    const w = sphere(0.047, whiteEyeM, 14, 10); w.scale.set(1, 1.05, 0.55); eye.add(w);
    const p = sphere(0.023, eyeM, 12, 8); p.position.set(side * 0.004, 0.0, 0.030); p.scale.set(1, 1, 0.5); eye.add(p);
    const hi = sphere(0.008, mat(0xffffff, { roughness: 0.2 }), 8, 6); hi.position.set(side * 0.008, 0.010, 0.043); eye.add(hi);
    const lid = sphere(0.050, skinM, 14, 10); lid.scale.set(1.02, 0.12, 0.62); lid.position.set(0, 0.040, 0.004); eye.add(lid);
    const brow = capsule(0.017, 0.075, c.beard ? whiteM : hairM, 6);
    brow.rotation.z = Math.PI / 2 + side * 0.10; brow.position.set(side * 0.078, 0.178, 0.176); head.add(brow);
    eyes.push(eye); pupils.push(p); lids.push(lid); brows.push(brow);
  }
  const nose = sphere(0.040, skinM, 12, 10); nose.position.set(0, 0.045, 0.205); nose.scale.set(0.9, 0.85, 1.25); head.add(nose);

  const mouthGroup = new THREE.Group(); mouthGroup.position.set(0, -0.035, 0.185); head.add(mouthGroup);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 6, 14, Math.PI * 0.85), darkM);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.85) / 2; mouthGroup.add(smile);
  const frown = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.010, 6, 14, Math.PI * 0.75), darkM);
  frown.rotation.z = (Math.PI - Math.PI * 0.75) / 2; frown.visible = false; mouthGroup.add(frown);
  const open = sphere(0.045, darkM, 12, 8); open.scale.set(1, 0.75, 0.35); open.position.z = 0.005; open.visible = false; mouthGroup.add(open);

  let beardGroup = null;
  if (c.beard) {
    beardGroup = new THREE.Group(); beardGroup.position.set(0, -0.08, 0.10); head.add(beardGroup);
    if (c.beard === 'long') {
      const core = sphere(0.145, whiteM, 16, 12); core.scale.set(1.0, 1.55, 0.62); core.position.set(0, -0.16, 0.02); beardGroup.add(core);
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 1.5;
        const tuft = sphere(0.062 + hash(i) * 0.02, whiteM, 10, 8);
        tuft.scale.set(0.8, 1.5, 0.55);
        tuft.position.set(Math.sin(a) * 0.13, -0.22 - Math.cos(a) * 0.08, 0.05 + Math.cos(a) * 0.02);
        beardGroup.add(tuft);
      }
      const stacheL = capsule(0.022, 0.10, whiteM, 6); stacheL.rotation.z = 1.25; stacheL.position.set(-0.055, 0.005, 0.10); beardGroup.add(stacheL);
      const stacheR = stacheL.clone(); stacheR.rotation.z = -1.25; stacheR.position.x = 0.055; beardGroup.add(stacheR);
    } else {
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.195, 16, 12, 0, TAU, Math.PI * 0.52, Math.PI * 0.30), hairM);
      jaw.position.set(0, 0.075, 0.005); jaw.scale.set(1.0, 1.0, 0.98); beardGroup.add(jaw);
      const stache = capsule(0.020, 0.09, hairM, 6); stache.rotation.z = Math.PI / 2; stache.position.set(0, 0.0, 0.185); beardGroup.add(stache);
    }
  }

  let staff = null;
  if (c.staff) {
    staff = new THREE.Group();
    const pole = cyl(0.024, 0.030, 1.95, mat(0x7a5230, { roughness: 0.9 }), 8);
    pole.position.y = 0.35; staff.add(pole);
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 6, 14, Math.PI * 1.25), mat(0x7a5230, { roughness: 0.9 }));
    crook.position.set(0, 1.33, 0); crook.rotation.z = -0.4; staff.add(crook);
    staff.position.set(0.30, 0.78, 0.06); staff.rotation.z = -0.06;
    g.add(staff);
  }

  const blob = makeBlobShadow(0.42 * c.bulk, 0.40); g.add(blob);
  g.scale.setScalar(c.scale * (c.child ? 0.62 : 1));
  const P = {
    group: g, head, eyes, pupils, lids, brows, mouth: mouthGroup, smile, frown, open,
    beard: beardGroup, arms, legs, staff, body, cfg: c, phase: hash(cfg.seed ?? 1) * 10,
    mode: 'idle', expr: 'kind',
  };
  return P;
}

const EXPR = {
  kind:      { brow: 0.00, lid: 0.10, smile: 1, frown: 0, open: 0, headX: 0.02, headZ: 0.00 },
  neutral:   { brow: 0.00, lid: 0.16, smile: 0.55, frown: 0, open: 0, headX: 0.00, headZ: 0.00 },
  sad:       { brow: 0.22, lid: 0.30, smile: 0, frown: 1, open: 0, headX: 0.10, headZ: 0.00 },
  worried:   { brow: 0.26, lid: 0.05, smile: 0, frown: 0.8, open: 0.15, headX: 0.04, headZ: 0.00 },
  surprised: { brow: 0.38, lid: 0.00, smile: 0, frown: 0, open: 1, headX: -0.06, headZ: 0.00 },
  awe:       { brow: 0.30, lid: 0.00, smile: 0.15, frown: 0, open: 0.75, headX: -0.16, headZ: 0.00 },
  joyful:    { brow: 0.10, lid: 0.42, smile: 1, frown: 0, open: 0.35, headX: -0.04, headZ: 0.00 },
  peaceful:  { brow: 0.02, lid: 0.95, smile: 0.8, frown: 0, open: 0, headX: 0.03, headZ: 0.00 },
  determined:{ brow: -0.16, lid: 0.12, smile: 0.25, frown: 0, open: 0, headX: 0.02, headZ: 0.00 },
  angry:     { brow: -0.28, lid: 0.10, smile: 0, frown: 1, open: 0.2, headX: 0.04, headZ: 0.00 },
};

export function setExpression(P, name, weight = 1) {
  const e = EXPR[name] || EXPR.kind;
  P.expr = name;
  const w = weight;
  P.brows.forEach((b, i) => {
    const side = i === 0 ? -1 : 1;
    b.rotation.z = Math.PI / 2 + side * (0.10 - e.brow * side * 0.9) * w;
    b.position.y = 0.178 + e.brow * 0.018 * w;
  });
  P.lids.forEach(l => { l.scale.y = 0.12 + e.lid * 1.05 * w; l.position.y = 0.040 + e.lid * 0.020 * w; });
  P.smile.visible = e.smile > 0.02;
  P.frown.visible = e.frown > 0.02;
  P.open.visible = e.open > 0.02;
  P.smile.scale.setScalar(0.6 + e.smile * 0.55);
  P.frown.scale.setScalar(0.6 + e.frown * 0.55);
  P.open.scale.set(0.7 + e.open * 0.5, 0.4 + e.open * 0.6, 0.35);
  P.head.rotation.x = e.headX * w;
  P.head.rotation.z = e.headZ * w;
}

function blinkAmount(t, seed) {
  const p = (t + seed * 2.13) % 4.6;
  if (p < 0.13) return Math.sin(p / 0.13 * Math.PI);
  return 0;
}

export function updatePerson(P, t, mode = 'idle', opts = {}) {
  const s = opts.speed ?? 1;
  if (P.baseY === undefined) P.baseY = P.group.position.y;
  const breathe = Math.sin(t * 1.5 + P.phase) * 0.008;
  P.group.position.y = (opts.baseY ?? P.baseY) + breathe;
  P.body.scale.set(1 + breathe * 0.4, 1, 1 + breathe * 0.4);
  P.head.rotation.y = Math.sin(t * 0.55 + P.phase) * 0.05 + (opts.headY ?? 0);
  P.head.rotation.x += Math.sin(t * 0.8 + P.phase) * 0.012;
  P.arms[0].rotation.x = Math.sin(t * 1.2 + P.phase) * 0.035;
  P.arms[1].rotation.x = -Math.sin(t * 1.2 + P.phase) * 0.035;
  P.arms[0].rotation.z = 0.06; P.arms[1].rotation.z = -0.06;
  P.legs[0].rotation.x = 0; P.legs[1].rotation.x = 0;
  const bl = blinkAmount(t, P.phase);
  P.lids.forEach(l => { l.scale.y = Math.max(l.scale.y, 0.12 + bl * 1.05); });

  if (mode === 'walk' || mode === 'run') {
    const sp = mode === 'run' ? 2.1 : 1;
    const p2 = t * 5.2 * s * sp + P.phase;
    const swing = Math.sin(p2) * (mode === 'run' ? 0.75 : 0.48);
    P.legs[0].rotation.x = swing; P.legs[1].rotation.x = -swing;
    P.arms[0].rotation.x = -swing * 0.8; P.arms[1].rotation.x = swing * 0.8;
    P.group.position.y = (opts.baseY ?? P.baseY) + Math.abs(Math.sin(p2)) * (mode === 'run' ? 0.09 : 0.035);
    P.head.rotation.z = Math.sin(p2) * 0.025;
    P.body.rotation.z = Math.sin(p2) * 0.02;
  } else if (mode === 'hammer') {
    const p2 = t * 7.5 + P.phase;
    P.arms[1].rotation.x = -1.25 + Math.sin(p2) * 0.85;
    P.arms[1].rotation.z = -0.25;
    P.arms[0].rotation.x = -0.55; P.arms[0].rotation.z = 0.35;
    P.body.rotation.x = 0.06 + Math.sin(p2) * 0.03;
    P.head.rotation.x = 0.18;
  } else if (mode === 'listen') {
    P.head.rotation.x = -0.12; P.head.rotation.z = 0.06;
    P.arms[0].rotation.x = -0.35; P.arms[0].rotation.z = 0.55;
    P.arms[1].rotation.x = -0.15; P.arms[1].rotation.z = -0.12;
    P.body.rotation.x = -0.02;
  } else if (mode === 'point') {
    P.arms[1].rotation.x = -2.25; P.arms[1].rotation.z = -0.18;
    P.arms[0].rotation.x = -0.15;
    P.head.rotation.x = -0.22;
  } else if (mode === 'lookUp') {
    P.head.rotation.x = -0.30; P.head.rotation.z = 0.04;
    P.arms[0].rotation.x = -0.25; P.arms[0].rotation.z = 0.35;
    P.arms[1].rotation.x = -0.20; P.arms[1].rotation.z = -0.30;
  } else if (mode === 'reassure') {
    P.arms[0].rotation.x = -1.15; P.arms[0].rotation.z = 0.55;
    P.arms[1].rotation.x = -0.55; P.arms[1].rotation.z = -0.25;
    P.head.rotation.z = 0.08; P.head.rotation.x = 0.04;
  } else if (mode === 'carry') {
    P.arms[0].rotation.x = -1.25; P.arms[1].rotation.x = -1.25;
    P.arms[0].rotation.z = 0.22; P.arms[1].rotation.z = -0.22;
  } else if (mode === 'wave') {
    P.arms[1].rotation.x = -2.5; P.arms[1].rotation.z = -0.35 + Math.sin(t * 6) * 0.22;
    P.head.rotation.x = -0.08;
  } else if (mode === 'sad') {
    P.head.rotation.x = 0.16; P.head.rotation.z = -0.04;
    P.arms[0].rotation.x = 0.05; P.arms[1].rotation.x = 0.05;
    P.body.rotation.x = 0.03;
  }
  if (P.staff) {
    P.staff.rotation.z = -0.06 + Math.sin(t * 1.1 + P.phase) * 0.012;
    P.staff.position.y = 0.78 + breathe;
  }
}

export function createNoah(opts = {}) {
  const P = createPerson({
    robe: 0xc9a06a, robeDark: 0x9a7444, sash: 0x7d4f2c, wrap: 0xefe2c8, wrapColor: 0xefe2c8,
    beard: 'long', beardColor: 0xf4efe4, hair: 0xf4efe4, staff: true, skin: 0xe3b183, seed: 3, ...opts,
  });
  setExpression(P, 'kind');
  return P;
}
export function createWife(opts = {}) {
  const P = createPerson({ female: true, robe: 0x5f8f8a, robeDark: 0x3f6b68, sash: 0x8a5a3a, wrapColor: 0xd9c7a6, skin: 0xe6b78c, seed: 5, ...opts });
  setExpression(P, 'kind'); return P;
}
export function createSon(opts = {}) {
  const P = createPerson({ robe: 0xa8743f, robeDark: 0x7a4f2a, sash: 0x5f3f24, wrap: true, wrapColor: 0xd8c39a, beard: 'short', beardColor: 0x4a3020, hair: 0x3a2418, skin: 0xd9a273, seed: 7, ...opts });
  setExpression(P, 'neutral'); return P;
}
export function createDaughter(opts = {}) {
  const P = createPerson({ female: true, robe: 0xb06a6a, robeDark: 0x7d4444, sash: 0x6b4a2a, wrapColor: 0xe0c9a8, skin: 0xe8b98a, seed: 9, ...opts });
  setExpression(P, 'kind'); return P;
}
export function createChild(opts = {}) {
  const P = createPerson({ child: true, robe: 0xd9a441, robeDark: 0xa87a28, sash: 0x7a4a2a, wrap: false, hair: 0x5a3a20, skin: 0xe8b98a, seed: 11, ...opts });
  setExpression(P, 'joyful'); return P;
}

function animalBase() { return new THREE.Group(); }

export function createElephant(opts = {}) {
  const g = animalBase();
  const grey = mat(opts.color ?? 0xb8c0c8, { roughness: 0.95 });
  const dark = mat(0x9aa3ad, { roughness: 0.95 });
  const body = sphere(1.0, grey, 18, 14); body.scale.set(1.15, 0.95, 1.45); body.position.y = 1.55; g.add(body); addOutline(body, 0.018, 0x3a3f45);
  const head = sphere(0.72, grey, 18, 14); head.position.set(0, 1.95, 1.25); head.scale.set(1, 0.95, 0.9); g.add(head); addOutline(head, 0.016, 0x3a3f45);
  const earL = sphere(0.55, dark, 14, 10); earL.scale.set(0.18, 1.0, 0.85); earL.position.set(-0.66, 2.02, 1.18); g.add(earL);
  const earR = earL.clone(); earR.position.x = 0.66; g.add(earR);
  const trunk = new THREE.Group(); trunk.position.set(0, 1.72, 1.72); g.add(trunk);
  let ty = 0, tz = 0;
  for (let i = 0; i < 7; i++) {
    const seg = cyl(0.16 - i * 0.017, 0.18 - i * 0.017, 0.30, grey, 8);
    seg.position.set(0, ty, tz); seg.rotation.x = 0.25 + i * 0.10; trunk.add(seg);
    ty -= 0.24; tz += 0.10 + i * 0.012;
  }
  const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 8), mat(0xf2ead6, { roughness: 0.5 }));
  tuskL.position.set(-0.28, 1.55, 1.78); tuskL.rotation.x = 1.2; tuskL.rotation.z = 0.2; g.add(tuskL);
  const tuskR = tuskL.clone(); tuskR.position.x = 0.28; tuskR.rotation.z = -0.2; g.add(tuskR);
  const eyeL = sphere(0.07, mat(0x2a2018), 10, 8); eyeL.position.set(-0.28, 2.10, 1.80); g.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.28; g.add(eyeR);
  const legs = [];
  for (const [x, z] of [[-0.55, 0.85], [0.55, 0.85], [-0.55, -0.85], [0.55, -0.85]]) {
    const leg = new THREE.Group(); leg.position.set(x, 1.0, z);
    const l = cyl(0.22, 0.26, 0.95, grey, 8); l.position.y = -0.45; leg.add(l); g.add(leg); legs.push(leg);
  }
  const tail = cyl(0.03, 0.05, 0.7, dark, 6); tail.position.set(0, 1.6, -1.42); tail.rotation.x = -0.4; g.add(tail);
  g.userData = { legs, head, trunk, type: 'elephant' };
  g.add(makeBlobShadow(1.25, 0.38));
  return g;
}

export function createGiraffe(opts = {}) {
  const g = animalBase();
  const tex = giraffeTexture('#f0c86a', '#a8602a');
  const skin = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const plain = mat(0xf0c86a, { roughness: 0.9 });
  const body = sphere(0.85, skin, 18, 14); body.scale.set(0.85, 0.9, 1.35); body.position.y = 2.1; g.add(body); addOutline(body, 0.016, 0x5a3a1a);
  const neck = new THREE.Group(); neck.position.set(0, 2.45, 0.85); g.add(neck);
  for (let i = 0; i < 4; i++) {
    const seg = cyl(0.24 - i * 0.025, 0.27 - i * 0.025, 0.55, skin, 10);
    seg.position.set(0, i * 0.48, i * 0.06); seg.rotation.x = 0.12; neck.add(seg);
  }
  const head = sphere(0.34, plain, 14, 10); head.scale.set(0.8, 0.9, 1.25); head.position.set(0, 2.0, 0.28); neck.add(head); addOutline(head, 0.012, 0x5a3a1a);
  const snout = sphere(0.20, plain, 12, 8); snout.scale.set(0.8, 0.7, 1.2); snout.position.set(0, 1.92, 0.58); neck.add(snout);
  for (const side of [-1, 1]) {
    const oss = cyl(0.035, 0.05, 0.28, mat(0x6b4a2a), 6); oss.position.set(side * 0.13, 2.28, 0.22); neck.add(oss);
    const ear = sphere(0.10, plain, 8, 6); ear.scale.set(0.4, 1, 0.7); ear.position.set(side * 0.30, 2.16, 0.18); neck.add(ear);
    const eye = sphere(0.055, mat(0x2a2018), 8, 6); eye.position.set(side * 0.20, 2.06, 0.50); neck.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[-0.42, 0.72], [0.42, 0.72], [-0.42, -0.72], [0.42, -0.72]]) {
    const leg = new THREE.Group(); leg.position.set(x, 1.55, z);
    const l = cyl(0.11, 0.13, 1.5, plain, 7); l.position.y = -0.75; leg.add(l); g.add(leg); legs.push(leg);
  }
  const tail = cyl(0.025, 0.04, 0.8, mat(0x8a4f24), 6); tail.position.set(0, 2.0, -1.15); tail.rotation.x = -0.5; g.add(tail);
  g.userData = { legs, neck, head, type: 'giraffe' };
  g.add(makeBlobShadow(0.85, 0.34));
  return g;
}

export function createLion(opts = {}) {
  const g = animalBase();
  const fur = mat(opts.color ?? 0xe8b85a, { roughness: 1 });
  const maneM = mat(0xa8602a, { roughness: 1 });
  const body = sphere(0.62, fur, 16, 12); body.scale.set(0.9, 0.9, 1.5); body.position.y = 1.05; g.add(body); addOutline(body, 0.014, 0x4a2a10);
  const head = sphere(0.42, fur, 16, 12); head.position.set(0, 1.45, 0.85); g.add(head); addOutline(head, 0.012, 0x4a2a10);
  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.16, 8, 16), maneM);
  mane.position.set(0, 1.45, 0.72); mane.rotation.x = 0.1; g.add(mane);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU;
    const tuft = sphere(0.15, maneM, 8, 6); tuft.position.set(Math.cos(a) * 0.42, 1.45 + Math.sin(a) * 0.42, 0.70); g.add(tuft);
  }
  const snout = sphere(0.20, fur, 12, 8); snout.scale.set(1, 0.8, 1.1); snout.position.set(0, 1.36, 1.18); g.add(snout);
  const nose = sphere(0.06, mat(0x3a2018), 8, 6); nose.position.set(0, 1.42, 1.34); g.add(nose);
  for (const side of [-1, 1]) {
    const eye = sphere(0.055, mat(0x2a2018), 8, 6); eye.position.set(side * 0.16, 1.55, 1.16); g.add(eye);
    const ear = sphere(0.10, fur, 8, 6); ear.scale.set(1, 1, 0.5); ear.position.set(side * 0.30, 1.78, 0.78); g.add(ear);
  }
  const legs = [];
  for (const [x, z] of [[-0.32, 0.62], [0.32, 0.62], [-0.32, -0.62], [0.32, -0.62]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.72, z);
    const l = capsule(0.10, 0.42, fur, 7); l.position.y = -0.25; leg.add(l); g.add(leg); legs.push(leg);
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.15, -0.9); g.add(tail);
  const tm = cyl(0.03, 0.04, 0.8, fur, 6); tm.rotation.x = -0.9; tm.position.set(0, 0.1, -0.3); tail.add(tm);
  const tuft = sphere(0.10, maneM, 8, 6); tuft.position.set(0, 0.35, -0.65); tail.add(tuft);
  g.userData = { legs, head, tail, type: 'lion' };
  g.add(makeBlobShadow(0.65, 0.36));
  return g;
}

export function createZebra(opts = {}) {
  const g = animalBase();
  const tex = stripeTexture();
  const skin = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const dark = mat(0x2c2a2a, { roughness: 0.9 });
  const body = sphere(0.62, skin, 16, 12); body.scale.set(0.85, 0.9, 1.45); body.position.y = 1.25; g.add(body); addOutline(body, 0.014, 0x2a2018);
  const neck = cyl(0.20, 0.28, 0.85, skin, 10); neck.position.set(0, 1.75, 0.72); neck.rotation.x = 0.45; g.add(neck);
  const head = sphere(0.30, skin, 14, 10); head.scale.set(0.8, 0.9, 1.35); head.position.set(0, 2.15, 1.08); g.add(head); addOutline(head, 0.012, 0x2a2018);
  const snout = sphere(0.18, dark, 10, 8); snout.scale.set(0.8, 0.7, 1.1); snout.position.set(0, 2.06, 1.38); g.add(snout);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), skin); ear.position.set(side * 0.16, 2.42, 1.02); ear.rotation.z = side * 0.2; g.add(ear);
    const eye = sphere(0.05, mat(0x2a2018), 8, 6); eye.position.set(side * 0.18, 2.22, 1.30); g.add(eye);
  }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.16), dark); mane.position.set(0, 2.05, 0.72); mane.rotation.x = 0.45; g.add(mane);
  const legs = [];
  for (const [x, z] of [[-0.30, 0.62], [0.30, 0.62], [-0.30, -0.62], [0.30, -0.62]]) {
    const leg = new THREE.Group(); leg.position.set(x, 0.85, z);
    const l = cyl(0.075, 0.09, 0.85, skin, 7); l.position.y = -0.42; leg.add(l); g.add(leg); legs.push(leg);
  }
  const tail = cyl(0.025, 0.04, 0.6, dark, 6); tail.position.set(0, 1.35, -0.88); tail.rotation.x = -0.5; g.add(tail);
  g.userData = { legs, head, type: 'zebra' };
  g.add(makeBlobShadow(0.62, 0.34));
  return g;
}

export function createRabbit(opts = {}) {
  const g = animalBase();
  const fur = mat(opts.color ?? 0xffffff, { roughness: 1 });
  const body = sphere(0.30, fur, 14, 10); body.scale.set(0.9, 1.0, 1.15); body.position.y = 0.42; g.add(body); addOutline(body, 0.010, 0x6a5a4a);
  const head = sphere(0.24, fur, 14, 10); head.position.set(0, 0.78, 0.16); g.add(head); addOutline(head, 0.008, 0x6a5a4a);
  for (const side of [-1, 1]) {
    const ear = capsule(0.055, 0.34, fur, 7); ear.position.set(side * 0.10, 1.12, 0.10); ear.rotation.z = side * 0.12; g.add(ear);
    const eye = sphere(0.035, mat(0x2a2018), 8, 6); eye.position.set(side * 0.10, 0.82, 0.36); g.add(eye);
  }
  const nose = sphere(0.035, mat(0xd98a8a), 8, 6); nose.position.set(0, 0.74, 0.39); g.add(nose);
  const tail = sphere(0.10, fur, 8, 6); tail.position.set(0, 0.45, -0.32); g.add(tail);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.14, 0.22, 0.05);
    const l = capsule(0.06, 0.10, fur, 6); l.position.y = -0.08; leg.add(l); g.add(leg); legs.push(leg);
  }
  g.userData = { legs, head, type: 'rabbit' };
  g.add(makeBlobShadow(0.30, 0.32));
  return g;
}

export function createDove(opts = {}) {
  const g = animalBase();
  const white = mat(opts.color ?? 0xf7f4ec, { roughness: 0.9 });
  const grey = mat(0xd8d4c8, { roughness: 0.9 });
  const body = sphere(0.20, white, 14, 10); body.scale.set(0.85, 0.85, 1.35); g.add(body); addOutline(body, 0.008, 0x6a6258);
  const head = sphere(0.13, white, 12, 8); head.position.set(0, 0.16, 0.22); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), mat(0xd9a441)); beak.position.set(0, 0.14, 0.36); beak.rotation.x = Math.PI / 2; g.add(beak);
  for (const side of [-1, 1]) {
    const eye = sphere(0.022, mat(0x2a2018), 6, 5); eye.position.set(side * 0.07, 0.19, 0.31); g.add(eye);
  }
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.position.set(side * 0.12, 0.04, 0.0); g.add(wing);
    const w = sphere(0.26, grey, 10, 8); w.scale.set(0.9, 0.12, 0.55); w.position.set(side * 0.18, 0, -0.02); wing.add(w);
    wings.push(wing);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.30, 6), grey); tail.position.set(0, 0.02, -0.30); tail.rotation.x = -Math.PI / 2; g.add(tail);
  g.userData = { wings, head, type: 'dove' };
  return g;
}

export function createAnimal(type, opts = {}) {
  switch (type) {
    case 'elephant': return createElephant(opts);
    case 'giraffe': return createGiraffe(opts);
    case 'lion': return createLion(opts);
    case 'zebra': return createZebra(opts);
    case 'rabbit': return createRabbit(opts);
    case 'dove': return createDove(opts);
    default: return createRabbit(opts);
  }
}

export function updateAnimal(a, t, mode = 'idle', speed = 1) {
  const u = a.userData;
  if (!u) return;
  const ph = t * 5.0 * speed + (a.userData.id || 0);
  if (u.legs) {
    u.legs.forEach((leg, i) => {
      const off = i % 2 === 0 ? 0 : Math.PI;
      leg.rotation.x = mode === 'walk' || mode === 'run' ? Math.sin(ph + off) * (mode === 'run' ? 0.65 : 0.42) : Math.sin(t * 1.2 + i) * 0.02;
    });
  }
  if (u.type === 'dove') {
    u.wings.forEach((w, i) => { w.rotation.z = (i === 0 ? 1 : -1) * (0.25 + Math.sin(t * 12 + i) * 0.55); });
    a.position.y += Math.sin(t * 3 + (a.userData.id || 0)) * 0.0015;
  }
  if (u.head) {
    u.head.rotation.y = Math.sin(t * 0.7 + (a.userData.id || 0)) * 0.06;
    u.head.rotation.x = Math.sin(t * 0.9 + (a.userData.id || 0)) * 0.03;
  }
  if (u.type === 'elephant' && u.trunk) {
    u.trunk.rotation.x = Math.sin(t * 0.9) * 0.08;
    u.trunk.rotation.z = Math.sin(t * 0.7) * 0.10;
  }
  if (u.type === 'giraffe' && u.neck) {
    u.neck.rotation.z = Math.sin(t * 0.6) * 0.03;
  }
  if (u.type === 'lion' && u.tail) {
    u.tail.rotation.z = Math.sin(t * 1.4) * 0.18;
  }
}
