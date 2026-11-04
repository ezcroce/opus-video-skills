// main.js — timeline, renderer and the frame API used by render.mjs.
import * as THREE from 'three';
import { createPost } from './engine.js';
import { SCENE_DEFS, buildScene } from './scenes.js';

const params = new URLSearchParams(location.search);
const SCALE = +(params.get('scale') || 1);
const W = Math.round(1920 * SCALE), H = Math.round(1080 * SCALE);
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = params.get('shadows') !== '0';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 1);

const post = createPost(renderer, W, H, { samples: +(params.get('samples') ?? 4), type: params.get('type') === 'byte' ? THREE.UnsignedByteType : THREE.HalfFloatType });
const cache = new Map();
let starts = [], total = 0;
for (const s of SCENE_DEFS) { starts.push({ ...s, start: total }); total += s.duration; }

function getScene(id) {
  if (!cache.has(id)) {
    const inst = buildScene(id);
    cache.set(id, inst);
  }
  return cache.get(id);
}

function locate(t) {
  const tt = Math.max(0, Math.min(total - 0.0001, t));
  let i = 0;
  while (i < starts.length - 1 && tt >= starts[i].start + starts[i].duration) i++;
  return { i, def: starts[i], local: tt - starts[i].start };
}

function draw(inst, local, type = 'image/jpeg', quality = 0.95) {
  inst.update(local);
  const p = inst.post(local);
  post.render(inst.scene, inst.camera, { ...p, time: local });
  return canvas.toDataURL(type, quality);
}

window.DUR = total;
window.SCENES = starts;
window.renderFrame = (t, type = 'image/jpeg') => {
  const { def, local } = locate(t);
  const inst = getScene(def.id);
  return draw(inst, local, type);
};
window.renderScene = (id, local = 0, type = 'image/png') => {
  const inst = getScene(id);
  return draw(inst, local, type);
};
window.getScene = getScene;
window.projectPoint = (id, t, x, y, z) => {
  const inst = getScene(id); inst.update(t);
  inst.camera.updateMatrixWorld(true);
  inst.camera.matrixWorldInverse.copy(inst.camera.matrixWorld).invert();
  const v = new THREE.Vector3(x, y, z).project(inst.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * W), y: Math.round((-v.y * 0.5 + 0.5) * H), z: +v.z.toFixed(3) };
};
window.profileScene = (id, t) => {
  const inst = getScene(id);
  const t0 = performance.now(); inst.update(t); const t1 = performance.now();
  const p = inst.post(t); post.render(inst.scene, inst.camera, { ...p, time: t }); const t2 = performance.now();
  const url = canvas.toDataURL('image/jpeg', 0.95); const t3 = performance.now();
  return { update: +(t1 - t0).toFixed(1), render: +(t2 - t1).toFixed(1), encode: +(t3 - t2).toFixed(1), calls: post.lastInfo.calls, triangles: post.lastInfo.triangles, bytes: url.length };
};
window.getInfo = () => ({
  total, scenes: starts, cached: [...cache.keys()],
  gpu: (() => { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })(),
  render: post.lastInfo,
});

document.fonts.ready.then(() => {
  try { getScene('title'); } catch (e) { console.error(e); }
  window.ready = true;
});
