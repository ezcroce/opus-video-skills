// scenes.js — the seven scenes, the title and the final promise.
import * as THREE from 'three';
import {
  mat, basicMat, addOutline, makeSky, makeCloud, makeGlow, glowTexture, makeTextPlane,
  makePalm, makeRock, makeBush, hash, TAU, lerp, clamp, smoothstep, easeInOut, easeOut,
} from './engine.js';
import {
  createPerson, createNoah, createWife, createSon, createDaughter, createChild,
  setExpression, updatePerson, createAnimal, updateAnimal,
} from './characters.js';
import { createCity, createGround, createHill, createTree } from './world.js';
import {
  createArk, createSea, createRain, createStormClouds, createLightning, createRainbow,
  createRainbowBackdrop, createNature, createOliveBranch,
} from './ark.js';

export const SCENE_DEFS = [
  { id: 'title', duration: 7.0 },
  { id: 'city', duration: 22.0 },
  { id: 'calling', duration: 18.0 },
  { id: 'construction', duration: 26.0 },
  { id: 'flood', duration: 24.0 },
  { id: 'reborn', duration: 18.0 },
  { id: 'rainbow', duration: 26.0 },
  { id: 'child', duration: 18.0 },
  { id: 'final', duration: 16.0 },
];

function baseScene({ skyTop = 0x3d7fc4, skyMid = 0x9fd0ea, skyBottom = 0xf6d9a0, sunDir = [0.4, 0.5, -0.7], sunColor = 0xfff1c4, sunIntensity = 2.6, hemiSky = 0xbfe3ff, hemiGround = 0x6b8f4e, hemiIntensity = 1.0, fillColor = 0xffd9a0, fillIntensity = 0.5, fogColor = 0xd9c7a0, fogNear = 40, fogFar = 220, shadow = 34, shadowMap = 2048 } = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 900);
  scene.add(camera);
  const sky = makeSky({ top: skyTop, mid: skyMid, bottom: skyBottom, sunDir: new THREE.Vector3(...sunDir), sunColor });
  scene.add(sky);
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity); scene.add(hemi);
  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.position.set(sunDir[0] * 60, sunDir[1] * 60, sunDir[2] * 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMap, shadowMap);
  sun.shadow.camera.left = -shadow; sun.shadow.camera.right = shadow;
  sun.shadow.camera.top = shadow; sun.shadow.camera.bottom = -shadow;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(fillColor, fillIntensity);
  fill.position.set(-sunDir[0] * 40, 20, -sunDir[2] * 40); scene.add(fill);
  return { scene, camera, sun, hemi, fill, sky };
}

function applyCamera(camera, keys, t, opts = {}) {
  if (!keys.length) return;
  let i = 0;
  while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(0.0001, b.t - a.t);
  let u = clamp((t - a.t) / span);
  u = opts.linear ? u : easeInOut(u);
  const pos = new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), u);
  const tgt = new THREE.Vector3(...a.target).lerp(new THREE.Vector3(...b.target), u);
  const fov = lerp(a.fov ?? 42, b.fov ?? 42, u);
  const roll = lerp(a.roll ?? 0, b.roll ?? 0, u);
  const hand = opts.handheld ?? 0.02;
  pos.x += Math.sin(t * 0.63 + 1.7) * hand;
  pos.y += Math.sin(t * 0.81 + 0.4) * hand * 0.7;
  pos.z += Math.cos(t * 0.57 + 2.1) * hand;
  camera.position.copy(pos);
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  camera.lookAt(tgt);
  camera.rotateZ(roll + Math.sin(t * 0.43) * hand * 0.15);
}

function addClouds(scene, { count = 8, y = 45, spread = 160, z = -80, color = 0xffffff, scale = 5, opacity = 1, seed = 1 } = {}) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const c = makeCloud({ scale: scale * (0.7 + hash(i + seed) * 0.7), color, count: 6, seed: i + seed, flat: true, opacity });
    c.position.set((hash(i * 3.1 + seed) - 0.5) * spread, y + hash(i * 7.7 + seed) * 18, z - hash(i * 5.3 + seed) * 60);
    scene.add(c); clouds.push({ c, seed: i, speed: 0.4 + hash(i + seed) * 0.7 });
  }
  return (t) => {
    for (const { c, seed, speed } of clouds) {
      c.position.x += Math.sin(t * 0.02 + seed) * 0.002;
      c.position.x = ((c.position.x + spread / 2 + t * speed * 0.35) % spread) - spread / 2;
    }
  };
}

function addSparkles(scene, { count = 80, center = [0, 2, 0], spread = [4, 4, 4], color = 0xffe6a8, size = 0.08, seed = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + (hash(i * 3.1 + seed) - 0.5) * spread[0];
    pos[i * 3 + 1] = center[1] + (hash(i * 7.7 + seed) - 0.5) * spread[1];
    pos[i * 3 + 2] = center[2] + (hash(i * 5.3 + seed) - 0.5) * spread[2];
    seeds[i] = hash(i + seed);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const p = new THREE.Points(geo, m); scene.add(p);
  return (t) => {
    const arr = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.0025 + seeds[i] * 0.004;
      if (arr[i * 3 + 1] > center[1] + spread[1] / 2) arr[i * 3 + 1] = center[1] - spread[1] / 2;
      arr[i * 3] += Math.sin(t * 0.7 + seeds[i] * 10) * 0.0015;
    }
    geo.attributes.position.needsUpdate = true;
    m.opacity = 0.65 + Math.sin(t * 2.0) * 0.2;
  };
}

function addLightBeam(scene, { position = [0, 0, 0], height = 30, radius = 4, color = 0xffe0a0, opacity = 0.35 } = {}) {
  const geo = new THREE.CylinderGeometry(radius * 0.25, radius, height, 24, 1, true);
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: opacity }, time: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity, time; varying vec2 vUv; varying vec3 vPos;
      void main(){
        float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
        float fade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float shimmer = 0.85 + 0.15 * sin(vUv.y * 30.0 + time * 2.0);
        gl_FragColor = vec4(color, edge * fade * opacity * shimmer);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(position[0], position[1] + height / 2, position[2]);
  scene.add(mesh);
  return { mesh, update: (t) => { m.uniforms.time.value = t; } };
}

function addRainbowIcon(size = 1.2) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const cols = ['#e84a3a', '#f08a2a', '#f2d23a', '#5ab84a', '#3a8ad9', '#4a4ab8', '#8a4ab8'];
  g.lineWidth = 18; g.lineCap = 'round';
  cols.forEach((col, i) => {
    g.strokeStyle = col; g.beginPath(); g.arc(256, 230, 190 - i * 18, Math.PI, TAU); g.stroke();
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  mesh.renderOrder = 1000;
  return mesh;
}

function addBackdrop(w = 2.6, h = 1.6, opacity = 0.32) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 160, 10, 256, 160, 300);
  gr.addColorStop(0, `rgba(20,12,6,${opacity})`);
  gr.addColorStop(0.55, `rgba(20,12,6,${opacity * 0.55})`);
  gr.addColorStop(1, 'rgba(20,12,6,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  mesh.renderOrder = 998;
  return mesh;
}

