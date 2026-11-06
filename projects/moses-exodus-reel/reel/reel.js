// reel.js: MOSES — EXODUS IN 60 SECONDS, built with the kinetic-reel skill. Every frame is a pure function of t.
// On-screen facts are scripture references (Ex / Num / Deut) and counts; every diagram is labelled SCHEMATIC.
// Layers per frame:  WebGL backgrounds (particle terrain, liquid marble, chrome knot) → 2D canvas (type, HUD, shapes)
// → WebGL post pass (RGB split, slice glitch, grain, vignette, flash) → #out. The render.mjs contract: window.ready,
// renderAt(t), renderSheet(...), gpuInfo(), globals DUR + PROJECT.
import * as THREE from '../node_modules/three/build/three.module.js';

const W = 1920, H = 1080, C = KCUE, S = C.S, Hh = C.hits, FPS = C.fps, BEAT = 60 / C.bpm;
window.DUR = C.dur; window.PROJECT = { audio: 'assets/score.m4a' };
const K = { ink: '#0E0F0E', ink2: '#171917', cream: '#F1EEE6', lime: '#DDF53D', blue: '#2F3CFF', red: '#E8412F', grey: '#8B908A', mid: '#5E625D' };
const F = { cond: '"Anton"', wide: '"Archivo Black"', serif: '"Instrument Serif"', mono: '"JetBrains Mono"', zh: '"JetBrains Mono"' };  // micro-annotations are Italian, not CJK

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const backOut = x => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const beatPulse = (t, k = 7) => Math.exp(-((t / BEAT) % 1) * k);
const TAU = Math.PI * 2;

// ---------- canvases ----------
const out = document.getElementById('out');
const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
let ctx = c2.getContext('2d');   // swapped to an offscreen buffer while a transition renders its two scenes
const mainCtx = ctx;
const mkBuf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bufA = mkBuf(), bufB = mkBuf(), bufT = mkBuf();   // outgoing scene · incoming scene · text-mask scratch
let TRANS = false;                                       // true while a scene renders inside a transition
const RECT = {};                                         // rects scenes register for zoom-through transitions
const glA = document.createElement('canvas'); glA.width = W; glA.height = H;
const RA = new THREE.WebGLRenderer({ canvas: glA, antialias: true, alpha: true, preserveDrawingBuffer: true });
RA.setPixelRatio(1); RA.setSize(W, H, false);
const RP = new THREE.WebGLRenderer({ canvas: out, antialias: false, preserveDrawingBuffer: true });
RP.setPixelRatio(1); RP.setSize(W, H, false); RP.outputColorSpace = THREE.LinearSRGBColorSpace;

// ---------- GL layer 1: particle terrain ----------
const terrain = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, W / H, .1, 100);
  const nx = 220, nz = 140, pos = new Float32Array(nx * nz * 3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const k = (i * nz + j) * 3; pos[k] = (i / (nx - 1) - .5) * 26; pos[k + 1] = 0; pos[k + 2] = -j / (nz - 1) * 30 + 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, amp: { value: 1 }, fade: { value: 1 }, tint: { value: new THREE.Color(K.cream) } },
    vertexShader: `uniform float time, amp; varying float vA;
      float wave(vec2 p, float t){ return sin(p.x*.5+t*.9)*.45 + sin(p.y*.38-t*.7)*.6 + sin((p.x+p.y)*.27+t*.5)*.7 + sin(length(p-vec2(3.,-9.))*.8-t*1.4)*.4; }
      void main(){ vec3 p = position; p.y = wave(p.xz, time)*amp; vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = 5.5 * (6.0 / -mv.z); float d = -mv.z; vA = clamp(1.0 - d/30.0, 0., 1.) * (.25 + .75*smoothstep(-1.2, 1.6, p.y)) * smoothstep(0.5, 3.5, d);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; uniform vec3 tint; varying float vA;
      void main(){ vec2 c = gl_PointCoord-.5; float r = dot(c,c); if (r>.25) discard; gl_FragColor = vec4(tint, vA*fade*(1.0-r*2.5)); }`,
  });
  scene.add(new THREE.Points(g, mat));
  return (t, o = {}) => {
    mat.uniforms.time.value = t; mat.uniforms.amp.value = o.amp ?? 1; mat.uniforms.fade.value = o.fade ?? 1;
    cam.position.set(Math.sin(t * .15) * 1.5, o.camY ?? 3.2, 5 - (o.push ?? 0)); cam.lookAt(0, -.4, -8); cam.rotation.z += o.roll ?? 0;
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 2: liquid marble (domain-warped fbm, banded) ----------
const liquid = (() => {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, strips: { value: 0 }, stripAmt: { value: 0 }, zoom: { value: 1.6 }, seed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float time, strips, stripAmt, zoom, seed; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
      void main(){
        vec2 uv = vUv; vec2 p = (uv-.5)*vec2(res.x/res.y,1.)*zoom + seed;
        if (strips > 0.) { float s = floor(uv.x*strips); p.y += (h(vec2(s,3.))-.5)*stripAmt; p.x += (h(vec2(s,7.))-.5)*stripAmt*.25; }
        vec2 q = vec2(fbm(p + time*.06), fbm(p + vec2(5.2,1.3) - time*.05));
        vec2 r = vec2(fbm(p + 3.6*q + vec2(1.7,9.2) + time*.13), fbm(p + 3.6*q + vec2(8.3,2.8) - time*.11));
        float f = fbm(p + 3.8*r);
        float band = sin(f*22.0 + r.x*7.0)*.5+.5;
        vec3 blue = vec3(.19,.24,1.), red = vec3(.93,.33,.23), lil = vec3(.75,.68,.98), navy = vec3(.06,.07,.32), cream = vec3(.98,.9,.86);
        vec3 col = mix(blue, red, smoothstep(.38,.62,f));
        col = mix(col, lil, smoothstep(.62,.95,band)*.55);
        col = mix(col, navy, smoothstep(.55,.95,1.0-f)*.75);
        col = mix(col, cream, smoothstep(.93,1.,band)*smoothstep(.45,.7,f)*.5);
        gl_FragColor = vec4(col,1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.strips.value = o.strips || 0; u.stripAmt.value = o.stripAmt || 0; u.zoom.value = o.zoom ?? 1.6; u.seed.value = o.seed || 0;
    RA.setClearColor(0x000000, 1); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 3: chrome torus knot (matcap + inked outline) ----------
const knot = (() => {
  const mc = document.createElement('canvas'); mc.width = mc.height = 256; const m = mc.getContext('2d');
  m.fillStyle = '#202020'; m.fillRect(0, 0, 256, 256);
  let g = m.createRadialGradient(96, 84, 4, 128, 128, 132);
  [[0, '#ffffff'], [.18, '#f2f2f2'], [.38, '#b9b9b9'], [.55, '#5c5c5c'], [.7, '#262626'], [.84, '#9d9d9d'], [.93, '#e6e6e6'], [1, '#5a5a5a']].forEach(([s, c]) => g.addColorStop(s, c));
  m.fillStyle = g; m.beginPath(); m.arc(128, 128, 128, 0, TAU); m.fill();
  g = m.createLinearGradient(0, 120, 0, 170); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = g; m.fillRect(0, 120, 256, 50);
  const tex = new THREE.CanvasTexture(mc); tex.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9);
  const geo = new THREE.TorusKnotGeometry(1.25, .34, 360, 48, 2, 3);
  const body = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({ matcap: tex }));
  const hull = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0e0f0e, side: THREE.BackSide })); hull.scale.setScalar(1.045);
  const grp = new THREE.Group(); grp.add(hull, body); scene.add(grp);
  return (t, o = {}) => {
    grp.rotation.set(t * .55 + (o.r0 || 0), t * .8, t * .25);
    grp.position.set(o.x ?? 1.9, o.y ?? 0, 0); grp.scale.setScalar(o.s ?? 1);
    RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam);
    return glA;
  };
})();

