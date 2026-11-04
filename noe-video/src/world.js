// world.js — environments: ancient city, hills, vegetation, particles.
import * as THREE from 'three';
import {
  mat, basicMat, outlined, addOutline, canvasTexture, sandTexture, stoneTexture, woodTexture,
  makePalm, makeRock, makeBush, makeGrassTuft, makeGlow, hash, hash2, TAU, lerp, clamp, smoothstep,
} from './engine.js';
import { createPerson, createChild, updatePerson, setExpression } from './characters.js';

export function createGround({ size = 400, color = 0xd9b47a, y = 0, texture = true, repeat = 8 } = {}) {
  const tex = texture ? sandTexture(color) : null;
  if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repeat, repeat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : color, map: tex, roughness: 1, metalness: 0,
  }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return m;
}

export function createHill({ x = 0, z = 0, r = 30, h = 10, color = 0x7fa85a, seed = 1, flat = true } = {}) {
  const geo = new THREE.SphereGeometry(r, 24, 12, 0, TAU, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const n = 0.85 + hash2(px * 0.15 + seed, pz * 0.15) * 0.3;
    pos.setXYZ(i, px * n, py * (h / r) * n, pz * n);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { flat, roughness: 1 }));
  m.position.set(x, 0, z); m.receiveShadow = true; m.castShadow = true;
  return m;
}

export function createTree({ scale = 1, type = 'olive', seed = 1 } = {}) {
  const g = new THREE.Group();
  const trunkM = mat(0x7a5230, { roughness: 1 });
  const leafM = mat(type === 'olive' ? 0x6f9a4a : 0x4f8f3a, { roughness: 1, flat: true });
  const h = 2.2 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, h, 7), trunkM);
  trunk.position.y = h / 2; trunk.rotation.z = (hash(seed) - 0.5) * 0.18; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + hash(seed) * 2;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.09 * scale, h * 0.55, 5), trunkM);
    br.position.set(Math.cos(a) * 0.35 * scale, h * 0.78, Math.sin(a) * 0.35 * scale);
    br.rotation.z = Math.cos(a) * 0.7; br.rotation.x = Math.sin(a) * 0.7; br.castShadow = true; g.add(br);
  }
  for (let i = 0; i < 7; i++) {
    const a = hash(seed + i * 3.1) * TAU, rr = (0.4 + hash(seed + i) * 0.8) * scale;
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry((0.55 + hash(i + seed) * 0.35) * scale, 1), leafM);
    s.position.set(Math.cos(a) * rr, h * (0.85 + hash(i * 2) * 0.25), Math.sin(a) * rr);
    s.scale.y = 0.8; s.castShadow = true; g.add(s);
  }
  return g;
}