// TITLE
function buildTitle() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x2f6fb0, skyMid: 0x9fc8e8, skyBottom: 0xffd9a0, sunDir: [0.35, 0.28, -0.9],
    sunColor: 0xffd9a0, sunIntensity: 2.2, hemiSky: 0xbfe3ff, hemiGround: 0x8a7a4a, hemiIntensity: 1.1,
    fillColor: 0xffd9b0, fillIntensity: 1.3, fogColor: 0xf0d8b0, fogNear: 60, fogFar: 260, shadow: 40,
  });
  const ground = createGround({ size: 400, color: 0xc9a86a, repeat: 10 }); ground.position.y = -0.2; scene.add(ground);
  for (let i = 0; i < 5; i++) {
    const h = createHill({ x: -60 + i * 30, z: -60 - hash(i) * 30, r: 24 + hash(i) * 14, h: 8 + hash(i + 1) * 8, color: i % 2 ? 0x8a9a5a : 0x7a8a4a, seed: i });
    scene.add(h);
  }
  const ark = createArk({ construction: false });
  ark.scale.setScalar(0.55); ark.position.set(0, 8, -28); ark.rotation.y = 0.25; scene.add(ark);
  const rainbow = createRainbow({ radius: 34, width: 6, opacity: 0.55 });
  rainbow.position.set(0, 26, -70); scene.add(rainbow);
  const updateClouds = addClouds(scene, { count: 9, y: 42, spread: 180, z: -70, color: 0xfff2e0, scale: 6, seed: 3 });
  const glow = makeGlow(0xffd9a0, 40, 0.55); glow.position.set(20, 30, -80); scene.add(glow);
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const m = basicMat(0x4a3a2a);
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.12), m); w1.position.x = -0.3; b.add(w1);
    const w2 = w1.clone(); w2.position.x = 0.3; b.add(w2);
    b.position.set(-20 + i * 8, 24 + hash(i) * 6, -40 - hash(i) * 20); scene.add(b);
    birds.push({ b, w1, w2, seed: i });
  }
  const backdrop = addBackdrop(2.9, 1.8, 0.34); backdrop.position.set(0, 0.05, -2.35); camera.add(backdrop);
  const title = makeTextPlane({
    width: 1800, height: 1000, lines: [
      { text: 'NOÈ', size: 300, font: '700 300px Fraunces, serif', color: '#fff6e2', glowColor: 'rgba(255,190,80,0.8)' },
      { text: 'PERCHÉ DIO CHIESE DI COSTRUIRE L’ARCA?', size: 78, font: '700 78px Nunito, sans-serif', color: '#fff1d6', glowColor: 'rgba(120,70,20,0.8)', strokeWidth: 6 },
    ], lineHeight: 1.12,
  });
  title.scale.setScalar(1.0); title.position.set(0, 0.16, -2.2); camera.add(title);
  const icon = addRainbowIcon(0.46); icon.position.set(0, 0.82, -2.1); camera.add(icon);
  const sub = makeTextPlane({ width: 1200, height: 200, lines: [{ text: 'Una storia di fede, speranza e promessa', size: 46, font: '600 46px Nunito, sans-serif', color: '#ffe9c4', glowColor: 'rgba(80,40,10,0.7)', strokeWidth: 4 }], lineHeight: 1.1 });
  sub.scale.setScalar(0.62); sub.position.set(0, -0.66, -2.2); camera.add(sub);
  const keys = [
    { t: 0, pos: [0, 12, 46], target: [0, 9, -10], fov: 40 },
    { t: 7, pos: [0, 8.5, 32], target: [0, 8, -12], fov: 38 },
  ];
  return {
    scene, camera, duration: 7,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.03 });
      updateClouds(t); ark.userData.update(t, 0); rainbow.userData.update(t, 0.55);
      for (const { b, w1, w2, seed } of birds) {
        b.position.x += Math.sin(t * 0.2 + seed) * 0.01;
        const flap = Math.sin(t * 5 + seed) * 0.5; w1.rotation.z = flap; w2.rotation.z = -flap;
      }
      title.material.opacity = smoothstep(0.6, 2.0, t) * (1 - smoothstep(6.2, 7.0, t));
      icon.material.opacity = title.material.opacity;
      backdrop.material.opacity = title.material.opacity;
      sub.material.opacity = smoothstep(1.4, 2.8, t) * (1 - smoothstep(6.2, 7.0, t));
      title.scale.setScalar(1.0 * (0.96 + smoothstep(0.6, 2.4, t) * 0.04));
    },
    post(t) {
      return { warm: 0.25, vignette: 0.45, grain: 0.025, saturation: 1.08, contrast: 1.03, fade: smoothstep(0, 0.9, t) * (1 - smoothstep(6.3, 7.0, t)) };
    },
  };
}

// SCENE 1
function buildCity() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x4a7fb0, skyMid: 0xa8c8d8, skyBottom: 0xf0c890, sunDir: [0.55, 0.38, -0.6],
    sunColor: 0xffd9a0, sunIntensity: 3.3, hemiSky: 0xd8e8f8, hemiGround: 0xa88a5a, hemiIntensity: 1.7,
    fillColor: 0xffd9b0, fillIntensity: 2.0, fogColor: 0xe8d0a8, fogNear: 55, fogFar: 210, shadow: 38,
  });
  const city = createCity(); scene.add(city);
  const streetLight = new THREE.PointLight(0xffd9b0, 55, 45, 2); streetLight.position.set(0, 7, 8); scene.add(streetLight);
  const updateClouds = addClouds(scene, { count: 7, y: 48, spread: 180, z: -90, color: 0xfff0d8, scale: 7, seed: 8 });
  const sunGlow = makeGlow(0xffd9a0, 50, 0.5); sunGlow.position.set(60, 45, -100); scene.add(sunGlow);
  for (let i = 0; i < 4; i++) {
    const c = makeCloud({ scale: 8, color: 0x8a8a92, count: 6, seed: 20 + i, flat: true, opacity: 0.85 });
    c.position.set(-60 + i * 40, 40, -120); scene.add(c);
  }
  const keys = [
    { t: 0, pos: [0, 26, 50], target: [0, 2, -10], fov: 46 },
    { t: 5, pos: [-4, 16, 34], target: [0, 2, -4], fov: 44 },
    { t: 10, pos: [-3, 7, 20], target: [-1, 2, 2], fov: 40 },
    { t: 15, pos: [-4.5, 4.2, 12], target: [-3.4, 1.6, 4.5], fov: 36 },
    { t: 19, pos: [-3.6, 3.2, 9.5], target: [-3.0, 1.4, 4.2], fov: 34 },
    { t: 22, pos: [0.5, 2.6, 8.5], target: [2.0, 1.2, 5.8], fov: 34 },
  ];
  return {
    scene, camera, duration: 22,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.035 });
      city.userData.update(t); updateClouds(t);
      sun.intensity = 3.3 - smoothstep(16, 22, t) * 0.5;
    },
    post(t) {
      return { warm: 0.18, vignette: 0.32, grain: 0.025, saturation: 1.06, contrast: 1.01, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(21.2, 22, t)) };
    },
  };
}