// ---------- GL layer 4: a particle cloud that condenses into a thyroid (two lobes + isthmus) ----------
// k = 0: a loose shell (dust / embedding space) · k = 1: the gland. Points 0–2 can be highlighted (retrieved chunks);
// cloud.project(i, t, o) gives a point's screen position for 2D overlays (same maths as the shader, minus the wobble).
const cloud = (() => {
  const n = 9000, A = new Float32Array(n * 3), Bp = new Float32Array(n * 3), R = new Float32Array(n), ID = new Float32Array(n);
  let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const inside = (x, y) => {
    for (const s of [-1, 1]) { const cx = s * .62, cy = .05, a = -s * .28, dx = x - cx, dy = y - cy, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); if ((u / .36) ** 2 + (v / .72) ** 2 < 1) return true; }
    return Math.abs(x) < .42 && y > -.42 && y < -.12;
  };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, th = rnd() * TAU, r = 2.4 + rnd() * 1.3, q = Math.sqrt(1 - u * u);
    A.set([Math.cos(th) * q * r * 1.45, u * r * .8, Math.sin(th) * q * r], i * 3);
    let x, y; do { x = rnd() * 2.2 - 1.1; y = rnd() * 1.8 - .8; } while (!inside(x, y));
    Bp.set([x * 1.6, y * 1.6, (rnd() - .5) * .45], i * 3);
    R[i] = rnd(); ID[i] = i;
  }
  // move three front-and-centre shell points into slots 0–2 (the highlighted "retrieved chunks")
  let slot = 0;
  for (let i = 3; i < n && slot < 3; i++) {
    const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2];
    if (Math.abs(x) < 1.8 && Math.abs(y) < 1 && z > 1.2 && (slot === 0 || Math.hypot(x - A[0], y - A[1]) > .9) && (slot < 2 || Math.hypot(x - A[3], y - A[4]) > .9)) {
      for (const arr of [A, Bp]) for (let c = 0; c < 3; c++) { const tmp = arr[slot * 3 + c]; arr[slot * 3 + c] = arr[i * 3 + c]; arr[i * 3 + c] = tmp; }
      const tr = R[slot]; R[slot] = R[i]; R[i] = tr; slot++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(A.slice(), 3)); g.setAttribute('a', new THREE.BufferAttribute(A, 3));
  g.setAttribute('b', new THREE.BufferAttribute(Bp, 3)); g.setAttribute('r', new THREE.BufferAttribute(R, 1)); g.setAttribute('id', new THREE.BufferAttribute(ID, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, k: { value: 0 }, hi: { value: 0 }, size: { value: 4 }, fade: { value: 1 } },
    vertexShader: `attribute vec3 a; attribute vec3 b; attribute float r; attribute float id; uniform float time, k, hi, size; varying float vA; varying vec3 vC;
      void main(){
        float kk = clamp(k*1.4 - r*.4, 0., 1.); kk = kk*kk*(3.-2.*kk);
        vec3 wa = a + vec3(sin(time*.5+r*20.)*.08, cos(time*.4+r*13.)*.08, 0.);
        vec3 wb = b + vec3(sin(time*1.3+r*40.)*.015, cos(time*1.1+r*30.)*.015, 0.);
        vec4 mv = modelViewMatrix*vec4(mix(wa, wb, kk), 1.);
        float isHi = step(id, 2.5) * hi;
        gl_PointSize = size * (1. + 5.*isHi) * (7.0 / -mv.z);
        vA = (.3 + .45*kk) * (1. + 2.5*isHi);
        vC = mix(vec3(.95,.93,.9), vec3(.87,.96,.24), min(1., step(.86, r) + isHi));
        vC = mix(vC, vec3(.91,.25,.18), step(.965, r)*(1.-isHi));
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float fade; varying float vA; varying vec3 vC;
      void main(){ vec2 c = gl_PointCoord-.5; float d = dot(c,c); if (d>.25) discard; gl_FragColor = vec4(vC, vA*fade*(1.-d*3.)); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, .1, 100); cam.position.set(0, 0, 9); scene.add(pts);
  const pose = (t, o) => { pts.rotation.set(.12 * Math.sin(t * .3), o.rot ?? t * .25, 0); pts.position.set(o.x ?? 0, o.y ?? 0, 0); pts.scale.setScalar(o.s ?? 1); pts.updateMatrixWorld(); };
  const fn = (t, o = {}) => {
    const u = mat.uniforms; u.time.value = t; u.k.value = o.k ?? 0; u.hi.value = o.hi ?? 0; u.fade.value = o.fade ?? 1; u.size.value = o.size ?? 4;
    pose(t, o); RA.setClearColor(0x000000, 0); RA.clear(); RA.render(scene, cam); return glA;
  };
  const v = new THREE.Vector3();
  fn.project = (i, t, o = {}) => {
    let kk = clamp((o.k ?? 0) * 1.4 - R[i] * .4); kk = kk * kk * (3 - 2 * kk);
    pose(t, o); v.set(lerp(A[i * 3], Bp[i * 3], kk), lerp(A[i * 3 + 1], Bp[i * 3 + 1], kk), lerp(A[i * 3 + 2], Bp[i * 3 + 2], kk)).applyMatrix4(pts.matrixWorld).project(cam);
    return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H];
  };
  return fn;
})();

// ---------- post pass ----------
const post = (() => {
  const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.NoColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: tex }, split: { value: 0 }, slice: { value: 0 }, seed: { value: 0 }, grain: { value: .05 }, time: { value: 0 }, vign: { value: .5 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) }, res: { value: new THREE.Vector2(W, H) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D tex; uniform float split, slice, seed, grain, time, vign, flash; uniform vec3 flashCol; uniform vec2 res; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y*28.0 + h(vec2(seed,1.))*3.0), hb = h(vec2(band, seed));
        if (hb < slice) uv.x += (h(vec2(band, seed+2.)) - .5) * .16 * slice;
        vec2 d = vec2(split, split*.15);
        vec3 c = vec3(texture2D(tex, uv + d).r, texture2D(tex, uv).g, texture2D(tex, uv - d).b);
        c += (h(vUv*res + time*61.7) - .5) * grain;
        vec2 q = vUv - .5; c *= 1.0 - vign*dot(q,q)*.9;
        c = mix(c, flashCol, flash);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return (t, fx) => {
    tex.needsUpdate = true;
    const u = mat.uniforms; u.split.value = fx.split; u.slice.value = fx.slice; u.seed.value = fx.seed; u.time.value = Math.floor(t * FPS);
    u.grain.value = fx.grain; u.vign.value = fx.vign; u.flash.value = fx.flash; u.flashCol.value.set(fx.flashCol);
    RP.render(scene, cam);
  };
})();

// ---------- 2D helpers ----------
let FX;
const font = (fam, size, weight = '') => `${weight} ${size}px ${fam}`.trim();
function txt(s, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha = o.a ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 28; }
  if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
  if (o.fill !== null) { ctx.fillStyle = o.fill || K.cream; ctx.fillText(s, x, y); }
  ctx.restore();
}
// per-letter animation: fn(i, n) → { dx, dy, r, s, a }
function letters(s, x, y, o, fn) {
  ctx.save(); ctx.font = o.font; ctx.letterSpacing = (o.ls || 0) + 'px';
  const total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i]; if (ch === ' ') continue;
    const px = ctx.measureText(s.slice(0, i)).width, cw = ctx.measureText(ch).width, a = fn(i, n);
    if ((a.a ?? 1) <= 0.001) continue;
    ctx.save(); ctx.globalAlpha = a.a ?? 1; ctx.translate(x0 + px + cw / 2 + (a.dx || 0), y + (a.dy || 0)); ctx.rotate(a.r || 0); ctx.scale(a.s ?? 1, a.s ?? 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.strokeText(ch, 0, 0); }
    if (o.fill !== null) { ctx.fillStyle = a.fill || o.fill || K.cream; ctx.fillText(ch, 0, 0); }
    ctx.restore();
  }
  ctx.restore();
  return total;
}
const measure = (s, f, ls = 0) => { ctx.save(); ctx.font = f; ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; };
const bg = col => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
function line(pts, col, lw = 2, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
function circle(x, y, r, o = {}) { if (!(r > .01)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.arc(x, y, r, o.a0 ?? 0, o.a1 ?? TAU); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// the Jelly mark: a dome and four tentacles. (x, y) = centre of the dome's base; r = dome radius; k = 0..1 build-in
function jelly(x, y, r, col, t, k = 1, rot = 0) {
  if (!(r > .01)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
  const dome = easeOut(seg(k, 0, .55));
  if (dome > 0) { ctx.beginPath(); ctx.arc(0, 0, r * dome, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
  const tk = seg(k, .35, 1);
  for (let i = 0; i < 4; i++) {
    const xi = (-0.6 + i * .4) * r, L = r * (1.05 + .25 * (i % 2)) * easeOut(seg(tk, i * .12, .6 + i * .12));
    if (L < 1) continue;
    ctx.lineWidth = r * .16; ctx.beginPath(); ctx.moveTo(xi, r * .12);
    for (let s = 1; s <= 8; s++) { const q = s / 8; ctx.lineTo(xi + Math.sin(t * 5 + i * 1.3 - q * 4) * r * .12 * q, r * .12 + L * q); }
    ctx.stroke();
  }
  ctx.restore();
}
function starburst(x, y, r, n, col, rot = 0, inner = .62) { if (!(r > .01)) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? r * inner : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function asterisk(x, y, r, col, lw = 5, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } ctx.restore(); }
function arrowNE(x, y, s, col, lw = 6) { line([[x, y + s], [x + s, y]], col, lw); line([[x + s * .35, y], [x + s, y], [x + s, y + s * .65]], col, lw); }
// HUD: corner brackets + micro-type in the four corners + a progress rule
function hud(t, o) {
  const dark = o.dark !== false, col = dark ? 'rgba(241,238,230,.85)' : 'rgba(14,15,14,.85)', dim = dark ? 'rgba(241,238,230,.45)' : 'rgba(14,15,14,.45)';
  const k = o.k ?? 1, m = 40, L = 26 * k;
  if (o.brackets !== false) for (const [cx, cy, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) line([[cx, cy + sy * L], [cx, cy], [cx + sx * L, cy]], col, 2, k);
  const f = font(F.mono, 17, 500), a = clamp(k * 1.4 - .3);
  if (o.tl) txt(o.tl, m + 18, m + 30, { font: f, fill: col, ls: 2.5, a });
  if (o.tr) txt(o.tr, W - m - 18, m + 30, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.bl) txt(o.bl, m + 18, H - m - 18, { font: f, fill: col, ls: 2.5, a });
  if (o.br) txt(o.br, W - m - 18, H - m - 18, { font: f, fill: col, ls: 2.5, align: 'right', a });
  if (o.zh) txt(o.zh, o.zhRight ? W - m - 18 : m + 18, H - m - 52, { font: font(F.zh, 21, 500), fill: dim, ls: 3, align: o.zhRight ? 'right' : 'left', a });
  if (o.progress !== false) {   // the reel as a trace: one segment per chapter, filled as it plays
    const y = H - m + 10, x0 = m + 18, x1 = W - m - 18, X = s => lerp(x0, x1, s / C.dur);
    for (const [, a0, a1] of C.CH) {
      const xa = X(a0) + 3, xb = X(a1) - 3, on = t >= a0 && t < a1;
      line([[xa, y], [xb, y]], dim, 1, a * .6);
      if (t > a0) line([[xa, y], [Math.min(xb, X(t)), y]], col, on ? 3 : 2, a);
    }
  }
}
const tc = t => { const f = Math.floor(t * FPS), s = Math.floor(f / FPS), fr = f % FPS, p = n => String(n).padStart(2, '0'); return `TC 00:00:${p(s)}:${p(fr)}`; };
const sec = (i, name) => `■ ${String(i).padStart(2, '0')} / ${String(C.CH.filter(c => /^\d/.test(c[0])).length).padStart(2, '0')}   ${name}`;
const glShot = (canvas, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.drawImage(canvas, 0, 0, W, H); ctx.restore(); };
const count = (t, t0, t1, v0, v1) => Math.round(lerp(v0, v1, expoOut(seg(t, t0, t1))));

// ---------- scenes ----------
function odometer(v0, v1, k, x, y, f, col) {   // digits roll from v0 to v1
  const s0 = String(v0), s1 = String(v1); ctx.save(); ctx.font = f;
  let xx = x; const hgt = parseFloat(f.match(/(\d+)px/)[1]) * .92;
  for (let i = 0; i < s1.length; i++) {
    const d0 = +s0[i], d1 = +s1[i], w = ctx.measureText(s1[i]).width, kk = expoOut(clamp(k * 1.2 - i * .15));
    ctx.save(); ctx.beginPath(); ctx.rect(xx - 10, y - hgt, w + 20, hgt * 1.12); ctx.clip();
    const steps = (d1 - d0 + 10) % 10 || 10, off = kk * steps;
    for (let j = -1; j <= steps + 1; j++) { const dy = (j - off) * hgt; if (Math.abs(dy) > hgt * 1.2) continue; ctx.fillStyle = col; ctx.fillText(String((d0 + j + 10) % 10), xx, y + dy); }
    ctx.restore(); xx += w;
  }
  ctx.restore(); return xx;
}
function tape(t, y, rot, col, fg, words, speed, dir, k) {
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(rot); ctx.translate(lerp(dir * W * 1.4, 0, expoOut(k)), 0);
  ctx.fillStyle = col; ctx.fillRect(-W * 1.5, -85, W * 3, 170);
  const f = font(F.cond, 128), unit = words.map(w => measure(w, f) + 170).reduce((a, b) => a + b, 0), off = ((t * speed) % unit + unit) % unit;
  let x = -W * 1.4 - off * dir;
  while (x < W * 1.5) for (const w of words) { txt(w, x, 50, { font: f, fill: fg }); const ww = measure(w, f); if (w !== '') { if (words.indexOf(w) % 2 === 0) asterisk(x + ww + 85, 0, 34, fg, 7, t); else arrowNE(x + ww + 55, -32, 62, fg, 8); } x += ww + 170; }
  ctx.restore();
}
// ---------- v2 helpers ----------
function rrect(x, y, w, h, r, o = {}) { if (!(w > .5) || !(h > .5)) return; ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); } if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); } ctx.restore(); }
// a label chip, left edge at x, vertically centred on y; k = 0..1 wipe-in. Returns its width.
function chip(s, x, y, o = {}) {
  const f = o.font || font(F.mono, 18, 700), ls = o.ls ?? 2, w = measure(s, f, ls) + 28, h = o.h || 38, k = o.k ?? 1;
  if (k <= 0) return w;
  rrect(x, y - h / 2, w * easeOut(k), h, o.r ?? 0, { fill: o.bg || K.ink, stroke: o.line, lw: o.lw, a: o.a });
  if (k > .6) txt(s, x + 14, y + 6.5, { font: f, fill: o.fg || K.cream, ls, a: (o.a ?? 1) * seg(k, .6, 1) });
  return w;
}
function arrow(x0, y0, x1, y1, col, lw = 2, a = 1, head = 13) {
  if (a <= 0) return;
  line([[x0, y0], [x1, y1]], col, lw, a); const g = Math.atan2(y1 - y0, x1 - x0);
  line([[x1 - Math.cos(g - .45) * head, y1 - Math.sin(g - .45) * head], [x1, y1], [x1 - Math.cos(g + .45) * head, y1 - Math.sin(g + .45) * head]], col, lw, a);
}
// big number + small label under it
function stat(v, label, x, y, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  txt(v, x, y + (1 - easeOut(k)) * 24, { font: font(F.cond, o.size || 110), fill: o.col || K.cream, a: k, align: o.align });
  txt(label, x + (o.align === 'right' ? 0 : 4), y + (o.gap || 38), { font: font(F.mono, o.ls ? 16 : 17, 700), fill: o.sub || 'rgba(241,238,230,.7)', ls: 2.5, a: k, align: o.align });
}
const pad2 = n => String(n).padStart(2, '0');
// drop-in word: letters fall from above with overshoot
const dropWord = (s, x, y, f, t0, t, o = {}) => letters(s, x, y, { font: f, fill: o.fill || K.cream, align: o.align }, (i) => {
  const k = seg(t, t0 + i * (o.stag ?? .03), t0 + i * (o.stag ?? .03) + (o.dur ?? .32)); return { dy: (1 - expoOut(k)) * (o.fall ?? 220), a: k > 0 ? 1 : 0, fill: o.fillAt ? o.fillAt(i) : undefined };
});
const glitchIn = (lt, seed, d = .14, amt = .5) => { if (!TRANS && lt < d) { FX.slice = Math.max(FX.slice, amt * (1 - lt / d)); FX.split = Math.max(FX.split, .006 * (1 - lt / d)); FX.seed = seed; } };
// ---------- 01 MICROSOFT CLOUD & AI ----------
// ---------- 02 UW SURGERY · 03 PROJECTS ----------
// ---------- v3 helpers ----------
// Letters as windows onto a shader: draw() into a scratch buffer, keep only `src` inside what was drawn.
function texWindow(draw, src) {
  const saved = ctx, g = bufT.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
  ctx = g; draw(); ctx = saved;
  g.globalCompositeOperation = 'source-in'; g.drawImage(src, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.drawImage(bufT, 0, 0);
}
function redacted(x, y, w, h, seed, col, a = 1) {   // a line of "text" as blocks (never real content)
  let xx = x; const end = x + w;
  for (let j = 0; xx < end - 10; j++) { const ww = Math.min(end - xx, 30 + 90 * hash(seed * 13 + j)); rrect(xx, y, ww, h, h / 2, { fill: col, a }); xx += ww + 10; }
}
const bez = (p0, c0, c1, p1, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * c0[0] + 3 * v * u * u * c1[0] + u * u * u * p1[0], v * v * v * p0[1] + 3 * v * v * u * c0[1] + 3 * v * u * u * c1[1] + u * u * u * p1[1]]; };
function thread(p0, p1, k, col, lw = 2.5) {   // a cubic "citation thread", drawn up to k
  if (k <= 0) return; const c0 = [p0[0] + 160, p0[1]], c1 = [p1[0] - 160, p1[1]], pts = [];
  for (let i = 0; i <= 40 * k; i++) pts.push(bez(p0, c0, c1, p1, i / 40));
  if (pts.length > 1) line(pts, col, lw);
}
const DARK = '#0B0D0C';

// ---------- index ----------
// ---------- 02 UW–MADISON DEPARTMENT OF SURGERY ----------
// ---------- 03 ENTERPRISE RAG ----------
// ---------- finale: the whole reel as a trace ----------
// ---------- transitions (into a scene; A = outgoing scene frozen on its last frame, B = incoming, live) ----------
const easeInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ioExpo = x => { x = clamp(x); return x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const trIris = (cx, cy, ring = K.lime) => (k, A, B, g) => {
  const e = easeIn(k) * .6 + ease(k) * .4, R = e * Math.hypot(W, H);
  g.drawImage(A, 0, 0); g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip(); g.drawImage(B, 0, 0); g.restore();
  g.save(); g.strokeStyle = ring; g.lineWidth = 2 + 10 * (1 - e); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.restore();
};
const trZoom = rect => (k, A, B, g) => {   // zoom into a UI element of A; B is seen through it, then fills the frame
  const [rx, ry, rw, rh] = typeof rect === 'function' ? rect() : rect, e = ioExpo(k), s1 = Math.max(W / rw, H / rh), s = Math.pow(s1, e);
  const cx = rx + rw / 2, cy = ry + rh / 2, px = lerp(cx, W / 2, e), py = lerp(cy, H / 2, e);
  g.save(); g.translate(px, py); g.scale(s, s); g.translate(-cx, -cy); g.drawImage(A, 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(px - rw / 2 * s, py - rh / 2 * s, rw * s, rh * s); g.clip(); g.globalAlpha = clamp(e * 2.2 - .2); g.drawImage(B, 0, 0); g.restore();
  FX.split = Math.max(FX.split, .008 * Math.sin(Math.PI * e));
};
const trPush = (dx, dy) => (k, A, B, g) => { const e = ioExpo(k); g.drawImage(A, -dx * W * e, -dy * H * e); g.drawImage(B, dx * W * (1 - e), dy * H * (1 - e)); FX.split = Math.max(FX.split, .012 * Math.sin(Math.PI * e)); };
const trWipe = (col = K.lime) => (k, A, B, g) => { const x = easeInOut(k) * (W + 40); g.drawImage(A, 0, 0); g.save(); g.beginPath(); g.rect(0, 0, x, H); g.clip(); g.drawImage(B, 0, 0); g.restore(); g.fillStyle = col; g.fillRect(x - 4, 0, 8, H); };
const trSlats = (n = 12) => (k, A, B, g) => { g.drawImage(A, 0, 0); const sw = W / n; for (let i = 0; i < n; i++) { const kk = easeInOut(seg(k, i * .035, i * .035 + .6)); if (kk <= 0) continue; g.save(); g.beginPath(); g.rect(i * sw, 0, sw * kk + 1, H); g.clip(); g.drawImage(B, 0, 0); g.restore(); } };
const trGrid = (cols = 16, rows = 9, col = K.lime) => (k, A, B, g) => {
  g.drawImage(A, 0, 0); const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = (c + r) / (cols + rows - 2), kk = seg(k, d * .6, d * .6 + .4); if (kk <= 0) continue;
    const x = c * cw, y = r * ch;
    if (kk < .5) { const s = kk * 2; g.fillStyle = col; g.fillRect(x + cw * (1 - s) / 2, y + ch * (1 - s) / 2, cw * s, ch * s); }
    else { g.save(); g.beginPath(); g.rect(x, y, cw + 1, ch + 1); g.clip(); g.drawImage(B, 0, 0); g.restore(); if (kk < 1) { g.globalAlpha = 2 - kk * 2; g.fillStyle = col; g.fillRect(x, y, cw + 1, ch + 1); g.globalAlpha = 1; } }
  }
};
// ---------- helpers for this reel ----------
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);   // stable sway (not defined by the template)
// Stacked translucent circles: a warm halo for the burning bush (2D, no shader).
function halo(x, y, r, col, a = 1) {
  for (let i = 4; i >= 1; i--) circle(x, y, r * (.32 + i * .18), { fill: col, a: .10 * a });
}
// A soft elliptical dark scrim, so type stays legible over the marble without a hard-edged box.
function softScrim(cx, cy, rx, ry, a = .5) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(14,15,20,${a})`); g.addColorStop(1, 'rgba(14,15,20,0)');
  ctx.fillStyle = g;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
  ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); ctx.restore();
  ctx.restore();
}
// A flame: starburst + a pale core, rotating with t. k = 0..1 build-in.
function flame(x, y, r, t, k, col = '#E8AA38') {
  const rr = r * backOut(clamp(k)); if (rr < 1) return;
  starburst(x, y, rr, 11, col, t * .8, .52);
  circle(x, y, rr * .46, { fill: '#FFF3C4', a: .9 });
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + t * 1.3, d = rr * (.9 + .18 * Math.sin(t * 7 + i * 2));
    circle(x + Math.cos(a) * d, y + Math.sin(a) * d, 7 + 4 * Math.sin(t * 9 + i), { fill: col, a: .7 });
  }
}
// A row of mono chips that wipe in on their own hit times. Returns the next x.
function hitsChips(items, times, x, y, t, o = {}) {
  items.forEach((s, i) => {
    x += chip(s, x, y, { k: seg(t, times[i], times[i] + (o.dur || .22)),
      bg: o.bg ? o.bg(i) : K.ink, fg: o.fg ? o.fg(i) : K.cream }) + 14;
  });
  return x;
}
// A vertical wavy line (water, reeds, a pillar), built from sine samples.
function waveLine(x, y0, y1, amp, t, col, lw = 3, ph = 0) {
  const pts = []; for (let i = 0; i <= 24; i++) {
    const q = i / 24; pts.push([x + Math.sin(q * 8 + t * 2 + ph) * amp, lerp(y0, y1, q)]);
  }
  line(pts, col, lw);
}
// A stone tablet: rounded arch top + the ink rim.
function tablet(x, y, w, h, k, o = {}) {
  if (k <= .001) return;
  rrect(x, y, w, h, 56, { fill: o.fill || K.ink2, stroke: o.stroke || K.cream, lw: 3, a: k });
}

