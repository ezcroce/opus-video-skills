// ark.js — the ark, the sea, the storm, the rainbow and the renewed earth.
import * as THREE from 'three';
import {
  mat, basicMat, outlined, addOutline, canvasTexture, woodTexture, makeGlow, glowTexture,
  makeCloud, makePalm, makeRock, makeBush, makeGrassTuft, makeSky, hash, hash2, TAU, lerp, clamp, smoothstep,
} from './engine.js';
import { createTree, createGround, createHill } from './world.js';

export function createArk({ construction = false } = {}) {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#c08a50', '#8a5a34', 10), roughness: 0.92 });
  const woodDark = new THREE.MeshStandardMaterial({ map: woodTexture('#9a6a3e', '#6b4423', 8), roughness: 0.95 });
  const woodLight = new THREE.MeshStandardMaterial({ map: woodTexture('#e0b078', '#a8743f', 8), roughness: 0.9 });
  const ropeM = mat(0xc9b080, { roughness: 1 });

  const shape = new THREE.Shape();
  shape.moveTo(-15, 6.4);
  shape.bezierCurveTo(-15.2, 4.2, -13.5, 2.2, -10.5, 1.0);
  shape.bezierCurveTo(-6, 0.0, 6, 0.0, 10.5, 1.0);
  shape.bezierCurveTo(13.5, 2.2, 15.2, 4.2, 15, 6.4);
  shape.lineTo(15, 7.2); shape.lineTo(-15, 7.2); shape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 9.6, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.35, bevelSegments: 2, steps: 1 });
  hullGeo.translate(0, 0, -4.8);
  const hull = new THREE.Mesh(hullGeo, wood);
  hull.castShadow = true; hull.receiveShadow = true; root.add(hull);
  addOutline(hull, 0.035, 0x3a2412);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.35, 9.2), woodLight);
  deck.position.y = 7.1; deck.castShadow = true; deck.receiveShadow = true; root.add(deck);
  for (let i = 0; i < 12; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(29.0, 0.04, 0.68), i % 2 ? wood : woodDark);
    plank.position.set(0, 7.30, -4.2 + i * 0.76); plank.receiveShadow = true; root.add(plank);
  }
  for (let i = -6; i <= 6; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.2, 9.9), woodDark);
    rib.position.set(i * 2.2, 3.4, 0); rib.castShadow = true; root.add(rib);
  }
  for (const side of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(30.4, 0.35, 0.35), woodDark);
    trim.position.set(0, 6.9, side * 4.85); root.add(trim);
  }

  const cabin = new THREE.Group(); cabin.position.set(-2.0, 7.3, 0); root.add(cabin);
  const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3.6, 7.2), wood);
  cabinBody.position.y = 1.8; cabinBody.castShadow = true; cabinBody.receiveShadow = true; cabin.add(cabinBody);
  addOutline(cabinBody, 0.03, 0x3a2412);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 10.8, 16, 1, false, 0, Math.PI), woodDark);
  roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.y = 3.6; roof.scale.set(1, 1, 0.62); roof.castShadow = true; cabin.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.18), mat(0x4a2c16, { roughness: 1 }));
  door.position.set(1.8, 1.4, 3.62); cabin.add(door);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  doorGlow.position.set(1.8, 1.4, 3.73); cabin.add(doorGlow);
  for (const x of [-3.2, -0.8]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.16), mat(0x3a2412, { roughness: 1 }));
    win.position.set(x, 2.2, 3.62); cabin.add(win);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshBasicMaterial({ color: 0xffb85a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(x, 2.2, 3.71); cabin.add(glow);
  }
  const lantern = new THREE.Group(); lantern.position.set(3.4, 2.4, 3.8); cabin.add(lantern);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  lantern.add(lamp);
  const lampGlow = makeGlow(0xffc46a, 3.0, 0.8); lantern.add(lampGlow);

  const railGroup = new THREE.Group(); root.add(railGroup);
  for (const side of [-1, 1]) {
    for (let i = -6; i <= 6; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 6), woodDark);
      post.position.set(i * 2.3, 7.8, side * 4.45); railGroup.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(28.5, 0.12, 0.12), woodDark);
    rail.position.set(0, 8.25, side * 4.45); railGroup.add(rail);
  }
  const ramp = new THREE.Group(); ramp.position.set(10.5, 0, 5.4); ramp.rotation.y = -0.35; root.add(ramp);
  const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 9.0), woodLight);
  rampMesh.position.set(0, 3.6, 0); rampMesh.rotation.x = -0.62; rampMesh.castShadow = true; ramp.add(rampMesh);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 9.0), woodDark);
    rail.position.set(side * 1.05, 4.3, 0); rail.rotation.x = -0.62; ramp.add(rail);
  }
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), woodDark);
  flagPole.position.set(-6.5, 9.2, 0); root.add(flagPole);
  const flagGeo = new THREE.PlaneGeometry(2.2, 1.2, 8, 4);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.9, side: THREE.DoubleSide }));
  flag.position.set(-5.4, 10.2, 0); root.add(flag);
  const flagBase = flagGeo.attributes.position.array.slice();

  const constructionGroup = new THREE.Group(); root.add(constructionGroup);
  if (construction) {
    for (const side of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 9.5, 6), woodDark);
        pole.position.set(i * 3.6, 4.75, side * 5.6); pole.castShadow = true; constructionGroup.add(pole);
      }
      for (let level = 0; level < 3; level++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.16, 0.16), woodDark);
        beam.position.set(0, 2.2 + level * 2.8, side * 5.6); constructionGroup.add(beam);
      }
    }
    for (let i = 0; i < 9; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.5, 7), wood);
      log.rotation.z = Math.PI / 2; log.rotation.y = hash(i) * 0.5;
      log.position.set(-13 + hash(i) * 5, 0.4 + (i % 3) * 0.7, 6.5 + hash(i + 1) * 2.5); log.castShadow = true; constructionGroup.add(log);
    }
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, 0.8), woodLight);
      plank.position.set(8 + hash(i) * 4, 0.2 + i * 0.18, 6 + hash(i + 2) * 2); plank.rotation.y = hash(i) * 0.4; constructionGroup.add(plank);
    }
    const crane = new THREE.Group(); crane.position.set(12, 0, -5); constructionGroup.add(crane);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 13, 7), woodDark); mast.position.y = 6.5; mast.castShadow = true; crane.add(mast);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(9, 0.22, 0.22), woodDark); jib.position.set(3.8, 12.2, 0); jib.rotation.z = 0.12; crane.add(jib);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.5, 4), ropeM); rope.position.set(7.6, 9.4, 0); crane.add(rope);
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), wood); block.position.set(7.6, 6.6, 0); block.castShadow = true; crane.add(block);
    for (let i = -2; i <= 2; i++) {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.0, 6), woodDark);
      support.position.set(i * 5.5, 1.0, 0); constructionGroup.add(support);
    }
    railGroup.visible = false;
    cabin.children.forEach(c => { if (c !== cabinBody) c.visible = false; });
    roof.visible = false;
  } else {
    constructionGroup.visible = false;
  }

  const interior = new THREE.Group(); interior.position.set(1.8, 8.7, 2.9); root.add(interior);
  const silM = basicMat(0x3a2412, { transparent: true, opacity: 0.85 });
  const sil1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), silM); sil1.scale.set(1.2, 0.9, 0.6); sil1.position.set(-0.6, 0.5, 0); interior.add(sil1);
  const sil2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.4, 7), silM); sil2.position.set(0.6, 0.7, 0); interior.add(sil2);
  const sil3 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), silM); sil3.position.set(0.6, 1.5, 0); interior.add(sil3);
  interior.visible = !construction;

  root.userData = {
    flag, flagBase, lantern, lampGlow, interior, constructionGroup,
    update(t, bob = 0) {
      const pos = flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = flagBase[i * 3], y = flagBase[i * 3 + 1];
        pos.setZ(i, Math.sin(x * 2.2 + t * 4) * 0.12 * (x + 1.1) / 2.2);
        pos.setY(i, y + Math.sin(x * 1.7 + t * 3) * 0.04);
      }
      pos.needsUpdate = true;
      flag.geometry.computeVertexNormals();
      lampGlow.material.opacity = 0.65 + Math.sin(t * 3.1) * 0.12;
      if (bob) {
        root.position.y = bob;
        root.rotation.z = Math.sin(t * 0.55) * 0.012;
        root.rotation.x = Math.sin(t * 0.42 + 1) * 0.008;
      }
    },
  };
  return root;
}