// SCENE 2
function buildCalling() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x3a6fa8, skyMid: 0xa8c8e0, skyBottom: 0xffd9a0, sunDir: [0.25, 0.55, -0.8],
    sunColor: 0xffe0b0, sunIntensity: 2.2, hemiSky: 0xd8e8f8, hemiGround: 0xa89060, hemiIntensity: 1.2,
    fillColor: 0xffe0b0, fillIntensity: 1.2, fogColor: 0xf0d8b0, fogNear: 45, fogFar: 190, shadow: 22,
  });
  const ground = createGround({ size: 300, color: 0xc9a86a, repeat: 8 }); scene.add(ground);
  const hill = createHill({ x: 0, z: -2, r: 26, h: 4.5, color: 0xb8a060, seed: 4 }); scene.add(hill);
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4 + hash(i) * 4, 5 + hash(i + 1) * 8, 4), mat(0xb08a5a, { roughness: 1 }));
    b.position.set(-40 + i * 10, 2.5, -55 - hash(i) * 10); scene.add(b);
  }
  const tree = createTree({ scale: 1.2, type: 'olive', seed: 2 }); tree.position.set(-7, 4.2, -3); scene.add(tree);
  const rock = makeRock({ scale: 1.2, seed: 4, color: 0xa89070 }); rock.position.set(5, 4.3, 2); scene.add(rock);
  const bush = makeBush({ scale: 0.9, seed: 3 }); bush.position.set(-4, 4.2, 4); scene.add(bush);

  const noah = createNoah(); noah.group.position.set(0, 4.4, 0); noah.group.rotation.y = 0.05; scene.add(noah.group);
  setExpression(noah, 'peaceful');

  const beam = addLightBeam(scene, { position: [0, 4.4, -3.2], height: 34, radius: 2.8, color: 0xffe6b0, opacity: 0.18 });
  const glow = makeGlow(0xffe6b0, 5, 0.32); glow.position.set(0, 9.5, -4); scene.add(glow);
  const halo = makeGlow(0xfff0c0, 4, 0.32); halo.position.set(0, 6.2, -0.6); scene.add(halo);
  const sparkleUpdate = addSparkles(scene, { count: 110, center: [0, 7, 0], spread: [8, 9, 6], color: 0xffe6b0, size: 0.10, seed: 5 });
  const updateClouds = addClouds(scene, { count: 6, y: 46, spread: 180, z: -80, color: 0xfff0e0, scale: 6, seed: 12 });
  const keyLight = new THREE.PointLight(0xffd9a0, 2.6, 24, 2); keyLight.position.set(0, 7, 4); scene.add(keyLight);
  const keys = [
    { t: 0, pos: [9, 7.5, 15], target: [0, 6.2, 0], fov: 42 },
    { t: 6, pos: [4.5, 6.2, 9], target: [0, 5.8, 0], fov: 38 },
    { t: 11, pos: [2.0, 5.9, 5.6], target: [0, 5.75, 0], fov: 34 },
    { t: 15, pos: [1.1, 5.85, 3.9], target: [0, 5.78, 0], fov: 30 },
    { t: 18, pos: [0.9, 5.9, 3.5], target: [0, 5.8, 0], fov: 28 },
  ];
  return {
    scene, camera, duration: 18,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.012 });
      updateClouds(t); sparkleUpdate(t); beam.update(t);
      updatePerson(noah, t, 'listen');
      const awe = smoothstep(11.5, 14.5, t);
      if (awe > 0.5) { setExpression(noah, 'awe'); updatePerson(noah, t, 'lookUp'); }
      else { setExpression(noah, 'peaceful'); updatePerson(noah, t, 'listen'); }
      glow.material.opacity = 0.28 + Math.sin(t * 1.7) * 0.06 + awe * 0.08;
      halo.material.opacity = 0.26 + Math.sin(t * 1.3) * 0.06 + awe * 0.1;
      keyLight.intensity = 2.2 + Math.sin(t * 1.5) * 0.5 + awe * 1.2;
      sun.intensity = 2.1 + awe * 0.3;
    },
    post(t) {
      return { warm: 0.28, vignette: 0.32, grain: 0.02, saturation: 1.06, contrast: 1.04, exposure: 0.86, fade: smoothstep(0, 0.7, t) * (1 - smoothstep(17.2, 18, t)), flash: smoothstep(16.8, 17.6, t) * 0.35 };
    },
  };
}