// ---------- shots (one function per shot; each paints the WHOLE 1920×1080 frame) ----------
// Ground rotation: ink → cream → ink2/blue → ink → liquid → blue → cream → liquid → ink → ink → cream → ink2 → cream → ink → lime → dark.
function sOpen(t) {
  bg(K.ink); const lt = t - S.open;
  glShot(terrain(t, { fade: ease(seg(t, .1, 1.2)), amp: lerp(.2, 1.1, easeOut(seg(t, 0, 2.5))), push: t * .6 }));
  const cx = W / 2, cy = H / 2 + 30;
  if (t > Hh.dot - .05) {
    if (t < Hh.mark) circle(cx, cy, (14 + 10 * beatPulse(t)) * backOut(seg(t, Hh.dot, Hh.dot + .35)), { fill: K.lime });
    else { const k = backOut(seg(t, Hh.mark, Hh.mark + .4)); starburst(cx, cy, 90 * k, 14, K.lime, t * .4, .72); circle(cx, cy, 170 * k, { stroke: 'rgba(221,245,61,.35)', lw: 2 }); }
  }
  hud(t, { tl: 'EXODUS / A KINETIC READING', tr: tc(t), bl: sec(0, 'OPEN'), br: '1920×1080 · 24 FPS · 120 BPM', zh: 'UN MINUTO · UN LIBRO', k: ease(seg(lt, .1, .6)) });
}