export function createSea({ size = 700, storm = 0, deep = 0x0b3a5a, shallow = 0x2a8fa8, horizon = 0x9fd0ea, sunDir = [0.4, 0.5, -0.7], sunColor = 0xfff1c4 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, 180, 180);
  const uniforms = {
    time: { value: 0 }, storm: { value: storm },
    deep: { value: new THREE.Color(deep) }, shallow: { value: new THREE.Color(shallow) },
    horizon: { value: new THREE.Color(horizon) }, sunColor: { value: new THREE.Color(sunColor) },
    sunDir: { value: new THREE.Vector3(...sunDir).normalize() },
  };
  const m = new THREE.ShaderMaterial({
    uniforms, fog: false,
    vertexShader: `
      uniform float time; uniform float storm;
      varying vec3 vWorld; varying vec3 vNormal; varying float vHeight;
      float wave(vec2 p, float t){
        float h = 0.0;
        h += sin(p.x * 0.11 + t * 0.9) * 0.55;
        h += sin(p.y * 0.14 - t * 0.7) * 0.42;
        h += sin((p.x + p.y) * 0.07 + t * 1.3) * 0.65;
        h += sin((p.x - p.y) * 0.19 - t * 1.7) * 0.22;
        return h * (0.55 + storm * 1.5);
      }
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float h = wave(wp.xz, time);
        wp.y += h;
        float e = 0.6;
        float hx = wave(wp.xz + vec2(e, 0.0), time) - wave(wp.xz - vec2(e, 0.0), time);
        float hz = wave(wp.xz + vec2(0.0, e), time) - wave(wp.xz - vec2(0.0, e), time);
        vNormal = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
        vWorld = wp.xyz; vHeight = h;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 deep, shallow, horizon, sunColor, sunDir; uniform float storm, time;
      varying vec3 vWorld; varying vec3 vNormal; varying float vHeight;
      void main(){
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);
        float diff = max(dot(n, normalize(sunDir)), 0.0);
        float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
        vec3 col = mix(deep, shallow, smoothstep(-1.2, 1.8, vHeight));
        col = mix(col, horizon, fres * 0.65);
        col += sunColor * diff * 0.22;
        float spec = pow(max(dot(reflect(-normalize(sunDir), n), view), 0.0), 90.0);
        col += sunColor * spec * 1.6;
        float foam = smoothstep(0.65, 1.35, vHeight) * (0.35 + storm * 0.65);
        foam += smoothstep(0.9, 1.0, sin(vWorld.x * 0.7 + time * 2.0) * 0.5 + 0.5) * storm * 0.15;
        col = mix(col, vec3(0.92, 0.96, 1.0), clamp(foam, 0.0, 0.8));
        float d = length(cameraPosition - vWorld);
        col = mix(col, horizon, smoothstep(140.0, 380.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0; mesh.receiveShadow = false;
  mesh.userData.update = (t, s = storm) => { uniforms.time.value = t; uniforms.storm.value = s; };
  return mesh;
}

export function createRain({ count = 2200, area = 70, height = 34 } = {}) {
  const geo = new THREE.BufferGeometry();
  const base = new Float32Array(count * 3), tip = new Float32Array(count), speed = new Float32Array(count);
  const pos = new Float32Array(count * 2 * 3);
  for (let i = 0; i < count; i++) {
    const x = (hash(i * 3.1) - 0.5) * area, y = hash(i * 7.7) * height, z = (hash(i * 5.3) - 0.5) * area;
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
    tip[i * 2] = 0; tip[i * 2 + 1] = 1;
    speed[i] = 18 + hash(i * 2.3) * 16;
    pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x; pos[i * 6 + 4] = y - 0.8; pos[i * 6 + 5] = z;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const uniforms = { time: { value: 0 }, area: { value: height }, opacity: { value: 0.42 } };
  const m = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aBase; attribute float aTip; attribute float aSpeed;
      uniform float time, area; varying float vA;
      void main(){
        float y = mod(aBase.y - time * aSpeed, area);
        vec3 p = vec3(aBase.x + y * 0.10, y, aBase.z);
        p.y -= aTip * (0.55 + aSpeed * 0.02);
        vA = 0.35 + aTip * 0.65;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float opacity; varying float vA; void main(){ gl_FragColor = vec4(0.72, 0.84, 1.0, opacity * vA); }`,
  });
  const lines = new THREE.LineSegments(geo, m);
  lines.frustumCulled = false;
  lines.userData.update = (t) => { uniforms.time.value = t; };
  return lines;
}