// SCENE 3
function buildConstruction() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x4a7fb0, skyMid: 0xb8d0e0, skyBottom: 0xffd0a0, sunDir: [0.6, 0.35, -0.5],
    sunColor: 0xffd8a8, sunIntensity: 3.4, hemiSky: 0xd8e8f8, hemiGround: 0xa88a5a, hemiIntensity: 1.8,
    fillColor: 0xffd9b0, fillIntensity: 2.0, fogColor: 0xf0d8b0, fogNear: 60, fogFar: 230, shadow: 42,
  });
  const ground = createGround({ size: 400, color: 0xc9a86a, repeat: 10 }); scene.add(ground);
  const hill = createHill({ x: 0, z: -8, r: 46, h: 5, color: 0xb8a060, seed: 7 }); scene.add(hill);
  const ark = createArk({ construction: true }); ark.position.set(0, 5, -8); ark.rotation.y = -0.08; scene.add(ark);
  const updateClouds = addClouds(scene, { count: 7, y: 48, spread: 200, z: -90, color: 0xfff0d8, scale: 7, seed: 15 });
  const sunGlow = makeGlow(0xffd9a0, 50, 0.5); sunGlow.position.set(70, 40, -100); scene.add(sunGlow);
  const siteLight = new THREE.PointLight(0xffd0a0, 70, 90, 2); siteLight.position.set(0, 22, 32); scene.add(siteLight);
  const animalLight = new THREE.PointLight(0xffe6c0, 90, 45, 2); animalLight.position.set(0, 9, 25); scene.add(animalLight);
  for (let i = 0; i < 5; i++) {
    const p = makePalm({ height: 5 + hash(i) * 3, seed: i + 30, lean: 0.2 });
    p.position.set(-22 + i * 11, 4.5, 4 + hash(i) * 6); scene.add(p);
  }
  for (let i = 0; i < 8; i++) {
    const r = makeRock({ scale: 0.5 + hash(i) * 0.9, seed: i + 10, color: 0xa89070 });
    r.position.set((hash(i * 3.1) - 0.5) * 50, 4.5, 2 + hash(i * 7.7) * 20); scene.add(r);
  }
  const table = new THREE.Group(); table.position.set(-8, 4.5, 10); scene.add(table);
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 2.4), mat(0x8a5a34, { roughness: 0.9 })); top.position.y = 1.0; top.castShadow = true; table.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5), mat(0x6b4423)); leg.position.set(sx * 1.8, 0.5, sz * 0.9); table.add(leg);
  }
  const blueprintTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
    g.fillStyle = '#e8d8b0'; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 3;
    g.strokeRect(20, 20, 472, 280);
    g.beginPath(); g.moveTo(80, 210); g.bezierCurveTo(100, 150, 180, 130, 250, 130); g.bezierCurveTo(330, 130, 400, 160, 430, 210); g.stroke();
    g.beginPath(); g.moveTo(80, 210); g.lineTo(430, 210); g.stroke();
    g.beginPath(); g.moveTo(250, 130); g.lineTo(250, 80); g.lineTo(330, 80); g.lineTo(330, 130); g.stroke();
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(110 + i * 40, 210); g.lineTo(110 + i * 40, 160); g.stroke(); }
    g.font = '24px serif'; g.fillStyle = '#5a3a22'; g.fillText('ARCA', 220, 60);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshStandardMaterial({ map: blueprintTex, roughness: 0.9 }));
  bp.rotation.x = -Math.PI / 2; bp.rotation.z = 0.05; bp.position.set(0, 1.11, 0); table.add(bp);
  const noah = createNoah(); noah.group.position.set(-8.8, 4.5, 12.2); noah.group.rotation.y = 2.6; scene.add(noah.group);
  const son1 = createSon({ seed: 51 }); son1.group.position.set(-6.8, 4.5, 12.4); son1.group.rotation.y = 2.9; scene.add(son1.group);
  const son2 = createSon({ seed: 52, robe: 0x8a6a3a }); son2.group.position.set(7.5, 4.5, 8); son2.group.rotation.y = -1.2; scene.add(son2.group);
  const wife = createWife({ seed: 53 }); wife.group.position.set(-10.5, 4.5, 9.5); wife.group.rotation.y = 1.2; scene.add(wife.group);
  const daughter = createDaughter({ seed: 54 }); daughter.group.position.set(5.5, 4.5, 10); daughter.group.rotation.y = -1.8; scene.add(daughter.group);
  const animals = [];
  const animalSpecs = [
    { type: 'elephant', x: -5.5, z: 18, s: 1.0, rot: 0.4 },
    { type: 'elephant', x: -3.2, z: 19, s: 0.92, rot: 0.4 },
    { type: 'giraffe', x: -1, z: 20, s: 1.0, rot: 0.1 },
    { type: 'giraffe', x: 1.5, z: 21, s: 0.95, rot: 0.1 },
    { type: 'zebra', x: 4, z: 18, s: 1.0, rot: -0.2 },
    { type: 'zebra', x: 6, z: 19, s: 0.95, rot: -0.2 },
    { type: 'lion', x: 6.5, z: 16, s: 1.0, rot: -0.5 },
    { type: 'lion', x: 8.5, z: 17, s: 0.95, rot: -0.5 },
    { type: 'rabbit', x: 0, z: 15, s: 1.0, rot: 0.2 },
    { type: 'rabbit', x: 1.2, z: 15.5, s: 0.95, rot: 0.2 },
  ];
  for (let i = 0; i < animalSpecs.length; i++) {
    const s = animalSpecs[i];
    const a = createAnimal(s.type); a.scale.setScalar(s.s); a.position.set(s.x, 4.5, s.z); a.rotation.y = s.rot; a.userData.id = i * 1.7; scene.add(a);
    animals.push({ a, ...s, baseX: s.x, baseZ: s.z, phase: i * 0.9 });
  }
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const d = createAnimal('dove'); d.scale.setScalar(1.3); d.position.set(-12 + i * 5, 16 + hash(i) * 4, 12 - i * 2); d.userData.id = i; scene.add(d);
    birds.push({ d, seed: i, baseX: d.position.x, baseY: d.position.y, baseZ: d.position.z });
  }
  const dustGeo = new THREE.BufferGeometry();
  const N = 120, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = -8 + (hash(i * 3.1) - 0.5) * 8; pos[i * 3 + 1] = 4.6 + hash(i * 7.7) * 3; pos[i * 3 + 2] = 10 + (hash(i * 5.3) - 0.5) * 6; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xe8c890, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(dust);
  const keys = [
    { t: 0, pos: [-18, 14, 34], target: [0, 8, -6], fov: 48 },
    { t: 6, pos: [-10, 8, 20], target: [-7, 6, 10], fov: 40 },
    { t: 12, pos: [6, 16, 32], target: [0, 10, -6], fov: 46 },
    { t: 18, pos: [2, 6, 30], target: [0, 4, 14], fov: 44 },
    { t: 22, pos: [4, 6, 28], target: [0, 4, 14], fov: 46 },
    { t: 26, pos: [6, 7, 30], target: [0, 5, 8], fov: 46 },
  ];
  return {
    scene, camera, duration: 26,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.03 });
      updateClouds(t); ark.userData.update(t, 0);
      updatePerson(noah, t, 'hammer'); setExpression(noah, 'determined');
      updatePerson(son1, t, 'hammer'); setExpression(son1, 'determined');
      updatePerson(son2, t, 'hammer'); setExpression(son2, 'determined');
      updatePerson(wife, t, 'carry'); setExpression(wife, 'kind');
      updatePerson(daughter, t, 'carry'); setExpression(daughter, 'kind');
      for (const { a, baseX, baseZ, phase } of animals) {
        const walk = smoothstep(2, 8, t);
        a.position.x = baseX + Math.sin(t * 0.25 + phase) * 0.6;
        a.position.z = baseZ + walk * 2.0;
        updateAnimal(a, t, walk > 0.1 ? 'walk' : 'idle', 0.7);
      }
      for (const { d, seed, baseX, baseY, baseZ } of birds) {
        d.position.x = baseX + Math.sin(t * 0.4 + seed) * 4;
        d.position.y = baseY + Math.sin(t * 0.7 + seed) * 1.2;
        d.position.z = baseZ + Math.cos(t * 0.3 + seed) * 3;
        d.rotation.y = Math.sin(t * 0.4 + seed) * 0.5;
        updateAnimal(d, t, 'fly', 1);
      }
      dust.rotation.y = t * 0.02;
      sun.intensity = 3.4;
    },
    post(t) {
      return { warm: 0.26, vignette: 0.32, grain: 0.025, saturation: 1.08, contrast: 1.01, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(25.2, 26, t)) };
    },
  };
}