function sTitle(t) {
  bg(K.cream);
  txt('SOURCE / THE BOOK OF EXODUS', 140, 175, { font: font(F.mono, 22, 700), fill: K.mid, ls: 5 });
  dropWord('MOSES.', 140, 500, font(F.cond, 330), Hh.head, t, { fill: K.ink, fall: 200, fillAt: i => i === 5 ? K.red : K.ink });
  const cx = 1500, cy = 430, r = 180;
  circle(cx, cy, r, { fill: K.lime });
  starburst(cx, cy, 110, 14, K.ink, t * .3, .7);
  RECT.titleMark = [cx - r, cy - r, r * 2, r * 2];
  hitsChips(['EX 1–40', '120 BPM', 'A KINETIC READING'], Hh.titleChips, 146, 830, t, { bg: i => i === 1 ? K.lime : K.ink, fg: i => i === 1 ? K.ink : K.cream });
  hud(t, { dark: false, tl: 'OPEN / TITLE', tr: tc(t), bl: sec(0, 'TITLE'), br: 'ALL FRAMES DRAWN IN CODE', brackets: false, zh: 'IL LIBRO DELL’ESODO' });
}

function sRiver(t) {
  bg(K.ink2);
  rrect(0, 620, W, H - 620, 0, { fill: K.blue });
  waterRipples(t);
  // reeds: a stable field of swaying vertical strokes (hash keeps every stem in place)
  for (let i = 0; i < 34; i++) {
    const x = 80 + i * 54, h = 60 + 72 * hash(i + 4), sway = wob(t, .35, i * .7) * 8;
    line([[x, 640], [x + sway * .4, 640 - h * .55], [x + sway, 640 - h]], 'rgba(241,238,230,.55)', 2.5);
  }
  dropWord('DRAWN OUT.', 140, 400, font(F.cond, 210), S.river + .05, t, { fill: K.cream, fall: 180, fillAt: i => i === 9 ? K.lime : K.cream });
  txt('OUT OF THE WATER · EX 2:10', 146, 480, { font: font(F.mono, 22, 700), fill: K.grey, ls: 3 });
  // the basket: a small lime ark drifting right, bobbing on the water; a pale bundle inside
  const bx = lerp(1120, 1500, ease(seg(t, Hh.basket[0], Hh.basket[3] + .6))), by = 730 + Math.sin(t * 2.4) * 12;
  line([[bx - 260, by + 60], [bx - 150, by + 52], [bx - 60, by + 58]], 'rgba(241,238,230,.35)', 3);
  rrect(bx - 130, by - 60, 260, 120, 34, { fill: K.lime, stroke: K.ink, lw: 4 });
  rrect(bx - 62, by - 32, 124, 64, 30, { fill: K.cream });
  hitsChips(['EX 2:3', 'BULRUSHES + BITUMEN', 'PHARAOH’S DAUGHTER'], Hh.riverChips, 146, 880, t, { bg: () => K.cream, fg: () => K.ink });
  hud(t, { tl: '01 / THE CALL', tr: tc(t), bl: sec(1, 'RIVER'), br: 'EX 2:3–10', zh: 'IL CESTELLO TRA I GIUNCHI' });
}
// Water ripples: plain 2D lines (this engine is Canvas 2D + WebGL, not p5.brush).
function waterRipples(t) {
  for (let j = 0; j < 5; j++) {
    const y = 690 + j * 80, pts = [];
    for (let i = 0; i <= 20; i++) pts.push([i * W / 20, y + Math.sin(i * .7 + t * 1.6 + j) * 9]);
    line(pts, 'rgba(241,238,230,.22)', 2);
  }
}

