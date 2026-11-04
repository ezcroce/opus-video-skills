// engine.js — small cinematic 3D toolkit for the Noah cartoon.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeIn = t => t * t * t;
export const TAU = Math.PI * 2;

export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
export function hash2(x, y) { return hash(x * 157.31 + y * 311.7); }
export function noise1(x) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}
export function fbm1(x) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { v += a * noise1(x * f + i * 17.3); f *= 2.03; a *= 0.5; }
  return v;
}

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.82, metalness: opts.metalness ?? 0.0,
    flatShading: opts.flat ?? false, emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1, transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide,
    map: opts.map ?? null, vertexColors: opts.vertexColors ?? false,
    depthWrite: opts.depthWrite ?? true, alphaTest: opts.alphaTest ?? 0,
  });
}
export function basicMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true, map: opts.map ?? null,
    blending: opts.blending ?? THREE.NormalBlending, vertexColors: opts.vertexColors ?? false });
}

const outlineVert = `
  uniform float thickness;
  void main() {
    vec3 p = position + normal * thickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const outlineFrag = `
  uniform vec3 color;
  void main() { gl_FragColor = vec4(color, 1.0); }`;
export function addOutline(mesh, thickness = 0.012, color = 0x2a1a12) {
  const m = new THREE.Mesh(mesh.geometry, new THREE.ShaderMaterial({
    uniforms: { thickness: { value: thickness }, color: { value: new THREE.Color(color) } },
    vertexShader: outlineVert, fragmentShader: outlineFrag, side: THREE.BackSide,
  }));
  m.renderOrder = (mesh.renderOrder || 0) - 1;
  m.castShadow = false; m.receiveShadow = false;
  m.userData.isOutline = true;
  mesh.add(m);
  return m;
}
export function outlined(mesh, thickness = 0.012, color = 0x2a1a12) {
  mesh.castShadow = true; mesh.receiveShadow = true;
  addOutline(mesh, thickness, color);
  return mesh;
}

export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  return t;
}

export function woodTexture(base = '#b07a45', dark = '#7a4f2a', planks = 8) {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < planks; i++) {
      const y = i * h / planks;
      g.fillStyle = i % 2 ? dark : base; g.globalAlpha = 0.25; g.fillRect(0, y, w, h / planks - 2); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(60,35,15,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (let k = 0; k < 12; k++) {
        g.strokeStyle = `rgba(70,40,18,${0.05 + hash(i * 31 + k) * 0.12})`; g.lineWidth = 1 + hash(k + i) * 1.5;
        const yy = y + hash(i * 7 + k) * h / planks;
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x * 0.02 + k) * 2.5);
        g.stroke();
      }
    }
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(55,30,12,0.35)'; g.beginPath();
      g.ellipse(hash(k * 3) * w, hash(k * 7) * h, 8 + hash(k) * 10, 3 + hash(k + 2) * 4, 0, 0, TAU); g.fill();
    }
  }, { repeat: [1, 1] });
}

export function stripeTexture(base = '#f4efe2', stripe = '#2c2a2a', count = 9) {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = stripe;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * w / count;
      g.beginPath();
      g.moveTo(x - 14, 0);
      g.bezierCurveTo(x + 18, h * 0.3, x - 22, h * 0.6, x + 10, h);
      g.lineTo(x + 34, h);
      g.bezierCurveTo(x + 2, h * 0.6, x + 40, h * 0.3, x + 10, 0);
      g.closePath(); g.fill();
    }
  });
}

export function giraffeTexture(base = '#e8b95c', spot = '#8a4f24') {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = hash(i * 3.1) * w, y = hash(i * 7.7) * h, r = 16 + hash(i * 2.3) * 26;
      g.fillStyle = spot; g.globalAlpha = 0.85;
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU, rr = r * (0.75 + hash(i * 11 + k) * 0.5);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  });
}

export function sandTexture(base = '#e8c890') {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = hash(i * 1.7);
      g.fillStyle = `rgba(${v > 0.5 ? '255,240,200' : '120,85,45'},${0.04 + hash(i) * 0.08})`;
      g.fillRect(hash(i * 3.3) * w, hash(i * 9.1) * h, 1 + hash(i) * 2, 1 + hash(i + 1) * 2);
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = 'rgba(150,110,60,0.10)'; g.lineWidth = 1 + hash(i) * 2;
      g.beginPath();
      const y = hash(i * 4.4) * h;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 4);
      g.stroke();
    }
  }, { repeat: [4, 4] });
}

export function stoneTexture(base = '#c9a06a') {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const rows = 8, cols = 6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * w / cols + (r % 2 ? w / cols / 2 : 0), y = r * h / rows;
      g.fillStyle = `rgba(${150 + hash(r * 9 + c) * 60},${110 + hash(r * 3 + c) * 40},${60 + hash(r + c) * 30},0.35)`;
      g.fillRect(x + 2, y + 2, w / cols - 4, h / rows - 4);
      g.strokeStyle = 'rgba(80,50,25,0.25)'; g.strokeRect(x + 2, y + 2, w / cols - 4, h / rows - 4);
    }
  }, { repeat: [3, 2] });
}

export function glowTexture(inner = 'rgba(255,245,210,1)', outer = 'rgba(255,210,120,0)') {
  return canvasTexture(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, 'rgba(255,230,170,0.55)'); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

export function makeBlobShadow(radius = 0.5, opacity = 0.42) {
  const tex = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    gr.addColorStop(0, 'rgba(20,12,6,0.55)'); gr.addColorStop(0.55, 'rgba(20,12,6,0.28)'); gr.addColorStop(1, 'rgba(20,12,6,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.025; m.renderOrder = 1;
  return m;
}

export function makeGlow(color = 0xffe6a8, size = 8, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

export function makeSky({ top = 0x3d7fc4, mid = 0x9fd0ea, bottom = 0xf6d9a0, sunDir = new THREE.Vector3(0.4, 0.5, -0.7), sunColor = 0xfff1c4, sunSize = 0.995, offset = 0, storm = 0 } = {}) {
  const geo = new THREE.SphereGeometry(420, 40, 24);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) },
      sunDir: { value: sunDir.clone().normalize() }, sunColor: { value: new THREE.Color(sunColor) },
      sunSize: { value: sunSize }, offset: { value: offset }, storm: { value: storm },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, mid, bottom, sunColor, sunDir; uniform float sunSize, offset, storm; varying vec3 vDir;
      void main(){
        float y = clamp(vDir.y * 0.5 + 0.5 + offset, 0.0, 1.0);
        vec3 col = mix(bottom, mid, smoothstep(0.35, 0.55, y));
        col = mix(col, top, smoothstep(0.55, 1.0, y));
        float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 220.0) * 1.4;
        col += sunColor * pow(sd, 12.0) * 0.20;
        col = mix(col, col * vec3(0.55,0.62,0.72), storm * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = -100;
  return mesh;
}

export function makeCloud({ scale = 1, color = 0xffffff, opacity = 1, count = 7, seed = 1, flat = true, emissive = 0x222222 } = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: flat, transparent: opacity < 1, opacity, emissive, emissiveIntensity: 0.35 });
  for (let i = 0; i < count; i++) {
    const r = (0.7 + hash(seed + i * 3.1) * 0.9) * scale;
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m);
    s.position.set((hash(seed + i * 7.7) - 0.5) * scale * 3.2, (hash(seed + i * 2.3) - 0.5) * scale * 0.7, (hash(seed + i * 5.1) - 0.5) * scale * 1.6);
    s.scale.y = 0.62 + hash(i + seed) * 0.2;
    s.castShadow = false; s.receiveShadow = false;
    g.add(s);
  }
  return g;
}

export function makeTextPlane({ lines = [], width = 1600, height = 900, font = '700 120px Fraunces, serif', color = '#fff7e6', stroke = 'rgba(60,30,10,0.55)', strokeWidth = 8, align = 'center', lineHeight = 1.15, letterSpacing = 0, glow = true, maxWidth = 0.92 } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const g = c.getContext('2d');
  g.clearRect(0, 0, width, height);
  g.textAlign = align; g.textBaseline = 'middle';
  const x = align === 'center' ? width / 2 : align === 'right' ? width * 0.94 : width * 0.06;
  const sizes = lines.map(l => l.size || 120);
  const total = sizes.reduce((a, s) => a + s * lineHeight, 0);
  let y = height / 2 - total / 2;
  lines.forEach((line) => {
    const size = line.size || 120;
    const fontStr = line.font || font.replace(/\d+px/, `${size}px`);
    g.font = fontStr;
    if ('letterSpacing' in g) g.letterSpacing = `${line.spacing ?? letterSpacing}px`;
    const text = line.text;
    const maxW = width * maxWidth;
    const words = text.split(' ');
    const rows = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (g.measureText(test).width > maxW && cur) { rows.push(cur); cur = w; } else cur = test;
    }
    if (cur) rows.push(cur);
    rows.forEach((row, ri) => {
      const yy = y + size * lineHeight * (ri + 0.5);
      if (glow) { g.shadowColor = line.glowColor || 'rgba(255,190,80,0.65)'; g.shadowBlur = size * 0.35; }
      g.lineWidth = strokeWidth; g.strokeStyle = line.stroke || stroke; g.lineJoin = 'round';
      g.strokeText(row, x, yy);
      g.shadowBlur = 0;
      g.fillStyle = line.color || color;
      g.fillText(row, x, yy);
    });
    y += size * lineHeight * rows.length;
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const aspect = width / height;
  const h = 1.0, w = h * aspect;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  mesh.renderOrder = 999;
  return mesh;
}

export function makePalm({ height = 6, seed = 1, lean = 0.15 } = {}) {
  const g = new THREE.Group();
  const trunkMat = mat(0x8a5a34, { roughness: 1 });
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * (1 - t * 0.4), 0.22 * (1 - t * 0.35), height / segs, 7), trunkMat);
    seg.position.set(Math.sin(t * 2.2) * lean * height * 0.35, height * (t + 0.5 / segs), Math.cos(t * 1.7) * lean * height * 0.12);
    seg.rotation.z = -Math.sin(t * 2.2) * 0.12;
    seg.castShadow = true; g.add(seg);
  }
  const leafMat = mat(0x3f8f3a, { roughness: 0.9, side: THREE.DoubleSide });
  const top = new THREE.Vector3(Math.sin(2.2) * lean * height * 0.35, height, Math.cos(1.7) * lean * height * 0.12);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + hash(seed) * 0.4;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.6, 4, 1, true), leafMat);
    leaf.position.copy(top).add(new THREE.Vector3(Math.cos(a) * 1.4, 0.1, Math.sin(a) * 1.4));
    leaf.rotation.set(Math.PI / 2 - 0.25, -a, 0.2);
    leaf.scale.set(1, 1, 0.25);
    leaf.castShadow = true; g.add(leaf);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat(0x6b4a2a));
  nuts.position.copy(top).add(new THREE.Vector3(0, -0.2, 0)); g.add(nuts);
  return g;
}

export function makeRock({ scale = 1, color = 0x9b8a76, seed = 1 } = {}) {
  const geo = new THREE.DodecahedronGeometry(scale, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.82 + hash2(x * 3 + seed, z * 3 + y) * 0.36;
    pos.setXYZ(i, x * n, y * n * 0.8, z * n);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { flat: true, roughness: 1 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function makeBush({ scale = 1, color = 0x4f9a3f, seed = 1 } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { flat: true, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(scale * (0.5 + hash(seed + i) * 0.4), 1), m);
    s.position.set((hash(seed + i * 3) - 0.5) * scale * 1.2, scale * (0.25 + hash(i + seed) * 0.25), (hash(seed + i * 7) - 0.5) * scale);
    s.castShadow = true; g.add(s);
  }
  return g;
}

export function makeGrassTuft({ color = 0x5aa84a, scale = 1 } = {}) {
  const g = new THREE.Group();
  const m = mat(color, { side: THREE.DoubleSide, roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035 * scale, 0.5 * scale, 3), m);
    blade.position.set((hash(i * 3.1) - 0.5) * 0.18 * scale, 0.25 * scale, (hash(i * 7.7) - 0.5) * 0.18 * scale);
    blade.rotation.z = (hash(i) - 0.5) * 0.5; g.add(blade);
  }
  return g;
}

export function createPost(renderer, w, h, opts = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: opts.samples ?? 4, type: opts.type ?? THREE.HalfFloatType, colorSpace: THREE.SRGBColorSpace });
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    tDiffuse: { value: rt.texture }, time: { value: 0 }, fade: { value: 1 }, flash: { value: 0 },
    warm: { value: 0 }, vignette: { value: 0.55 }, grain: { value: 0.035 }, saturation: { value: 1.06 },
    contrast: { value: 1.04 }, lift: { value: 0.0 }, letterbox: { value: 0 }, exposure: { value: 1.0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float time, fade, flash, warm, vignette, grain, saturation, contrast, lift, letterbox, exposure;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec3 col = texture2D(tDiffuse, uv).rgb;
        col = mix(col, col * vec3(1.06, 1.0, 0.92) + vec3(0.02,0.01,0.0), warm);
        col = mix(col, col * vec3(0.92, 0.98, 1.08), -warm);
        float l = dot(col, vec3(0.2126,0.7152,0.0722));
        col = mix(vec3(l), col, saturation);
        col = (col - 0.5) * contrast + 0.5 + lift;
        col *= exposure;
        vec2 d = uv - 0.5; float v = smoothstep(0.85, 0.25, length(d));
        col *= mix(1.0, v, vignette);
        float n = hash(uv * vec2(1920.0,1080.0) + fract(time) * 100.0) - 0.5;
        col += n * grain;
        col = mix(col, vec3(1.0, 0.98, 0.92), flash);
        col *= fade;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); quad.frustumCulled = false; scene.add(quad);
  let lastInfo = { calls: 0, triangles: 0 };
  return {
    rt, uniforms, lastInfo,
    setSize(w2, h2) { rt.setSize(w2, h2); },
    render(scene3, camera, p = {}) {
      uniforms.time.value = p.time || 0;
      uniforms.fade.value = p.fade ?? 1;
      uniforms.flash.value = p.flash ?? 0;
      uniforms.warm.value = p.warm ?? 0;
      uniforms.vignette.value = p.vignette ?? 0.55;
      uniforms.grain.value = p.grain ?? 0.035;
      uniforms.saturation.value = p.saturation ?? 1.06;
      uniforms.contrast.value = p.contrast ?? 1.04;
      uniforms.exposure.value = p.exposure ?? 1.0;
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene3, camera);
      lastInfo = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}