// SCENE 4
function buildFlood() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x2a3a4a, skyMid: 0x4a5a6a, skyBottom: 0x8a9aaa, sunDir: [0.2, 0.35, -0.8],
    sunColor: 0xc8d8e8, sunIntensity: 2.0, hemiSky: 0xa8c8e8, hemiGround: 0x6a7a7a, hemiIntensity: 2.2,
    fillColor: 0x9fc8e8, fillIntensity: 2.0, fogColor: 0x7a8a9a, fogNear: 35, fogFar: 170, shadow: 30, shadowMap: 1024,
  });
  const sea = createSea({ size: 700, storm: 1, deep: 0x1a4a6a, shallow: 0x3a9ab0, horizon: 0x9fc8d8, sunDir: [0.3, 0.4, 0.6], sunColor: 0xc8d8e8 }); scene.add(sea);
  const ark = createArk({ construction: false }); ark.position.set(0, 0.2, 0); ark.rotation.y = 0.15; scene.add(ark);
  const rain = createRain({ count: 2600, area: 70, height: 36 }); scene.add(rain);
  const clouds = createStormClouds(); scene.add(clouds);
  const lightning = createLightning(); lightning.position.set(-20, 0, -40); scene.add(lightning);
  const lightning2 = createLightning(); lightning2.position.set(35, 0, -60); scene.add(lightning2);
  const updateClouds = addClouds(scene, { count: 6, y: 40, spread: 180, z: -90, color: 0x5a6472, scale: 8, seed: 22 });
  const lantern = new THREE.PointLight(0xffb85a, 40, 34, 2); lantern.position.set(2, 10, 4); scene.add(lantern);
  const arkLight = new THREE.PointLight(0xffc070, 45, 50, 2); arkLight.position.set(0, 11, 8); scene.add(arkLight);
  const frontFill = new THREE.DirectionalLight(0x9fc8e8, 1.2); frontFill.position.set(10, 12, 30); scene.add(frontFill);
  const noah = createNoah(); noah.group.position.set(2.2, 7.5, 3.2); noah.group.rotation.y = 0.2; scene.add(noah.group);
  const wife = createWife({ seed: 61 }); wife.group.position.set(0.2, 7.5, 3.6); wife.group.rotation.y = 0.5; scene.add(wife.group);
  const son = createSon({ seed: 62 }); son.group.position.set(4.2, 7.5, 3.0); son.group.rotation.y = -0.3; scene.add(son.group);
  const daughter = createDaughter({ seed: 63 }); daughter.group.position.set(-1.6, 7.5, 3.4); daughter.group.rotation.y = 0.7; scene.add(daughter.group);
  const child = createChild({ seed: 64 }); child.group.position.set(1.2, 7.5, 4.4); child.group.rotation.y = 0.1; scene.add(child.group);
  const elephant = createAnimal('elephant'); elephant.scale.setScalar(0.55); elephant.position.set(1.8, 7.6, 2.2); elephant.rotation.y = Math.PI; scene.add(elephant);
  const giraffe = createAnimal('giraffe'); giraffe.scale.setScalar(0.5); giraffe.position.set(-0.6, 7.6, 2.0); giraffe.rotation.y = Math.PI; scene.add(giraffe);
  const lion = createAnimal('lion'); lion.scale.setScalar(0.55); lion.position.set(3.6, 7.6, 2.4); lion.rotation.y = Math.PI; scene.add(lion);
  const sprayGeo = new THREE.BufferGeometry();
  const SN = 260, spos = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { const a = hash(i * 3.1) * TAU; spos[i * 3] = Math.cos(a) * (15 + hash(i) * 2); spos[i * 3 + 1] = 0.4 + hash(i * 7.7) * 3; spos[i * 3 + 2] = Math.sin(a) * (5 + hash(i) * 1.5); }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xd8ecf8, size: 0.22, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(spray);
  const keys = [
    { t: 0, pos: [16, 9, 26], target: [0, 8, 0], fov: 44 },
    { t: 6, pos: [10, 12, 20], target: [1, 9, 2], fov: 40 },
    { t: 12, pos: [4.5, 10.5, 12], target: [2, 9.2, 3], fov: 36 },
    { t: 17, pos: [3.2, 9.8, 9.5], target: [2.2, 9.0, 3.2], fov: 32 },
    { t: 21, pos: [8, 13, 22], target: [0, 9, 0], fov: 42 },
    { t: 24, pos: [14, 16, 30], target: [0, 9, 0], fov: 44 },
  ];
  return {
    scene, camera, duration: 24,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.05 });
      sea.userData.update(t, 1); clouds.userData.update(t); updateClouds(t);
      rain.userData.update(t);
      rain.position.set(camera.position.x, 0, camera.position.z);
      const f1 = lightning.userData.flash(t, 1); const f2 = lightning2.userData.flash(t, 4);
      const bob = Math.sin(t * 0.55) * 0.35;
      ark.userData.update(t, bob);
      ark.position.y = 0.2 + bob; ark.rotation.z = Math.sin(t * 0.5) * 0.02;
      updatePerson(noah, t, 'reassure'); setExpression(noah, 'worried');
      updatePerson(wife, t, 'reassure'); setExpression(wife, 'worried');
      updatePerson(son, t, 'idle'); setExpression(son, 'determined');
      updatePerson(daughter, t, 'idle'); setExpression(daughter, 'worried');
      updatePerson(child, t, 'idle'); setExpression(child, 'worried');
      updateAnimal(elephant, t, 'idle', 0.4); updateAnimal(giraffe, t, 'idle', 0.4); updateAnimal(lion, t, 'idle', 0.4);
      elephant.position.y = 7.6 + bob; giraffe.position.y = 7.6 + bob; lion.position.y = 7.6 + bob;
      lantern.intensity = 34 + Math.sin(t * 5.1) * 4 + Math.max(f1, f2) * 14;
      spray.position.y = Math.sin(t * 1.3) * 0.3;
      spray.rotation.y = t * 0.05;
      sun.intensity = 2.0 + Math.max(f1, f2) * 2.2;
      hemi.intensity = 2.2 + Math.max(f1, f2) * 1.0;
    },
    post(t) {
      const f = Math.max(lightning.userData.flash(t, 1), lightning2.userData.flash(t, 4));
      return { warm: -0.12, vignette: 0.42, grain: 0.035, saturation: 0.98, contrast: 1.04, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(23.2, 24, t)), flash: f * 0.22 };
    },
  };
}