export function createLightning() {
  const group = new THREE.Group();
  const pts = [];
  let x = 0, y = 40;
  for (let i = 0; i < 14; i++) {
    pts.push(new THREE.Vector3(x, y, 0));
    x += (hash(i * 3.1) - 0.5) * 7; y -= 2.8 + hash(i) * 1.5;
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const bolt = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.18, 5, false), new THREE.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0 }));
  group.add(bolt);
  const glow = makeGlow(0xcfe4ff, 26, 0); glow.position.set(0, 22, 0); group.add(glow);
  const light = new THREE.PointLight(0xcfe4ff, 0, 90, 2); light.position.set(0, 25, 0); group.add(light);
  group.userData.flash = (t, seed = 0) => {
    const p = (t + seed * 3.7) % 9.5;
    let f = 0;
    if (p < 0.09) f = 1; else if (p < 0.16) f = 0.35; else if (p < 0.22) f = 0.8; else if (p < 0.3) f = 0.1;
    bolt.material.opacity = f * 0.95; glow.material.opacity = f * 0.8; light.intensity = f * 8;
    group.visible = f > 0.02;
    return f;
  };
  return group;
}

export function createStormClouds() {
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = makeCloud({ scale: 5 + hash(i) * 5, color: i % 3 ? 0x5a6472 : 0x7a8492, count: 7, seed: i + 3, flat: true, emissive: 0x1a2028 });
    c.position.set((hash(i * 3.1) - 0.5) * 180, 38 + hash(i * 7.7) * 22, -40 - hash(i * 5.3) * 120);
    group.add(c); clouds.push({ c, seed: i, speed: 0.6 + hash(i) * 0.8 });
  }
  group.userData.update = (t) => {
    for (const { c, seed, speed } of clouds) {
      c.position.x += Math.sin(t * 0.02 + seed) * 0.002;
      c.position.x = ((c.position.x + 90 + t * speed * 0.6) % 180) - 90;
    }
  };
  return group;
}