function sBush(t) {
  bg(K.ink);
  halo(1420, 500, 330, '#E8AA38', .9);
  // the bush: a rounded canopy whose outline never changes while the flame moves inside it
  for (let i = 0; i < 3; i++) line([[1420, 800], [1420 + (i - 1) * 80, 690], [1420 + (i - 1) * 120, 610]], '#4E7C43', 12);
  const canopy = [[-170, 610, 72], [-105, 560, 88], [-30, 540, 92], [55, 555, 86], [155, 605, 74],
                  [-130, 665, 66], [-45, 640, 76], [50, 650, 72], [125, 670, 62]];
  canopy.forEach(([dx, dy, r], i) => circle(1420 + dx, dy, r, { fill: i % 3 ? '#6E9F58' : '#5C8A4A', stroke: 'rgba(14,15,14,.5)', lw: 2 }));
  flame(1420, 470, 118 + 22 * Math.sin(t * 3), t, seg(t, Hh.bush, Hh.bush + 1.1));
  dropWord('BURNING,', 140, 340, font(F.cond, 190), S.bush + .05, t, { fill: K.cream, fall: 170 });
  dropWord('NOT CONSUMED.', 140, 560, font(F.cond, 150), S.bush + .25, t, { fill: K.lime, fall: 160 });
  txt('SCHEMATIC — THE SAME BRANCHES, FRAME 0 → FRAME 120', 146, 800, { font: font(F.mono, 20, 700), fill: K.grey, ls: 2.5 });
  hitsChips(['EX 3:2', 'FLAME WITHOUT FUEL', 'A VOICE CALLS'], Hh.bushChips, 146, 870, t, { bg: i => i === 1 ? K.lime : K.cream, fg: () => K.ink });
  hud(t, { tl: '01 / THE BUSH', tr: tc(t), bl: sec(1, 'CALL'), br: 'EX 3:1–14', zh: 'IL ROVETO CHE NON SI CONSUMA' });
}

function sVoice(t) {
  glShot(liquid(t, { zoom: 1.5, seed: 3 }));
  softScrim(W / 2, 735, 1150, 230, .46);
  const words = ['I am', 'who', 'I am.'], f = `italic 124px ${F.serif}`;
  const total = measure(words.join(' '), f); let x = W / 2 - total / 2;
  words.forEach((wd, i) => {
    const k = seg(t, Hh.words[i], Hh.words[i] + .3);
    txt(wd, x, H / 2 + 20 + (1 - easeOut(k)) * 30, { font: f, fill: K.cream, a: k, glow: 'rgba(14,15,40,.35)', glowR: 20 });
    x += measure(wd + ' ', f);
  });
  txt('EX 3:14 · THE NAME', W / 2, 725, { font: font(F.mono, 24, 700), fill: K.cream, align: 'center', ls: 5, a: seg(t, S.voice + .3, S.voice + .8) });
  txt('A VOICE, NOT A VISION', W / 2, 770, { font: font(F.mono, 19, 700), fill: 'rgba(241,238,230,.7)', align: 'center', ls: 3, a: seg(t, S.voice + .5, S.voice + 1) });
  hud(t, { tl: '01 / THE NAME', tr: tc(t), bl: sec(1, 'VOICE'), br: 'LIQUID MARBLE · WEBGL', zh: 'IO SONO COLUI CHE SONO' });
}