// SCENE 5
function buildReborn() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x3a7fb8, skyMid: 0xa8d0e8, skyBottom: 0xffe0b0, sunDir: [0.3, 0.4, -0.85],
    sunColor: 0xffe6b0, sunIntensity: 3.1, hemiSky: 0xd8f0ff, hemiGround: 0x9ab86a, hemiIntensity: 1.7,
    fillColor: 0xffe6c0, fillIntensity: 1.8, fogColor: 0xe8f4ec, fogNear: 60, fogFar: 230, shadow: 30,
  });
  const sea = createSea({ size: 700, storm: 0.15 }); sea.position.y = -0.2; scene.add(sea);
  const ark = createArk({ construction: false }); ark.position.set(-6, 0.2, 0); ark.rotation.y = 0.35; scene.add(ark);
  const hill = createHill({ x: 26, z: -40, r: 34, h: 10, color: 0x7fb35a, seed: 11 }); scene.add(hill);
  const hill2 = createHill({ x: -40, z: -60, r: 40, h: 12, color: 0x6fa84a, seed: 12 }); scene.add(hill2);
  const tree = createTree({ scale: 1.4, type: 'olive', seed: 8 }); tree.position.set(20, 9.5, -34); scene.add(tree);
  const updateClouds = addClouds(scene, { count: 8, y: 46, spread: 200, z: -90, color: 0xfff4e8, scale: 6, seed: 31 });
  const sunGlow = makeGlow(0xffe6b0, 60, 0.65); sunGlow.position.set(40, 40, -100); scene.add(sunGlow);
  const rays = new THREE.Group(); scene.add(rays);
  for (let i = 0; i < 5; i++) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(3 + i, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ray.position.set(20 + i * 6, 30, -50); ray.rotation.z = 0.25 + i * 0.08; rays.add(ray);
  }
  const noah = createNoah(); noah.group.position.set(-2, 7.5, 3); noah.group.rotation.y = 0.3; scene.add(noah.group);
  const wife = createWife({ seed: 71 }); wife.group.position.set(-4.2, 7.5, 3.4); wife.group.rotation.y = 0.5; scene.add(wife.group);
  const child = createChild({ seed: 72 }); child.group.position.set(-0.2, 7.5, 4.2); child.group.rotation.y = 0.1; scene.add(child.group);
  const dove = createAnimal('dove'); dove.scale.setScalar(1.5); dove.position.set(0, 10, 5); scene.add(dove);
  const branch = createOliveBranch(); branch.position.set(0, -0.02, 0.42); branch.rotation.z = 0.1; dove.add(branch);
  const sparkleUpdate = addSparkles(scene, { count: 90, center: [0, 12, 0], spread: [20, 10, 14], color: 0xffe6b0, size: 0.09, seed: 9 });
  const keys = [
    { t: 0, pos: [-14, 12, 22], target: [-4, 9, 2], fov: 42 },
    { t: 6, pos: [-4, 11, 16], target: [-1, 9.5, 3], fov: 38 },
    { t: 11, pos: [2, 12, 14], target: [4, 11, 0], fov: 36 },
    { t: 15, pos: [4, 13, 18], target: [10, 12, -10], fov: 40 },
    { t: 18, pos: [2, 12, 20], target: [8, 11, -12], fov: 42 },
  ];
  return {
    scene, camera, duration: 18,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.025 });
      sea.userData.update(t, 0.15); updateClouds(t); sparkleUpdate(t);
      ark.userData.update(t, Math.sin(t * 0.5) * 0.12);
      updatePerson(noah, t, 'lookUp'); setExpression(noah, 'joyful');
      updatePerson(wife, t, 'idle'); setExpression(wife, 'joyful');
      updatePerson(child, t, 'lookUp'); setExpression(child, 'joyful');
      const fly = smoothstep(2, 16, t);
      dove.position.set(lerp(0, 18, fly), 10 + Math.sin(t * 0.9) * 0.8 + fly * 2, lerp(5, -14, fly));
      dove.rotation.y = lerp(0.2, -0.6, fly);
      dove.rotation.z = Math.sin(t * 1.2) * 0.08;
      updateAnimal(dove, t, 'fly', 1);
      rays.children.forEach((r, i) => { r.material.opacity = 0.035 + Math.sin(t * 0.5 + i) * 0.015; });
      sunGlow.material.opacity = 0.55 + Math.sin(t * 0.8) * 0.08;
      sun.intensity = 3.1 + smoothstep(0, 8, t) * 0.5;
    },
    post(t) {
      return { warm: 0.26, vignette: 0.3, grain: 0.02, saturation: 1.1, contrast: 1.0, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(17.2, 18, t)), flash: smoothstep(0, 1.2, t) * 0.25 };
    },
  };
}

// SCENE 6
function buildRainbowScene() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x2f7fc0, skyMid: 0x9fd8f0, skyBottom: 0xffe8c0, sunDir: [0.35, 0.45, -0.8],
    sunColor: 0xfff0c0, sunIntensity: 3.4, hemiSky: 0xd8f0ff, hemiGround: 0x9ac86a, hemiIntensity: 1.8,
    fillColor: 0xffe6c0, fillIntensity: 2.0, fogColor: 0xe8f8ec, fogNear: 70, fogFar: 270, shadow: 40,
  });
  const nature = createNature(); scene.add(nature);
  const ark = createArk({ construction: false }); ark.scale.setScalar(0.8); ark.position.set(-18, 0, -14); ark.rotation.y = 0.5; scene.add(ark);
  const rainbowBackdrop = createRainbowBackdrop({ w: 240, h: 130, opacity: 0.55 }); rainbowBackdrop.position.set(0, 30, -140); scene.add(rainbowBackdrop);
  const rainbow = createRainbow({ radius: 50, width: 14, opacity: 0 }); rainbow.position.set(0, 30, -130); scene.add(rainbow);
  const rainbow2 = createRainbow({ radius: 64, width: 19, opacity: 0 }); rainbow2.position.set(0, 30, -135); rainbow2.material.uniforms.opacity.value = 0; scene.add(rainbow2);
  const glow = makeGlow(0xfff0c0, 80, 0.35); glow.position.set(0, 40, -110); scene.add(glow);
  const updateClouds = addClouds(scene, { count: 9, y: 50, spread: 220, z: -100, color: 0xffffff, scale: 6, seed: 41 });
  const sparkleUpdate = addSparkles(scene, { count: 140, center: [0, 20, -20], spread: [50, 30, 30], color: 0xfff0c0, size: 0.12, seed: 13 });
  const noah = createNoah(); noah.group.position.set(-2, 0, 6); noah.group.rotation.y = 0.2; scene.add(noah.group);
  const wife = createWife({ seed: 81 }); wife.group.position.set(-4.2, 0, 6.4); wife.group.rotation.y = 0.4; scene.add(wife.group);
  const son = createSon({ seed: 82 }); son.group.position.set(0.4, 0, 7.2); son.group.rotation.y = -0.2; scene.add(son.group);
  const daughter = createDaughter({ seed: 83 }); daughter.group.position.set(-6.2, 0, 7.0); daughter.group.rotation.y = 0.6; scene.add(daughter.group);
  const child = createChild({ seed: 84 }); child.group.position.set(2.2, 0, 8.2); child.group.rotation.y = -0.3; scene.add(child.group);
  const animals = [];
  const specs = [
    { type: 'elephant', x: -12, z: 2, s: 0.9, rot: 0.4 }, { type: 'elephant', x: -9, z: 3, s: 0.85, rot: 0.4 },
    { type: 'giraffe', x: -4, z: 0, s: 0.9, rot: 0.2 }, { type: 'giraffe', x: -1.5, z: 1, s: 0.85, rot: 0.2 },
    { type: 'zebra', x: 6, z: 2, s: 0.9, rot: -0.3 }, { type: 'zebra', x: 8.5, z: 3, s: 0.85, rot: -0.3 },
    { type: 'lion', x: 12, z: 0, s: 0.9, rot: -0.5 }, { type: 'lion', x: 14.5, z: 1, s: 0.85, rot: -0.5 },
    { type: 'rabbit', x: 3, z: 4, s: 1.0, rot: 0.1 }, { type: 'rabbit', x: 4.2, z: 4.5, s: 0.95, rot: 0.1 },
  ];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i]; const a = createAnimal(s.type); a.scale.setScalar(s.s); a.position.set(s.x, 0, s.z); a.rotation.y = s.rot; a.userData.id = i * 1.3; scene.add(a);
    animals.push({ a, ...s, phase: i * 0.8, baseX: s.x, baseZ: s.z });
  }
  const birds = [];
  for (let i = 0; i < 8; i++) {
    const d = createAnimal('dove'); d.scale.setScalar(1.1); d.position.set(-20 + i * 5, 14 + hash(i) * 6, -10 - hash(i) * 20); d.userData.id = i; scene.add(d);
    birds.push({ d, seed: i, baseX: d.position.x, baseY: d.position.y, baseZ: d.position.z });
  }
  const keys = [
    { t: 0, pos: [10, 6, 24], target: [0, 6, 4], fov: 42 },
    { t: 7, pos: [4, 7, 24], target: [-2, 6, 2], fov: 44 },
    { t: 14, pos: [2, 7, 26], target: [0, 7, -10], fov: 48 },
    { t: 20, pos: [0, 8, 30], target: [0, 12, -30], fov: 50 },
    { t: 26, pos: [0, 10, 34], target: [0, 14, -40], fov: 50 },
  ];
  return {
    scene, camera, duration: 26,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.02 });
      nature.userData.update(t); updateClouds(t); sparkleUpdate(t);
      ark.userData.update(t, 0);
      const ro = smoothstep(3, 9, t);
      rainbow.userData.update(t, ro); rainbow2.userData.update(t, ro * 0.5);
      rainbow.material.uniforms.opacity.value = ro * 1.0;
      rainbow2.material.uniforms.opacity.value = ro * 0.28;
      glow.material.opacity = 0.2 + ro * 0.25;
      updatePerson(noah, t, 'lookUp'); setExpression(noah, 'awe');
      updatePerson(wife, t, 'lookUp'); setExpression(wife, 'joyful');
      updatePerson(son, t, 'idle'); setExpression(son, 'joyful');
      updatePerson(daughter, t, 'idle'); setExpression(daughter, 'joyful');
      updatePerson(child, t, 'run'); setExpression(child, 'joyful');
      for (const { a, baseX, baseZ, phase, type } of animals) {
        const run = smoothstep(4, 10, t);
        a.position.x = baseX + Math.sin(t * 0.6 + phase) * 0.8 + run * (type === 'rabbit' ? 2 : 1);
        a.position.z = baseZ + run * 2.5 + Math.cos(t * 0.5 + phase) * 0.4;
        updateAnimal(a, t, run > 0.1 ? 'run' : 'idle', 0.9);
      }
      for (const { d, seed, baseX, baseY, baseZ } of birds) {
        d.position.x = baseX + Math.sin(t * 0.5 + seed) * 5;
        d.position.y = baseY + Math.sin(t * 0.8 + seed) * 1.5;
        d.position.z = baseZ + Math.cos(t * 0.4 + seed) * 4;
        d.rotation.y = Math.sin(t * 0.5 + seed) * 0.6;
        updateAnimal(d, t, 'fly', 1);
      }
      sun.intensity = 3.4 + ro * 0.3;
    },
    post(t) {
      const ro = smoothstep(3, 9, t);
      return { warm: 0.16, vignette: 0.28, grain: 0.018, saturation: 1.15, contrast: 1.0, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(25.2, 26, t)), flash: smoothstep(2.5, 4.0, t) * (1 - smoothstep(4.0, 6.0, t)) * 0.25 };
    },
  };
}