export function createCity() {
  const root = new THREE.Group();
  const people = [];
  const stone = stoneTexture();
  const stoneM = new THREE.MeshStandardMaterial({ map: stone, color: 0xffffff, roughness: 1 });
  const mudM = mat(0xd8a060, { roughness: 1 });
  const mudDark = mat(0xb07a45, { roughness: 1 });
  const woodM = new THREE.MeshStandardMaterial({ map: woodTexture('#8a5a34', '#5f3a1e', 6), roughness: 0.95 });
  const clothM = mat(0xb84a3a, { roughness: 1, side: THREE.DoubleSide });
  const cloth2 = mat(0x3f6f8a, { roughness: 1, side: THREE.DoubleSide });
  const gold = mat(0xe0b040, { roughness: 0.35, metalness: 0.6 });

  const ground = createGround({ size: 220, color: 0xd2a86a, repeat: 10 }); root.add(ground);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(14, 120), new THREE.MeshStandardMaterial({ map: stoneTexture('#d8b07a'), color: 0xffffff, roughness: 1 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0.02, -10); street.receiveShadow = true; root.add(street);

  const building = (x, z, w, d, h, color, seed) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: stone, color, roughness: 1 }));
    base.position.y = h / 2; base.castShadow = true; base.receiveShadow = true; g.add(base);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4), mudDark);
    roof.position.y = h + 0.15; roof.castShadow = true; g.add(roof);
    if (hash(seed) > 0.55) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.42, 16, 10, 0, TAU, 0, Math.PI / 2), mudM);
      dome.position.y = h + 0.3; dome.castShadow = true; g.add(dome);
    }
    const rows = Math.max(1, Math.floor(h / 3));
    for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), mat(0x3a2a22, { roughness: 0.8 }));
      win.position.set((c - 0.5) * w * 0.42, 1.5 + r * 2.6, d / 2 + 0.02); g.add(win);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.08), mudDark);
      frame.position.copy(win.position); frame.position.z -= 0.03; g.add(frame);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.12), woodM);
    door.position.set(0, 1.1, d / 2 + 0.03); g.add(door);
    if (hash(seed + 3) > 0.4) {
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 1.6), hash(seed + 5) > 0.5 ? clothM : cloth2);
      aw.position.set(0, 2.7, d / 2 + 0.8); aw.rotation.x = -0.35; g.add(aw);
      for (const sx of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), woodM);
        pole.position.set(sx * w * 0.32, 1.3, d / 2 + 1.4); g.add(pole);
      }
    }
    for (let i = 0; i < 2; i++) {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat(0xa85a3a, { roughness: 1 }));
      pot.scale.y = 0.8; pot.position.set((hash(seed + i) - 0.5) * w * 0.6, h + 0.5, (hash(seed + i * 2) - 0.5) * d * 0.5); g.add(pot);
    }
    root.add(g);
    return g;
  };

  const palette = [0xffe0b0, 0xf0c890, 0xffe8c0, 0xe8b880, 0xf8d8a8];
  let seed = 1;
  for (let i = 0; i < 7; i++) {
    const z = 20 - i * 11;
    building(-11 - hash(i) * 2, z, 7 + hash(i + 1) * 2, 7, 5 + hash(i + 2) * 5, palette[i % palette.length], seed++);
    building(11 + hash(i + 3) * 2, z - 4, 7 + hash(i + 4) * 2, 7, 4 + hash(i + 5) * 6, palette[(i + 2) % palette.length], seed++);
  }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 9, 3), new THREE.MeshStandardMaterial({ map: stone, color: 0xffffff, roughness: 1 }));
  wall.position.set(0, 4.5, -58); wall.castShadow = true; wall.receiveShadow = true; root.add(wall);
  for (const sx of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 13, 10), new THREE.MeshStandardMaterial({ map: stone, color: 0xffffff, roughness: 1 }));
    tower.position.set(sx * 9, 6.5, -58); tower.castShadow = true; root.add(tower);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 10), mudDark); top.position.set(sx * 9, 14, -58); root.add(top);
  }
  const gate = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 3.2), mat(0x5a3a22, { roughness: 1 })); gate.position.set(0, 3.5, -57.5); root.add(gate);

  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.position.set(-6 + i * 4, 0, 4 - (i % 2) * 5);
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 1.2), woodM); table.position.y = 1.0; table.castShadow = true; g.add(table);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), woodM); leg.position.set(sx * 1.1, 0.5, sz * 0.45); g.add(leg);
    }
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), i % 2 ? clothM : cloth2);
    canopy.position.set(0, 2.6, 0); canopy.rotation.x = -0.25; canopy.castShadow = true; g.add(canopy);
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 5), woodM); pole.position.set(sx * 1.5, 1.3, -0.6); g.add(pole);
    }
    for (let k = 0; k < 5; k++) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat([0xd9a441, 0xb84a3a, 0x7fa85a][k % 3], { roughness: 0.8 }));
      fruit.position.set(-0.8 + k * 0.4, 1.15, 0.1); g.add(fruit);
    }
    root.add(g);
  }

  for (let i = 0; i < 8; i++) {
    const p = makePalm({ height: 5 + hash(i) * 3, seed: i, lean: 0.2 });
    p.position.set((i % 2 ? 1 : -1) * (16 + hash(i) * 8), 0, 18 - i * 9);
    root.add(p);
  }
  for (let i = 0; i < 10; i++) {
    const r = makeRock({ scale: 0.4 + hash(i) * 0.8, seed: i, color: 0xb09070 });
    r.position.set((hash(i * 3) - 0.5) * 40, 0.2, (hash(i * 7) - 0.5) * 50); root.add(r);
  }

  const personSpecs = [
    { x: -3.2, z: 8, rot: 0.5, robe: 0x8a5a3a, wrap: true, beard: 'short', seed: 21, expr: 'angry', mode: 'point' },
    { x: -1.4, z: 8.6, rot: -0.6, robe: 0x5f6f8a, wrap: true, beard: 'short', seed: 22, expr: 'angry', mode: 'point' },
    { x: 3.4, z: 3.2, rot: -0.4, robe: 0x7a4a5a, female: true, seed: 23, expr: 'sad', mode: 'sad' },
    { x: 5.2, z: 1.0, rot: 0.3, robe: 0x9a7444, wrap: true, beard: 'short', seed: 24, expr: 'neutral', mode: 'idle' },
    { x: -5.5, z: -2, rot: 0.2, robe: 0x6a7a4a, female: true, seed: 25, expr: 'worried', mode: 'idle' },
    { x: 0.5, z: -6, rot: 0.1, robe: 0x8a6a4a, wrap: true, beard: 'short', seed: 26, expr: 'angry', mode: 'point' },
    { x: -2.0, z: -10, rot: -0.2, robe: 0x7a5a6a, female: true, seed: 27, expr: 'sad', mode: 'sad' },
    { x: 6.5, z: -12, rot: 0.4, robe: 0x5a6a7a, wrap: true, beard: 'short', seed: 28, expr: 'neutral', mode: 'walk' },
    { x: -7.5, z: -16, rot: 0.1, robe: 0x9a6a4a, female: true, seed: 29, expr: 'worried', mode: 'idle' },
    { x: 2.5, z: -20, rot: 0.2, robe: 0x6a5a4a, wrap: true, beard: 'short', seed: 30, expr: 'sad', mode: 'sad' },
  ];
  for (const s of personSpecs) {
    const P = createPerson({ ...s, skin: [0xe8b98a, 0xd9a273, 0xc98a5a][Math.floor(hash(s.seed) * 3)] });
    P.group.position.set(s.x, 0, s.z); P.group.rotation.y = s.rot;
    setExpression(P, s.expr);
    root.add(P.group); people.push({ P, ...s });
  }
  const child = createChild({ seed: 31 }); child.group.position.set(2.0, 0, 5.8); child.group.rotation.y = -0.4;
  setExpression(child, 'sad'); root.add(child.group); people.push({ P: child, mode: 'sad', expr: 'sad', seed: 31 });

  const beggar = createPerson({ robe: 0x6a5a4a, wrap: true, beard: 'long', beardColor: 0xd8d0c0, skin: 0xc98a5a, seed: 41 });
  beggar.group.position.set(-4.5, 0, 2.0); beggar.group.rotation.y = 0.9; setExpression(beggar, 'sad'); root.add(beggar.group); people.push({ P: beggar, mode: 'sad', expr: 'sad', seed: 41 });
  const rich = createPerson({ robe: 0x8a3a4a, robeDark: 0x5a2030, sash: 0xd9a441, wrap: true, wrapColor: 0x5a2030, skin: 0xd9a273, seed: 42 });
  rich.group.position.set(-2.8, 0, 1.0); rich.group.rotation.y = -1.2; setExpression(rich, 'neutral'); root.add(rich.group); people.push({ P: rich, mode: 'walk', expr: 'neutral', seed: 42 });

  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), gold);
  coin.rotation.x = Math.PI / 2; coin.position.set(-3.6, 0.05, 2.8); root.add(coin);
  for (let i = 0; i < 14; i++) {
    const grain = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), mat(0xd9b45a));
    grain.position.set(-4.0 + hash(i) * 1.2, 0.04, 3.2 + hash(i + 1) * 0.8); root.add(grain);
  }

  const dustGeo = new THREE.BufferGeometry();
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (hash(i * 3.1) - 0.5) * 60; pos[i * 3 + 1] = 0.3 + hash(i * 7.7) * 12; pos[i * 3 + 2] = (hash(i * 5.3) - 0.5) * 60; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe6b0, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  root.add(dust);

  const birds = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    const m = basicMat(0x4a3a2a);
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.12), m); w1.position.x = -0.25; b.add(w1);
    const w2 = w1.clone(); w2.position.x = 0.25; b.add(w2);
    b.position.set((hash(i) - 0.5) * 40, 18 + hash(i + 1) * 8, -20 - hash(i + 2) * 20);
    root.add(b); birds.push({ b, seed: i, w1, w2 });
  }

  root.userData.update = (t) => {
    for (const p of people) {
      updatePerson(p.P, t, p.mode || 'idle');
      if (p.mode === 'walk') {
        p.P.group.position.x += Math.sin(t * 0.3 + p.seed) * 0.0015;
        p.P.group.position.z += Math.cos(t * 0.3 + p.seed) * 0.0015;
      }
    }
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.2) * 0.3;
    for (const { b, seed, w1, w2 } of birds) {
      const a = t * 0.08 + seed;
      b.position.x = Math.cos(a) * (30 + seed * 2); b.position.z = -25 + Math.sin(a) * 18;
      b.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 6 + seed) * 0.5;
      w1.rotation.z = flap; w2.rotation.z = -flap;
    }
  };
  return root;
}