function sStaff(t) {
  bg(K.ink2);
  dropWord('THE STAFF.', 140, 330, font(F.cond, 190), S.staff + .05, t, { fill: K.cream, fall: 170 });
  const nodes = [['STAFF', 260], ['SERPENT', 800], ['STAFF', 1340]], ny = 580, nw = 340, nh = 130;
  nodes.forEach(([s, cx], i) => {
    const k = seg(t, Hh.nodes[i], Hh.nodes[i] + .25);
    rrect(cx, ny - nh / 2, nw, nh, 0, { fill: K.ink, stroke: 'rgba(241,238,230,.75)', lw: 2, a: k });
    txt(s, cx + nw / 2, ny + 16, { font: font(F.cond, 50), fill: K.cream, align: 'center', a: k, ls: 2 });
    if (i < 2) arrow(cx + nw + 12, ny, nodes[i + 1][1] - 12, ny, K.grey, 2.5, seg(t, Hh.nodes[i + 1], Hh.nodes[i + 1] + .2));
  });
  const hp = Hh.hops; let x = 430, y = ny;
  for (let i = 0; i < hp.length; i++) if (t >= hp[i]) {
    const e = ease(seg(t, hp[i], (hp[i + 1] ?? hp[i] + .5) - .08));
    x = lerp(430 + i * 540, 430 + (i + 1) * 540, e); y = ny - Math.sin(Math.PI * e) * 80;
  }
  if (t > hp[0] - .1) circle(x, y, 16 + 6 * beatPulse(t), { fill: K.lime });
  txt('SCHEMATIC — A SIGN GIVEN, THEN TAKEN BACK · EX 4:2–4', 146, 810, { font: font(F.mono, 20, 700), fill: K.grey, ls: 2.5 });
  hitsChips(['EX 4:2–4', 'EX 4:17'], Hh.staffChips, 146, 870, t, { bg: () => K.cream, fg: () => K.ink });
  hud(t, { tl: '01 / THE SIGN', tr: tc(t), bl: sec(1, 'STAFF'), br: 'EX 4:2–4', zh: 'IL BASTONE E IL SERPENTE' });
}

function sDemand(t) {
  bg(K.blue); const lt = t - S.demand;
  glitchIn(lt, 18, .14, .35);
  txt('01', 1780, 820, { font: font(F.cond, 500), fill: null, stroke: 'rgba(241,238,230,.22)', lw: 3, align: 'right' });
  dropWord('LET MY', 140, 450, font(F.wide, 150), Hh.slam, t, { fill: K.cream, fall: 200 });
  dropWord('PEOPLE GO.', 140, 740, font(F.cond, 230), Hh.slam + .2, t, { fill: K.cream, fall: 220, fillAt: i => i === 9 ? K.red : K.cream });
  hitsChips(['EX 5:1', 'PHARAOH'], Hh.demandChips, 146, 880, t, { bg: i => i === 1 ? K.red : K.cream, fg: () => K.ink });
  hud(t, { tl: '01 / THE DEMAND', tr: tc(t), bl: sec(1, 'DEMAND'), br: 'EX 5:1', zh: 'LASCIA ANDARE IL MIO POPOLO' });
}

function sPlagues(t) {
  bg(K.cream); glitchIn(t - S.plagues, 20, .14, .3);
  txt('02', 1780, 820, { font: font(F.cond, 460), fill: null, stroke: 'rgba(14,15,14,.16)', lw: 3, align: 'right' });
  dropWord('TEN PLAGUES.', 140, 330, font(F.cond, 180), S.plagues + .05, t, { fill: K.ink, fall: 170, fillAt: i => i === 11 ? K.red : K.ink });
  txt('SCHEMATIC — TEN TILES ARE A COUNT, NOT A DEPICTION', 146, 400, { font: font(F.mono, 19, 700), fill: K.mid, ls: 2.5 });
  const doorK = seg(t, Hh.passover - .2, Hh.passover + .3);
  for (let i = 0; i < 10; i++) {
    const x = 1000 + (i % 5) * 156, y = 470 + Math.floor(i / 5) * 180, k = seg(t, Hh.tiles[i], Hh.tiles[i] + .2);
    rrect(x, y, 140, 160, 0, { fill: i === 9 ? K.red : K.ink2, stroke: K.ink, lw: 2, a: k * (1 - doorK) });
    txt(pad2(i + 1), x + 70, y + 100, { font: font(F.cond, 62), fill: K.cream, align: 'center', a: k * (1 - doorK) });
  }
  if (doorK > .01) {
    rrect(960, 440, 880, 420, 0, { fill: K.cream, a: doorK });
    const k = easeOut(seg(t, Hh.passover, Hh.passover + .55));
    rrect(1260, 480 + (1 - k) * 120, 60, 360 * k, 0, { fill: K.ink2 });
    rrect(1580, 480 + (1 - k) * 120, 60, 360 * k, 0, { fill: K.ink2 });
    rrect(1260, 480, 380, 60, 0, { fill: K.ink2, a: k });
    for (const x of [1280, 1550]) for (const y of [500, 700]) rrect(x, y, 22, 44, 0, { fill: K.red, a: k });
    txt('PASSOVER · EX 12', 1400, 900, { font: font(F.mono, 24, 700), fill: K.red, align: 'center', ls: 4, a: k });
  }
  hitsChips(['EX 7–12', 'SCHEMATIC'], Hh.doorChips, 146, 880, t, { bg: () => K.ink, fg: () => K.cream });
  hud(t, { dark: false, tl: '02 / THE PLAGUES', tr: tc(t), bl: sec(2, 'EGYPT'), br: 'EX 7–12', brackets: false, zh: 'DIECI PIAGHE · SCHEMATIC' });
}

function sSea(t) {
  bg(K.ink);
  const gl = liquid(t, { zoom: 1.5, seed: 5 });
  const gap = 900 * easeOut(seg(t, Hh.split, Hh.split + 1.6));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2 - gap / 2, H); ctx.clip(); ctx.drawImage(gl, -gap / 2, 0, W, H); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(W / 2 + gap / 2, 0, W, H); ctx.clip(); ctx.drawImage(gl, gap / 2, 0, W, H); ctx.restore();
  rrect(W / 2 - gap / 2, 0, gap, H, 0, { fill: K.cream, a: seg(t, Hh.split + .2, Hh.split + .9) });
  if (gap > 20) { waveLine(W / 2 - gap / 2, 0, H, 18, t, K.blue, 6); waveLine(W / 2 + gap / 2, 0, H, 18, t, K.blue, 6, 1.7); }
  softScrim(620, 350, 780, 470, .58);
  dropWord('THE SEA', 140, 320, font(F.cond, 180), S.sea + .05, t, { fill: K.cream, fall: 170 });
  dropWord('WAS SPLIT.', 140, 530, font(F.cond, 180), S.sea + .25, t, { fill: K.cream, fall: 170, fillAt: i => i === 9 ? K.lime : K.cream });
  hitsChips(['EX 14:21', 'A STRONG EAST WIND', 'DRY GROUND'], Hh.seaChips, 146, 880, t, { bg: () => K.ink, fg: () => K.cream });
  hud(t, { tl: '02 / THE SEA', tr: tc(t), bl: sec(2, 'PARTING'), br: 'EX 14:21–22', zh: 'IL MARE SI APRE' });
}