// SCENE 7
function buildChildScene() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x3a6fa8, skyMid: 0xa8c8e0, skyBottom: 0xffd9a0, sunDir: [0.4, 0.35, -0.8],
    sunColor: 0xffe0b0, sunIntensity: 3.1, hemiSky: 0xd8e8f8, hemiGround: 0x9ac86a, hemiIntensity: 1.8,
    fillColor: 0xffe0b0, fillIntensity: 2.0, fogColor: 0xf0e0c0, fogNear: 60, fogFar: 210, shadow: 26,
  });
  const nature = createNature(); scene.add(nature);
  const rainbowBackdrop = createRainbowBackdrop({ w: 170, h: 95, opacity: 0.45 }); rainbowBackdrop.position.set(-6, 24, -110); scene.add(rainbowBackdrop);
  const rainbow = createRainbow({ radius: 38, width: 11, opacity: 0.95 }); rainbow.position.set(-6, 24, -100); scene.add(rainbow);
  const rainbow2 = createRainbow({ radius: 48, width: 15, opacity: 0.35 }); rainbow2.position.set(-6, 24, -105); scene.add(rainbow2);
  const updateClouds = addClouds(scene, { count: 7, y: 46, spread: 180, z: -90, color: 0xfff0e0, scale: 6, seed: 51 });
  const sparkleUpdate = addSparkles(scene, { count: 80, center: [0, 8, -10], spread: [30, 16, 20], color: 0xffe6b0, size: 0.08, seed: 17 });
  const hill = createHill({ x: 0, z: 6, r: 7, h: 0.9, color: 0x7fb35a, seed: 21 }); scene.add(hill);
  const familyLight = new THREE.PointLight(0xffe0b0, 35, 18, 2); familyLight.position.set(0, 4.5, 8); scene.add(familyLight);
  const father = createSon({ seed: 91, robe: 0x6a7a8a, beard: 'short' }); father.group.position.set(-1.2, 0.9, 5.0); father.group.rotation.y = 0.2; scene.add(father.group);
  const mother = createWife({ seed: 92, robe: 0x8a6a7a }); mother.group.position.set(1.0, 0.9, 5.2); mother.group.rotation.y = -0.2; scene.add(mother.group);
  const child = createChild({ seed: 93 }); child.group.position.set(0, 0.9, 6.0); child.group.rotation.y = 0.05; scene.add(child.group);
  const noah = createNoah(); noah.group.position.set(-8, 0, -18); noah.group.rotation.y = 0.3; noah.group.scale.setScalar(0.9); scene.add(noah.group);
  const wife = createWife({ seed: 94 }); wife.group.position.set(-10, 0, -18); wife.group.rotation.y = 0.5; scene.add(wife.group);
  const animals = [];
  const specs = [{ type: 'elephant', x: -3, z: -20, s: 0.8 }, { type: 'giraffe', x: 1, z: -22, s: 0.8 }, { type: 'lion', x: 5, z: -19, s: 0.8 }, { type: 'zebra', x: 8, z: -21, s: 0.8 }, { type: 'rabbit', x: -1, z: -16, s: 0.9 }];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i]; const a = createAnimal(s.type); a.scale.setScalar(s.s); a.position.set(s.x, 0, s.z); a.rotation.y = 0.4; a.userData.id = i; scene.add(a); animals.push({ a, ...s });
  }
  const keys = [
    { t: 0, pos: [2.8, 3.0, 11.5], target: [-0.5, 4.0, -10], fov: 50 },
    { t: 6, pos: [2.6, 2.9, 11.0], target: [-0.5, 4.0, -10], fov: 48 },
    { t: 12, pos: [2.5, 2.8, 10.5], target: [-0.5, 4.0, -10], fov: 46 },
    { t: 18, pos: [3.0, 3.2, 12.0], target: [-2, 5.0, -12], fov: 48 },
  ];
  return {
    scene, camera, duration: 18,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.015 });
      nature.userData.update(t); updateClouds(t); sparkleUpdate(t);
      rainbow.userData.update(t, 0.8); rainbow2.userData.update(t, 0.25);
      updatePerson(father, t, 'idle'); setExpression(father, 'kind');
      updatePerson(mother, t, 'idle'); setExpression(mother, 'kind');
      updatePerson(child, t, 'lookUp'); setExpression(child, 'awe');
      updatePerson(noah, t, 'lookUp'); setExpression(noah, 'peaceful');
      updatePerson(wife, t, 'idle'); setExpression(wife, 'kind');
      for (const { a } of animals) updateAnimal(a, t, 'idle', 0.5);
      sun.intensity = 3.1;
    },
    post(t) {
      return { warm: 0.28, vignette: 0.32, grain: 0.02, saturation: 1.08, contrast: 1.0, exposure: 1.12, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(17.2, 18, t)) };
    },
  };
}