export function createRainbowBackdrop({ w = 240, h = 130, opacity = 0.5 } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 160, 10, 256, 160, 300);
  gr.addColorStop(0, `rgba(18,38,70,${opacity})`);
  gr.addColorStop(0.55, `rgba(18,38,70,${opacity * 0.55})`);
  gr.addColorStop(1, 'rgba(18,38,70,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  mesh.renderOrder = -1;
  return mesh;
}

export function createRainbow({ radius = 60, width = 9, opacity = 1 } = {}) {
  const geo = new THREE.RingGeometry(radius - width, radius, 160, 1);
  const uniforms = { opacity: { value: 0 }, time: { value: 0 }, inner: { value: radius - width }, outer: { value: radius } };
  const m = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending,
    vertexShader: `varying vec3 vLocal; void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float opacity, time, inner, outer; varying vec3 vLocal;
      vec3 spectrum(float t){
        vec3 c1 = vec3(0.92,0.10,0.08); vec3 c2 = vec3(1.0,0.42,0.05); vec3 c3 = vec3(1.0,0.86,0.10);
        vec3 c4 = vec3(0.20,0.78,0.22); vec3 c5 = vec3(0.10,0.45,0.92); vec3 c6 = vec3(0.25,0.25,0.88); vec3 c7 = vec3(0.55,0.18,0.82);
        if(t<0.1667) return mix(c1,c2,t/0.1667);
        if(t<0.3333) return mix(c2,c3,(t-0.1667)/0.1666);
        if(t<0.5) return mix(c3,c4,(t-0.3333)/0.1667);
        if(t<0.6667) return mix(c4,c5,(t-0.5)/0.1667);
        if(t<0.8333) return mix(c5,c6,(t-0.6667)/0.1666);
        return mix(c6,c7,(t-0.8333)/0.1667);
      }
      void main(){
        float r = length(vLocal.xy);
        float t = clamp((r - inner) / (outer - inner), 0.0, 1.0);
        vec3 col = spectrum(t);
        float edge = smoothstep(0.0, 0.10, t) * smoothstep(1.0, 0.90, t);
        float shimmer = 0.85 + 0.15 * sin(t * 40.0 + time * 1.5);
        gl_FragColor = vec4(col, edge * opacity * shimmer * 0.95);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.userData.update = (t, target = 1) => {
    uniforms.time.value = t;
    uniforms.opacity.value += (target - uniforms.opacity.value) * 0.04;
  };
  return mesh;
}

export function createNature() {
  const root = new THREE.Group();
  const ground = createGround({ size: 400, color: 0x7fb35a, repeat: 14 }); root.add(ground);
  const hillCols = [0x6fa84a, 0x7fb85a, 0x5f9a42, 0x8fc46a];
  for (let i = 0; i < 9; i++) {
    const h = createHill({ x: (hash(i * 3.1) - 0.5) * 150, z: -30 - hash(i * 7.7) * 100, r: 22 + hash(i) * 26, h: 8 + hash(i + 1) * 12, color: hillCols[i % 4], seed: i });
    root.add(h);
  }
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(18 + hash(i) * 14, 24 + hash(i + 1) * 20, 6), mat(0x7a8f6a, { flat: true, roughness: 1 }));
    m.position.set(-120 + i * 40, 10, -150 - hash(i) * 40); root.add(m);
  }
  for (let i = 0; i < 26; i++) {
    const t = createTree({ scale: 0.8 + hash(i) * 0.8, type: i % 3 ? 'olive' : 'green', seed: i + 1 });
    t.position.set((hash(i * 3.3) - 0.5) * 110, 0, -8 - hash(i * 7.1) * 80);
    root.add(t);
  }
  for (let i = 0; i < 6; i++) {
    const p = makePalm({ height: 5 + hash(i) * 3, seed: i + 20, lean: 0.2 });
    p.position.set(-24 + i * 9, 0, 2 + hash(i) * 8); root.add(p);
  }
  for (let i = 0; i < 22; i++) {
    const b = makeBush({ scale: 0.5 + hash(i) * 0.7, seed: i + 2, color: i % 2 ? 0x4f9a3f : 0x6fae4a });
    b.position.set((hash(i * 3.7) - 0.5) * 90, 0, -2 - hash(i * 5.1) * 60); root.add(b);
  }
  for (let i = 0; i < 12; i++) {
    const r = makeRock({ scale: 0.5 + hash(i) * 1.0, seed: i + 4, color: 0xa8a090 });
    r.position.set((hash(i * 7.3) - 0.5) * 80, 0.2, -4 - hash(i * 3.9) * 50); root.add(r);
  }
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(7, 90, 1, 1), new THREE.MeshStandardMaterial({ color: 0x5fc4d8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
  stream.rotation.x = -Math.PI / 2; stream.rotation.z = 0.18; stream.position.set(16, 0.06, -22); root.add(stream);
  const grassGeo = new THREE.ConeGeometry(0.06, 0.55, 3);
  const grassMat = mat(0x5aa84a, { side: THREE.DoubleSide, roughness: 1 });
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, 900);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    dummy.position.set((hash(i * 3.1) - 0.5) * 120, 0.25, -2 - hash(i * 7.7) * 70);
    dummy.rotation.set(0, hash(i) * TAU, (hash(i + 1) - 0.5) * 0.3);
    dummy.scale.setScalar(0.7 + hash(i + 2) * 0.9);
    dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  grass.castShadow = false; grass.receiveShadow = true; root.add(grass);
  const flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
  const flowerMat = mat(0xffffff, { roughness: 0.7 });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 260);
  const cols = [0xffd45a, 0xff8a8a, 0xf2f2f2, 0xc48aff, 0xffb347];
  for (let i = 0; i < 260; i++) {
    dummy.position.set((hash(i * 5.1) - 0.5) * 100, 0.35 + hash(i) * 0.15, -2 - hash(i * 3.3) * 60);
    dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(0.8 + hash(i + 4) * 0.8);
    dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, new THREE.Color(cols[i % cols.length]));
  }
  flowers.castShadow = false; root.add(flowers);
  const butterflies = [];
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Group();
    const wm = new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const w1 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), wm); w1.position.x = -0.1; b.add(w1);
    const w2 = w1.clone(); w2.position.x = 0.1; b.add(w2);
    b.position.set((hash(i * 3.1) - 0.5) * 40, 1.2 + hash(i) * 2, -5 - hash(i * 7.7) * 30);
    root.add(b); butterflies.push({ b, seed: i, w1, w2 });
  }
  root.userData.update = (t) => {
    for (const { b, seed, w1, w2 } of butterflies) {
      b.position.x += Math.sin(t * 0.7 + seed) * 0.004;
      b.position.y += Math.cos(t * 1.1 + seed) * 0.003;
      b.rotation.y = Math.sin(t * 0.5 + seed) * 0.8;
      const flap = Math.sin(t * 14 + seed) * 0.9;
      w1.rotation.y = flap; w2.rotation.y = -flap;
    }
  };
  return root;
}

export function createOliveBranch() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 5), mat(0x6b4a2a));
  stem.rotation.z = Math.PI / 2; g.add(stem);
  const leafM = mat(0x6fae4a, { side: THREE.DoubleSide, roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), leafM);
    leaf.scale.set(1.6, 0.25, 0.7);
    leaf.position.set(-0.18 + i * 0.06, 0.03 + (i % 2) * 0.03, 0);
    leaf.rotation.z = (i % 2 ? 1 : -1) * 0.5; g.add(leaf);
  }
  return g;
}