function sCross(t) {
  bg(K.ink);
  dropWord('ON DRY', 140, 320, font(F.cond, 190), S.cross + .05, t, { fill: K.cream, fall: 170 });
  dropWord('GROUND.', 140, 540, font(F.cond, 190), S.cross + .25, t, { fill: K.cream, fall: 170, fillAt: i => i === 6 ? K.lime : K.cream });
  rrect(0, 630, W, 200, 0, { fill: K.ink2 });
  line([[0, 630], [W, 630]], 'rgba(241,238,230,.35)', 2);
  Hh.dots.forEach((hit, i) => {
    const k = seg(t, hit, hit + 3.2); if (k <= 0) return;
    const x = lerp(160, 1760, easeOut(k)), y = 720 + Math.sin(i * 1.9 + t * 4) * 18;
    circle(x, y, 14, { fill: i % 3 ? K.cream : K.lime, a: clamp((1 - k) * 6) });
  });
  const wk = seg(t, Hh.walls, Hh.walls + .6);
  if (wk > 0) for (const x0 of [0, W - 220]) {
    rrect(x0, H - 420 * wk, 220, 420 * wk, 0, { fill: K.blue, a: .9 });
    waveLine(x0 + 110, H - 420 * wk, H, 26, t, K.cream, 3, x0);
  }
  txt('SCHEMATIC — A CROWD ON A PATH', 146, 900, { font: font(F.mono, 20, 700), fill: K.grey, ls: 2.5 });
  hud(t, { tl: '02 / CROSSING', tr: tc(t), bl: sec(2, 'CROSSING'), br: 'WATER LEFT + RIGHT · EX 14:22', zh: 'ATTRAVERSARONO ALL’ASCIUTTO' });
}

function sPillar(t) {
  bg(K.cream);
  dropWord('A PILLAR.', 140, 330, font(F.cond, 200), S.pillar + .05, t, { fill: K.ink, fall: 170, fillAt: i => i === 8 ? K.red : K.ink });
  const k1 = seg(t, Hh.cols[0], Hh.cols[0] + .5), k2 = seg(t, Hh.cols[1], Hh.cols[1] + .5);
  rrect(360, 430, 260, 460 * k1, 90, { fill: K.grey, a: .85 });
  circle(490, 330, 90 * k1, { fill: '#E8AA38' });
  rrect(1220, 430, 260, 460 * k2, 90, { fill: '#E8AA38', a: .9 });
  circle(1350, 330, 82 * k2, { fill: K.cream, stroke: K.ink, lw: 3 });
  txt('BY DAY', 490, 920, { font: font(F.mono, 22, 700), fill: K.ink, align: 'center', ls: 5, a: k1 });
  txt('BY NIGHT', 1350, 920, { font: font(F.mono, 22, 700), fill: K.ink, align: 'center', ls: 5, a: k2 });
  hitsChips(['EX 13:21', 'CLOUD / FIRE'], Hh.pillarChips, 146, 880, t, { bg: () => K.ink, fg: () => K.cream });
  hud(t, { dark: false, tl: '02 / GUIDANCE', tr: tc(t), bl: sec(2, 'PILLAR'), br: 'EX 13:21–22', brackets: false, zh: 'COLONNA DI NUBE E DI FUOCO' });
}

function sSinai(t) {
  bg('#0B0D0C');
  glShot(terrain(t, { fade: .85, amp: 1.2, push: 2 + easeOut(seg(t, Hh.mount, Hh.mount + 2)) * 5 }));
  ctx.save(); ctx.fillStyle = K.ink2; ctx.beginPath(); ctx.moveTo(960, 300);
  ctx.lineTo(560, 1000); ctx.lineTo(1360, 1000); ctx.closePath(); ctx.fill(); ctx.restore();
  line([[960, 300], [560, 1000]], 'rgba(241,238,230,.45)', 3);
  line([[960, 300], [1360, 1000]], 'rgba(241,238,230,.45)', 3);
  Hh.thunder.forEach((hit, i) => {
    const a = 1 - seg(t, hit, hit + .55); if (a <= 0) return;
    const x = 1450 + i * 90;
    line([[x, 120], [x - 60, 320], [x + 20, 360], [x - 50, 560]], K.lime, 6, a);
  });
  dropWord('SINAI.', 140, 430, font(F.cond, 300), S.sinai + .05, t, { fill: K.cream, fall: 200, fillAt: i => i === 5 ? K.red : K.cream });
  hitsChips(['EX 19:16', 'THUNDER · LIGHTNING · CLOUD'], Hh.sinaiChips, 146, 880, t, { bg: () => K.cream, fg: () => K.ink });
  hud(t, { tl: '03 / SINAI', tr: tc(t), bl: sec(3, 'MOUNTAIN'), br: 'EX 19', zh: 'IL MONTE AVVOLTO NEL FUMO' });
}

function sTablets(t) {
  bg(K.cream);
  dropWord('TEN WORDS.', 140, 330, font(F.cond, 190), S.tablets + .05, t, { fill: K.ink, fall: 170, fillAt: i => i === 9 ? K.red : K.ink });
  txt('SCHEMATIC — STONE, NOT A TRANSCRIPTION', 146, 400, { font: font(F.mono, 19, 700), fill: K.mid, ls: 2.5 });
  [1040, 1400].forEach((x, side) => {
    tablet(x, 450, 300, 460, seg(t, S.tablets + .2, S.tablets + .7), { fill: K.ink2, stroke: K.ink });
    for (let i = 0; i < 5; i++) {
      const k = seg(t, Hh.marks[side * 5 + i], Hh.marks[side * 5 + i] + .2);
      if (k > 0) redacted(x + 34, 520 + i * 72, 232, 22, side * 5 + i, K.cream, k);
    }
  });
  hitsChips(['EX 20', 'EX 34:28'], Hh.tabletChips, 146, 880, t, { bg: () => K.ink, fg: () => K.cream });
  hud(t, { dark: false, tl: '03 / TABLETS', tr: tc(t), bl: sec(3, 'WORDS'), br: 'EX 31:18', brackets: false, zh: 'DUE TAVOLE DI PIETRA' });
}

function sCalf(t) {
  bg(K.ink);
  dropWord('BROKEN.', 140, 330, font(F.cond, 190), S.calf + .05, t, { fill: K.cream, fall: 170, fillAt: i => i === 6 ? K.red : K.cream });
  dropWord('CUT AGAIN.', 140, 550, font(F.cond, 160), S.calf + .25, t, { fill: K.lime, fall: 160 });
  const crack = seg(t, Hh.crack[0], Hh.crack[1] + .2);
  tablet(1080, 450, 260, 420, seg(t, Hh.flag, Hh.flag + .4), { fill: K.ink2, stroke: K.cream });
  if (crack > 0) line([[1090, 500], [1170, 600], [1120, 680], [1230, 770], [1200, 850]], K.red, 7 * crack, crack);
  chip('RED FLAG · EX 32', 1540, 470, { k: seg(t, Hh.flag, Hh.flag + .3), bg: K.red, fg: K.cream });
  [1420, 1620].forEach((x, i) => tablet(x, 620, 170, 260, seg(t, Hh.newTablets[i], Hh.newTablets[i] + .4), { fill: K.ink2, stroke: K.lime }));
  txt('SCHEMATIC — EX 32 / EX 34:1', 146, 850, { font: font(F.mono, 20, 700), fill: K.grey, ls: 2.5 });
  hitsChips(['EX 32', 'EX 34:1'], Hh.calfChips, 146, 900, t, { bg: () => K.cream, fg: () => K.ink });
  hud(t, { tl: '03 / BROKEN', tr: tc(t), bl: sec(3, 'RETURN'), br: 'EX 32–34', zh: 'LE TAVOLE SPEZZATE E RISCRITTE' });
}