// SCENE 8
function buildFinal() {
  const { scene, camera, sun, hemi } = baseScene({
    skyTop: 0x2f6fb0, skyMid: 0x9fc8e8, skyBottom: 0xffd9a0, sunDir: [0.35, 0.4, -0.85],
    sunColor: 0xffe6b0, sunIntensity: 3.3, hemiSky: 0xd8e8f8, hemiGround: 0x9ac86a, hemiIntensity: 1.8,
    fillColor: 0xffe0b0, fillIntensity: 2.0, fogColor: 0xf0e0c0, fogNear: 70, fogFar: 250, shadow: 45,
  });
  const nature = createNature(); scene.add(nature);
  const ark = createArk({ construction: false }); ark.scale.setScalar(0.9); ark.position.set(-16, 0, -18); ark.rotation.y = 0.4; scene.add(ark);
  const rainbowBackdrop = createRainbowBackdrop({ w: 250, h: 135, opacity: 0.5 }); rainbowBackdrop.position.set(0, 32, -130); scene.add(rainbowBackdrop);
  const rainbow = createRainbow({ radius: 55, width: 14, opacity: 0.95 }); rainbow.position.set(0, 32, -120); scene.add(rainbow);
  const rainbow2 = createRainbow({ radius: 68, width: 19, opacity: 0.35 }); rainbow2.position.set(0, 32, -125); scene.add(rainbow2);
  const glow = makeGlow(0xfff0c0, 90, 0.4); glow.position.set(0, 42, -115); scene.add(glow);
  const updateClouds = addClouds(scene, { count: 9, y: 50, spread: 220, z: -100, color: 0xffffff, scale: 6, seed: 61 });
  const sparkleUpdate = addSparkles(scene, { count: 120, center: [0, 20, -20], spread: [50, 30, 30], color: 0xfff0c0, size: 0.11, seed: 19 });
  const noah = createNoah(); noah.group.position.set(-2, 0, 6); noah.group.rotation.y = 0.2; scene.add(noah.group);
  const wife = createWife({ seed: 101 }); wife.group.position.set(-4.2, 0, 6.4); wife.group.rotation.y = 0.4; scene.add(wife.group);
  const child = createChild({ seed: 102 }); child.group.position.set(2.2, 0, 8.2); child.group.rotation.y = -0.3; scene.add(child.group);
  const animals = [];
  const specs = [{ type: 'elephant', x: -12, z: 2, s: 0.9 }, { type: 'giraffe', x: -6, z: 0, s: 0.9 }, { type: 'lion', x: 8, z: 1, s: 0.9 }, { type: 'zebra', x: 12, z: 2, s: 0.9 }, { type: 'rabbit', x: 4, z: 4, s: 1.0 }];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i]; const a = createAnimal(s.type); a.scale.setScalar(s.s); a.position.set(s.x, 0, s.z); a.rotation.y = 0.3; a.userData.id = i; scene.add(a); animals.push({ a, ...s });
  }
  const finalBackdrop = addBackdrop(3.6, 2.3, 0.5); finalBackdrop.position.set(0, 0.02, -2.35); camera.add(finalBackdrop);
  const text = makeTextPlane({
    width: 1800, height: 1100, lines: [
      { text: 'LA PROMESSA DI DIO', size: 112, font: '700 112px Fraunces, serif', color: '#fff6e2', glowColor: 'rgba(255,190,80,0.8)' },
      { text: 'NON VIENE DIMENTICATA.', size: 112, font: '700 112px Fraunces, serif', color: '#fff6e2', glowColor: 'rgba(255,190,80,0.8)' },
      { text: 'Genesi, capitoli 6-9.', size: 54, font: '600 54px Nunito, sans-serif', color: '#ffe9c4', glowColor: 'rgba(80,40,10,0.8)', strokeWidth: 5 },
      { text: 'Ti è piaciuta questa storia? Seguici per scoprire altri incredibili misteri della Bibbia!', size: 34, font: '600 34px Nunito, sans-serif', color: '#fff1d6', glowColor: 'rgba(80,40,10,0.8)', strokeWidth: 4 },
    ], lineHeight: 1.22,
  });
  text.scale.setScalar(1.25); text.position.set(0, 0.02, -2.2); camera.add(text);
  const keys = [
    { t: 0, pos: [6, 8, 28], target: [0, 12, -10], fov: 48 },
    { t: 6, pos: [2, 12, 36], target: [0, 16, -18], fov: 50 },
    { t: 11, pos: [0, 16, 44], target: [0, 20, -26], fov: 50 },
    { t: 16, pos: [0, 18, 50], target: [0, 22, -30], fov: 50 },
  ];
  return {
    scene, camera, duration: 16,
    update(t) {
      applyCamera(camera, keys, t, { handheld: 0.015 });
      nature.userData.update(t); updateClouds(t); sparkleUpdate(t);
      ark.userData.update(t, 0);
      rainbow.userData.update(t, 0.85); rainbow2.userData.update(t, 0.3);
      updatePerson(noah, t, 'lookUp'); setExpression(noah, 'peaceful');
      updatePerson(wife, t, 'idle'); setExpression(wife, 'kind');
      updatePerson(child, t, 'lookUp'); setExpression(child, 'awe');
      for (const { a } of animals) updateAnimal(a, t, 'idle', 0.5);
      text.material.opacity = smoothstep(2.0, 4.0, t);
      finalBackdrop.material.opacity = smoothstep(2.0, 4.0, t);
      text.scale.setScalar(1.25 * (0.96 + smoothstep(2.0, 5.0, t) * 0.04));
    },
    post(t) {
      return { warm: 0.2, vignette: 0.3, grain: 0.018, saturation: 1.1, contrast: 1.0, fade: smoothstep(0, 0.8, t) * (1 - smoothstep(15.0, 16, t)) };
    },
  };
}

const BUILDERS = {
  title: buildTitle,
  city: buildCity,
  calling: buildCalling,
  construction: buildConstruction,
  flood: buildFlood,
  reborn: buildReborn,
  rainbow: buildRainbowScene,
  child: buildChildScene,
  final: buildFinal,
};

export function buildScene(id) {
  const b = BUILDERS[id];
  if (!b) throw new Error('unknown scene ' + id);
  const inst = b();
  inst.id = id;
  return inst;
}