function sWilderness(t) {
  bg(K.lime);
  dropWord('FORTY YEARS.', 140, 330, font(F.cond, 200), S.wilderness + .05, t, { fill: K.ink, fall: 180, fillAt: i => i === 11 ? K.red : K.ink });
  // 40 ticks: the whole wandering as one trace, with a playhead that is literally t
  const x0 = 140, x1 = 1780, y = 620;
  line([[x0, y], [x1, y]], K.ink, 2, .4);
  for (let i = 0; i < 40; i++) line([[x0 + (x1 - x0) * i / 40, y - 18], [x0 + (x1 - x0) * i / 40, y + 18]], K.ink, 2, .65);
  const px = x0 + (x1 - x0) * seg(t, S.wilderness, S.end);
  circle(px, y, 16 + 7 * beatPulse(t), { fill: K.blue });
  // manna falling, then water from the rock
  Hh.manna.forEach((hit, i) => {
    const a = 1 - seg(t, hit, hit + 1.6); if (a <= 0) return;
    const x = 1120 + hash(i + 61) * 620, yy = 420 + (1 - a) * 150;
    circle(x, yy, 9 + 4 * hash(i + 90), { fill: K.cream, a });
  });
  const rk = seg(t, Hh.rock, Hh.rock + .4);
  if (rk > 0) {
    rrect(1500, 730, 200, 150 * rk, 40, { fill: K.ink2 });
    const wk = seg(t, Hh.water, Hh.water + .8);
    if (wk > 0) { const pts = [[1500, 800], [1380, 810], [1250, 795], [1120, 820]]; line(pts.slice(0, Math.max(2, Math.round(1 + wk * 3))), K.blue, 16); }
  }
  const k = seg(t, Hh.counter, Hh.counter + 1.1), f = font(F.cond, 150);
  const xEnd = odometer('00', '40', k, 140, 850, f, K.ink);
  txt('YRS', xEnd + 12, 850, { font: f, fill: K.ink });
  txt('NUM 14:33–34 · YEARS IN THE WILDERNESS', 144, 892, { font: font(F.mono, 19, 700), fill: K.ink, ls: 2.5 });
  hitsChips(['MANNA · EX 16', 'WATER · EX 17:6'], Hh.wildChips, 1050, 880, t, { bg: () => K.ink, fg: () => K.cream });
  hud(t, { dark: false, tl: '04 / WILDERNESS', tr: tc(t), bl: sec(4, 'WANDERING'), br: 'NUM 14:33–34', brackets: false, zh: 'QUARANT’ANNI NEL DESERTO' });
}

function sEnd(t) {
  bg('#121412'); const lt = t - S.end;
  dropWord('MOSES.', 130, 520, font(F.cond, 300), Hh.name, t, { stag: .04, dur: .4, fillAt: i => i === 5 ? K.lime : K.cream });
  txt('EXODUS → NUMBERS → DEUTERONOMY', 140, 620, { font: font(F.mono, 26, 700), fill: K.grey, ls: 5, a: seg(lt, .5, 1) });
  const mk = seg(t, Hh.endMark, Hh.endMark + 1.3);
  starburst(1610, 400, 145 * backOut(mk), 14, K.lime, t * .3, .7);
  circle(1610, 400, (205 + 12 * beatPulse(t)) * backOut(mk), { stroke: 'rgba(221,245,61,.35)', lw: 2 });
  hud(t, { tl: 'A KINETIC READING OF EXODUS', tr: tc(t), bl: 'EX 1–40 · NUM · DEUT', br: 'FRAME = f(t) · NO GENERATIVE MODELS', brackets: false, k: seg(lt, .5, 1) });
  if (t > Hh.glitch) { const g = seg(t, Hh.glitch, Hh.endDot); FX.slice = g; FX.split = .02 * g; FX.seed = Math.floor(t * FPS); }
  if (t > Hh.endDot) { const k = seg(t, Hh.endDot, Hh.endDot + .25); bg(K.ink); circle(W / 2, H / 2, lerp(60, 4, easeIn(k)) * (1 - seg(t, C.dur - .25, C.dur)), { fill: K.cream }); FX.slice = 0; FX.split = 0; }
}

// Transitions INTO a shot. Chapter bars 20 and 36 are deliberate hard cuts with an impact.
const TR = {
  title: [.5, trIris(W / 2, H / 2 + 30, K.ink)],
  river: [.55, trZoom(() => RECT.titleMark || [1320, 250, 360, 360])],
  bush: [.5, trSlats(12)],
  voice: [.6, trIris(1420, 470, K.lime)],
  staff: [.5, trPush(1, 0)],
  demand: [.5, trWipe(K.blue)],
  // plagues: no entry — a hard cut on the chapter bar
  sea: [.55, trWipe(K.cream)],
  cross: [.5, trSlats(12)],
  pillar: [.5, trPush(1, 0)],
  sinai: [.5, trIris(W / 2, 540, K.ink)],
  tablets: [.5, trPush(-1, 0)],
  calf: [.5, trGrid(12, 7, K.red)],
  wilderness: [.5, trSlats(12)],
  end: [.5, trPush(0, -1)],
};
const SCENES = [
  [S.open, sOpen, 'open'], [S.title, sTitle, 'title'], [S.river, sRiver, 'river'],
  [S.bush, sBush, 'bush'], [S.voice, sVoice, 'voice'], [S.staff, sStaff, 'staff'],
  [S.demand, sDemand, 'demand'], [S.plagues, sPlagues, 'plagues'], [S.sea, sSea, 'sea'],
  [S.cross, sCross, 'cross'], [S.pillar, sPillar, 'pillar'], [S.sinai, sSinai, 'sinai'],
  [S.tablets, sTablets, 'tablets'], [S.calf, sCalf, 'calf'], [S.wilderness, sWilderness, 'wilderness'],
  [S.end, sEnd, 'end'],
];

function renderInto(i, t, buf) {
  ctx = buf.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.clearRect(0, 0, W, H);
  SCENES[i][1](t); ctx = mainCtx;
}
function frame(t) {
  FX = { split: 0, slice: 0, seed: 0, grain: .05, vign: .28, flash: 0, flashCol: '#ffffff' };
  let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1][0]) i++;
  const [s0, fn, key] = SCENES[i], tr = TR[key];
  ctx = mainCtx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (tr && i > 0 && t < s0 + tr[0]) {
    TRANS = true;
    const keep = FX; FX = { ...keep }; renderInto(i - 1, s0 - 1 / FPS, bufA); FX = keep;   // the outgoing scene's own effects are dropped
    renderInto(i, t, bufB);
    TRANS = false;
    tr[1](seg(t, s0, s0 + tr[0]), bufA, bufB, mainCtx);
  } else {
    fn(t);
    if (!tr && s0 > 0 && t < s0 + 1 / FPS) FX.flash = Math.max(FX.flash, .08);   // a one-frame flash on hard cuts
  }
  post(t, FX);
}

// ---------- render contract ----------
// No CJK glyphs are drawn: the four display families are local (assets/fonts/fonts.css)
// and the "zh" HUD slot carries short Italian micro-annotations in the mono family.
const fontsReady = Promise.all([
  document.fonts.load('100px "Anton"'), document.fonts.load('100px "Archivo Black"'),
  document.fonts.load('italic 100px "Instrument Serif"'),
  document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"'),
  document.fonts.load('400 20px "JetBrains Mono"'),
]);
window.renderAt = async (t, type = 'image/png', q = .92) => { frame(t); return out.toDataURL(type, q); };
window.renderSheet = async (times, cols = 3, w = 640, crop = null) => {
  const [, , cw, ch] = crop || [0, 0, W, H], h = Math.round(w * ch / cw), rows = Math.ceil(times.length / cols), sc = document.createElement('canvas');
  sc.width = cols * w; sc.height = rows * h; const c = sc.getContext('2d'), ms = [];
  for (let i = 0; i < times.length; i++) {
    const t0 = performance.now(); frame(times[i]); ms.push(Math.round(performance.now() - t0));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h, [cx, cy] = crop || [0, 0];
    c.drawImage(out, cx, cy, cw, ch, x, y, w, h); c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(x, y, 84, 24); c.fillStyle = '#fff'; c.font = '15px sans-serif'; c.fillText(times[i].toFixed(2) + 's', x + 6, y + 17);
  }
  return { url: sc.toDataURL('image/jpeg', .9), ms };
};
window.gpuInfo = () => { const gl = RA.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); };
fontsReady.then(() => {
  window.ready = true;
  if (!location.search.includes('render')) {
    const s = document.getElementById('scrub'), lab = document.getElementById('tt');
    const go = () => { const t0 = performance.now(); frame(+s.value); lab.textContent = `${(+s.value).toFixed(2)}s · ${Math.round(performance.now() - t0)} ms`; };
    s.addEventListener('input', go); s.value = new URLSearchParams(location.search).get('t') || 0; go();
  }
});
