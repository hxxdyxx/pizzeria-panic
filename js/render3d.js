// Pizzeria Panic 3D renderer.
// Draws the game in Three.js from a per-frame snapshot of the 2D game state.
// Game logic, scoring, collisions and UI stay in play.html; this module only
// reads state. Every gameplay object sits on the plane z=0 at the exact screen
// position the 2D logic uses, so catches line up with what the player sees.
// If WebGL or the Chef model is unavailable, PPP3D.active stays false and the
// original 2D renderer keeps drawing.
import * as THREE from 'three';
import { GLTFLoader } from '/vendor/three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '/vendor/three/addons/utils/BufferGeometryUtils.js';

const api = window.PPP3D = { active: false, tier: 3, fps: 0, clips: [], props: [], render() {}, event() {} };
const qs = new URLSearchParams(location.search);

// Effect tiers, sharpest last to go: a slow device loses the wall deco, then rim light, then
// resolution, and keeps the black outlines throughout. Auto-downgrade steps down one tier when fps
// stays under 45 for 3s, but only drops below 1.5x for a device under 24 fps, so a 30 fps cap
// (iOS Low Power Mode) settles at tier 1 instead of going blurry. 8s at 55+ fps steps back up.
const TIERS = [
  { dpr: 1, outline: true, rim: 0, deco: false },
  { dpr: 1.5, outline: true, rim: 0, deco: false },
  { dpr: 2, outline: true, rim: 1, deco: false },
  { dpr: 2, outline: true, rim: 1, deco: true }
];
const TOP_TIER = TIERS.length - 1;
const C = {
  tomato: '#D64541', tomatoDark: '#A5322E', basil: '#2E8B57', olive: '#2C2C2C', beige: '#F8E5C2',
  mozz: '#FAF8F5', glow: '#F2C14E', crust: '#D9A15A', cheese: '#FAF0C8', wood: '#8a5a32'
};
// Clip mapping. States without a clip are procedural (see updateChef).
const CLIPS = { idle: 'Idle_11', run: 'Running', greet: 'Wave_One_Hand', impatient: 'Finger_Wag_No', gameover: 'Shrug' };

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

if (qs.get('r') !== '2d' && webglAvailable()) init();

function init() {
  const canvas = document.getElementById('game3d');
  const frame = document.getElementById('frame');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
  } catch (e) { console.warn('3D renderer unavailable, using 2D', e); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); api.active = false; canvas.style.display = 'none'; });

  let tier = qs.has('fx') ? Math.max(0, Math.min(TOP_TIER, parseInt(qs.get('fx'), 10) || 0)) : TOP_TIER;
  const forcedTier = qs.has('fx');

  // ---------- scene, camera, lights ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a1c15');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  camera.position.set(0, 1.1, 12);
  camera.lookAt(0, -0.15, 0);
  camera.updateMatrixWorld();

  const hemi = new THREE.HemisphereLight(0xfff1dc, 0x4a2c1c, 1.25);
  const key = new THREE.DirectionalLight(0xfff0d6, 2.1); key.position.set(-4, 6, 8);
  const rimLight = new THREE.DirectionalLight(0xffc27a, 1.8); rimLight.position.set(3.5, 3, -6);
  const ovenLight = new THREE.PointLight(0xff8a3c, 6, 9, 1.6); ovenLight.position.set(0, -1.6, -3.4);
  scene.add(hemi, key, rimLight, ovenLight);

  // ---------- toon materials with fresnel rim ----------
  const gradTex = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;
  const RIM = { color: { value: new THREE.Color('#ffd9a0') }, strength: { value: 0.45 } };
  const CHEF_RIM = { color: { value: new THREE.Color('#ffe2b0') }, strength: { value: 0.55 } };
  function toon(params, rim = RIM) {
    const m = new THREE.MeshToonMaterial(Object.assign({ gradientMap: gradTex }, params));
    m.onBeforeCompile = s => {
      s.uniforms.uRimColor = rim.color; s.uniforms.uRimStrength = rim.strength;
      s.fragmentShader = 'uniform vec3 uRimColor;\nuniform float uRimStrength;\n' + s.fragmentShader.replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\n{ float rf = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);\n  gl_FragColor.rgb += uRimColor * pow(rf, 3.0) * uRimStrength; }');
    };
    m.customProgramCacheKey = () => 'toonrim';
    return m;
  }
  function outlineMaterial(thickness) {
    const m = new THREE.MeshBasicMaterial({ color: 0x1d120c, side: THREE.BackSide });
    m.onBeforeCompile = s => {
      s.uniforms.uOutline = { value: thickness };
      s.vertexShader = 'uniform float uOutline;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uOutline;');
    };
    m.customProgramCacheKey = () => 'outline' + thickness;
    return m;
  }
  const propMat = toon({ vertexColors: true });
  const propMatFlat = toon({ vertexColors: true, flatShading: true });
  const propOutline = outlineMaterial(0.06);

  // ---------- geometry helpers (vertex colored, merged into one draw call) ----------
  function paint(geo, hex) {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  }
  function merge(parts) {
    const clean = parts.map(g => { const ng = g.index ? g : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) ng.deleteAttribute(k); return ng; });
    return mergeGeometries(clean, false);
  }
  const PEP = [[-0.35, -0.2], [0.3, -0.28], [0, 0.05], [-0.15, 0.35], [0.38, 0.22]];
  function pizzaGeo(burnt) {
    const parts = [
      paint(new THREE.CylinderGeometry(1, 1, 0.3, 12), burnt ? '#7a5230' : C.crust),
      paint(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 20).translate(0, 0.17, 0), burnt ? '#b39a68' : C.cheese)
    ];
    PEP.forEach(([x, z]) => parts.push(paint(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10).translate(x, 0.22, z), burnt ? '#4a1a12' : C.tomato)));
    if (burnt) [[-0.2, -0.45], [0.28, 0.1], [-0.1, 0.4]].forEach(([x, z]) => parts.push(paint(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10).translate(x, 0.215, z), '#2a1a0c')));
    return merge(parts);
  }
  function mushroomGeo(capColor) {
    const parts = [
      paint(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, -0.1, 0), capColor),
      paint(new THREE.CylinderGeometry(0.98, 0.98, 0.06, 20).translate(0, -0.12, 0), '#efe4cf'),
      paint(new THREE.CylinderGeometry(0.36, 0.44, 0.95, 12).translate(0, -0.55, 0), C.mozz)
    ];
    [[-0.5, 0.55, 0.4], [0.45, 0.6, 0.35], [0, 0.88, 0.1], [0.1, 0.55, -0.7], [-0.35, 0.5, -0.6]].forEach(([x, y, z]) =>
      parts.push(paint(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 0.5, 1).translate(x, y - 0.1 + 0.05, z), C.mozz)));
    return merge(parts);
  }
  function pepperGeo() {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.05 + 0.5 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.5) * (1 - t * 0.25), -1 + t * 1.9)); }
    return merge([
      paint(new THREE.LatheGeometry(pts, 14), C.tomato),
      paint(new THREE.ConeGeometry(0.42, 0.22, 10).translate(0, 0.98, 0), C.basil),
      paint(new THREE.CylinderGeometry(0.07, 0.09, 0.42, 8).translate(0.08, 1.22, 0), '#1F6640')
    ]);
  }
  function pineappleGeo() {
    const parts = [paint(new THREE.SphereGeometry(1, 14, 10).scale(0.62, 0.85, 0.62).translate(0, -0.15, 0), '#E8C24A')];
    [[-0.3, -0.35], [0, 0], [0.3, 0.35]].forEach(([rz]) => parts.push(paint(new THREE.ConeGeometry(0.16, 0.6, 6).translate(0, 0.3, 0).rotateZ(rz * 1.4).translate(0, 0.62, 0), C.basil)));
    return merge(parts);
  }
  function brickGeo() { return merge([paint(new THREE.BoxGeometry(1.7, 0.8, 0.8), '#a8432f'), paint(new THREE.BoxGeometry(1.5, 0.06, 0.66).translate(0, 0.42, 0), '#8d4034')]); }
  function rollingPinGeo() {
    return merge([
      paint(new THREE.CylinderGeometry(0.34, 0.34, 1.6, 14).rotateZ(Math.PI / 2), '#c68b54'),
      paint(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8).rotateZ(Math.PI / 2).translate(1.05, 0, 0), '#9a6a3c'),
      paint(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8).rotateZ(Math.PI / 2).translate(-1.05, 0, 0), '#9a6a3c')
    ]);
  }
  // Unit geometries: radius about 1 so a faller's game radius (p.r*W pixels) maps straight to scale.
  const GEO = {
    pizza: pizzaGeo(false), burnt: pizzaGeo(true), mushroom: mushroomGeo(C.tomato), greenmushroom: mushroomGeo('#4CAF3E'),
    pepper: pepperGeo(), pineapple: pineappleGeo(), brick: brickGeo(), rollingpin: rollingPinGeo()
  };
  const FLAT = {};

  // ---------- optional prop GLBs from /assets/props (server reports which exist) ----------
  // First file the server has wins. meshy-*.glb are the sculpted Meshy props with their colors
  // baked into vertex colors (assets/props/meshy/README.md); the rest are the procedural pack.
  const PROP_FILES = {
    pizza: ['meshy-pizza.glb', 'pizza-pepperoni.glb'], burnt: ['meshy-burnt.glb', 'pizza-cheese.glb'],
    mushroom: ['meshy-mushroom.glb', 'mushroom.glb'], greenmushroom: ['meshy-greenmushroom.glb', 'mushroom.glb'],
    pepper: ['meshy-pepper.glb', 'chili-pepper.glb'], pineapple: ['meshy-pineapple.glb'],
    brick: ['meshy-brick.glb', 'brick.glb'], rollingpin: ['meshy-rollingpin.glb', 'rolling-pin.glb'], pan: ['pan.glb']
  };
  const loader = new GLTFLoader();
  // Flatten a prop into one vertex-colored geometry, normalized to the same unit size as the primitives.
  function propToGeometry(root, type) {
    root.updateMatrixWorld(true);
    const parts = [];
    let baked = false;
    root.traverse(o => {
      if (!o.isMesh) return;
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      let col = o.material && o.material.color ? o.material.color.clone() : new THREE.Color(1, 1, 1);
      const n = g.attributes.position.count, a = new Float32Array(n * 3), vc = g.attributes.color;
      if (vc) {
        baked = true;
        // Baked prop: keep its own colors (RGB only, so every part merges the same way).
        for (let i = 0; i < n; i++) { a[i * 3] = vc.getX(i) * col.r; a[i * 3 + 1] = vc.getY(i) * col.g; a[i * 3 + 2] = vc.getZ(i) * col.b; }
      } else {
        if (type === 'burnt') col.multiplyScalar(0.45);
        if (type === 'greenmushroom' && col.r > 0.5 && col.g < 0.4) col = new THREE.Color('#4CAF3E');
        for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
      }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      Object.keys(g.attributes).forEach(k => { if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k); });
      parts.push(g);
    });
    if (!parts.length) return null;
    const geo = merge(parts);
    geo.computeBoundingBox();
    const b = geo.boundingBox, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, cz = (b.min.z + b.max.z) / 2;
    // Pan prop: a round, handle-free saucer centered on x=0/z=0. Put the cooking surface
    // at y=0; the Chef holds it by the rim with both hands.
    if (type === 'pan') { geo.translate(0, -0.14, 0); return geo; }
    if (type === 'oven-raw') return geo;
    geo.translate(-cx, -cy, -cz);
    // The Meshy pepper is modeled standing up; lay it on its side, stem to the right, like the primitive.
    if (type === 'pepper' && baked) geo.rotateZ(-Math.PI / 2);
    const half = (type === 'pizza' || type === 'burnt') ? Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 : Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) / 2;
    geo.scale(1 / half, 1 / half, 1 / half);
    return geo;
  }
  function loadProps() {
    fetch('/api/props', { cache: 'no-cache' }).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] })).then(({ files, fx: hasFx }) => {
      if (hasFx) loadFx();
      const have = new Set(files || []);
      if (have.has('meshy-oven.glb')) loader.load('/assets/props/meshy-oven.glb', gltf => useMeshyOven(gltf.scene), undefined, () => {});
      Object.entries(PROP_FILES).forEach(([type, list]) => {
        const file = list.find(f => have.has(f));
        if (!file) return;
        loader.load('/assets/props/' + file, gltf => {
          const geo = propToGeometry(gltf.scene, type);
          if (!geo) return;
          if (type === 'pan') { panPropGeo = geo; rebuildPan(); }
          else { GEO[type] = geo; FLAT[type] = !file.startsWith('meshy-'); resetPool(type); if (type === 'pizza') rebuildStack(); }
          api.props.push(type);
        }, undefined, () => {});
      });
    });
  }

  // Optional effects pack (assets/fx/effects.js). The game keeps owning screen shake,
  // so the pack gets a no-op shake callback (one shake per event).
  let fxLib = null;
  function loadFx() {
    import('/assets/fx/effects.js').then(m => {
      const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      fxLib = m.createEffects({ THREE, scene, triggerShake: () => {}, reducedMotion: reduced, maxParticles: 96 });
      api.fx = true;
    }).catch(() => {});
  }

  // ---------- backdrop: a simple pizzeria ----------
  const backdrop = new THREE.Group(); scene.add(backdrop);
  const decoGroup = new THREE.Group(); backdrop.add(decoGroup);
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4; return t;
  }
  const brickTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5b2c1d'; g.fillRect(0, 0, w, h);
    const rh = 32, bw = 64;
    for (let r = 0; r < h / rh; r++) for (let x = -bw; x < w + bw; x += bw) {
      const off = (r % 2) * bw / 2, v = 0.82 + ((r * 7 + x) % 5) * 0.045;
      g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(62 * v)},${Math.round(46 * v)})`;
      g.fillRect(x + off + 3, r * rh + 3, bw - 6, rh - 6);
    }
  }, [5, 4]);
  const floorTex = canvasTex(128, 128, (g, w, h) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#3a2a22' : '#c9b48e'; g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2); }
  }, [8, 6]);
  const wallMat = toon({ map: brickTex, color: 0xffffff });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), wallMat); wall.position.set(0, 3, -5.5); backdrop.add(wall);
  const floorMat = toon({ map: floorTex });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), floorMat); floor.rotation.x = -Math.PI / 2; backdrop.add(floor);
  // Counter along the back
  const counterMat = toon({ color: '#5a3520' }), counterTop = toon({ color: '#e8dcc4' });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(26, 1.25, 1.2), counterMat); backdrop.add(counter);
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 1.35), counterTop); backdrop.add(ctop);
  // Brick oven with glowing mouth
  const oven = new THREE.Group(); backdrop.add(oven);
  const ovenBrick = toon({ map: brickTex.clone(), color: 0xd7b8a0 }); ovenBrick.map.repeat.set(2, 1);
  const ovenBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.4), ovenBrick); oven.add(ovenBase);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), ovenBrick); dome.position.y = 0.65; oven.add(dome);
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c });
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24, 0, Math.PI), mouthMat); mouth.position.set(0, 0.62, 1.12); oven.add(mouth);
  // Fire mouth on the oven front: dark arched opening, ember bed and flickering flames
  const fire = new THREE.Group(); fire.position.set(0, -0.42, 0.71); oven.add(fire);
  const archShape = new THREE.Shape(); archShape.moveTo(-0.55, 0); archShape.lineTo(-0.55, 0.32); archShape.absarc(0, 0.32, 0.55, Math.PI, 0, true); archShape.lineTo(0.55, 0); archShape.lineTo(-0.55, 0);
  const archRim = new THREE.Mesh(new THREE.ShapeGeometry(archShape, 16), toon({ color: '#5a2a1c' })); archRim.scale.setScalar(1.14); archRim.position.set(0, -0.02, 0.001); fire.add(archRim);
  const arch = new THREE.Mesh(new THREE.ShapeGeometry(archShape, 16), new THREE.MeshBasicMaterial({ color: 0x1a0a05 })); arch.position.z = 0.004; fire.add(arch);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6a1c, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), glowMat); glow.scale.set(1, 0.55, 1); glow.position.set(0, 0.12, 0.006); fire.add(glow);
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4a10 });
  for (let i = 0; i < 7; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 3) * 0.02, 8, 6), emberMat); e.scale.y = 0.55; e.position.set(-0.36 + i * 0.12, 0.04, 0.02); fire.add(e); }
  const FLAME_COLORS = [0xff4a12, 0xff8a1c, 0xffd23c];
  const flames = [];
  [[-0.27, 0.15, 0.32, 0], [0.27, 0.15, 0.3, 0], [-0.1, 0.2, 0.48, 0], [0.12, 0.19, 0.44, 0], [0, 0.22, 0.56, 0],
   [-0.18, 0.12, 0.3, 1], [0.18, 0.12, 0.28, 1], [0, 0.15, 0.4, 1], [-0.06, 0.08, 0.22, 2], [0.07, 0.08, 0.2, 2]].forEach(([x, r, h, layer], i) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10, 1, true), new THREE.MeshBasicMaterial({ color: FLAME_COLORS[layer], transparent: true, opacity: layer === 2 ? 0.95 : 0.85, depthWrite: false, side: THREE.DoubleSide }));
    m.geometry.translate(0, h / 2, 0); m.position.set(x, 0.06, 0.03 + layer * 0.02); m.renderOrder = 2 + layer;
    flames.push({ m, h, seed: i * 1.7 + layer * 0.9, base: x }); fire.add(m);
  });
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3, 10), toon({ color: '#3a2a22' })); chimney.position.set(0, 3, -0.2); oven.add(chimney);
  // Meshy oven (assets/props/meshy-oven.glb): replaces the box + dome and keeps the animated fire,
  // fitted into the model's own arched mouth. Model space: 1.64 wide, y -0.95..0.9, mouth centered
  // at x 0, y -0.45..0.03, about 0.67 wide, facing +Z.
  function useMeshyOven(root) {
    const geo = propToGeometry(root, 'oven-raw');
    if (!geo) return;
    const s = 2.6 / 1.64, lift = -0.65 + 0.95 * s;
    const m = new THREE.Mesh(geo, propMat); m.scale.setScalar(s); m.position.y = lift; oven.add(m);
    ovenBase.visible = dome.visible = mouth.visible = archRim.visible = false;
    fire.position.set(0, -0.45 * s + lift, 0.66 * s); fire.scale.set(0.67 * s / 1.1, 0.5 * s / 0.87, 1);
    chimney.position.set(0.27 * s, 0.7 * s + lift + 1.5, -0.1 * s); chimney.scale.set(0.8, 1, 0.8);
    api.props.push('oven');
  }
  // Window showing the level sky
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 64;
  const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
  function paintSky(a, b) { const g = skyCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); skyTex.needsUpdate = true; }
  const windowGroup = new THREE.Group(); backdrop.add(windowGroup);
  windowGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.1), new THREE.MeshBasicMaterial({ map: skyTex })));
  const frameMat = toon({ color: C.olive });
  [[0, 1.1, 1.9, 0.14], [0, -1.1, 1.9, 0.14], [-0.9, 0, 0.14, 2.3], [0.9, 0, 0.14, 2.3], [0, 0, 0.08, 2.1], [0, 0.1, 1.7, 0.08]].forEach(([x, y, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat); m.position.set(x, y, 0.06); windowGroup.add(m);
  });
  // Neon sign (canvas text drawn once fonts are ready)
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 128;
  const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
  function paintSign() {
    const g = signCanvas.getContext('2d'); g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(30,18,12,0.85)'; g.beginPath(); g.roundRect ? g.roundRect(6, 6, 500, 116, 22) : g.rect(6, 6, 500, 116); g.fill();
    g.lineWidth = 6; g.strokeStyle = C.glow; g.stroke();
    g.font = "700 64px 'Fredoka', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = C.tomato; g.shadowBlur = 18; g.fillStyle = '#FFE9A8'; g.fillText('HOT SLICE', 256, 68);
    signTex.needsUpdate = true;
  }
  paintSign(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintSign);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  backdrop.add(sign);
  // Hanging lamps + string lights (dropped on the lowest tier)
  const lampMat = toon({ color: C.olive }), bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  const lamps = [];
  for (const x of [-1.6, 1.6]) {
    const g = new THREE.Group();
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3, 4), lampMat); cord.position.y = 1.5; g.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 16, 1, true), lampMat); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bulbMat); bulb.position.y = -0.18; g.add(bulb);
    g.userData.x = x; lamps.push(g); decoGroup.add(g);
  }
  const STRING_N = 18;
  const stringLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), STRING_N);
  stringLights.instanceMatrix.setUsage(THREE.DynamicDrawUsage); decoGroup.add(stringLights);
  const STRING_COLORS = [C.glow, C.tomato, C.basil, '#FF3D7F', '#579bfc'].map(c => new THREE.Color(c));

  // ---------- pan + stack ----------
  const panGroup = new THREE.Group(); scene.add(panGroup);
  const panInner = new THREE.Group(); panGroup.add(panInner);
  const panFaceMat = toon({ color: '#e7e9ec' }), panRimMat = toon({ color: '#cfd2d6' });
  // Pan skins on the prop pan: Classic keeps the baked vertex colors; other skins swap in a
  // solid material tinted with the skin's rim3d color so the whole rim changes, not just the face.
  const panPropMat = toon({ vertexColors: true, flatShading: true }), panSkinMat = toon({ color: '#46545b', flatShading: true });
  let panPropGeo = null, panMeshes = [], panPropMesh = null;
  const panOutlineMat = outlineMaterial(0.05);
  function rebuildPan() {
    panMeshes.forEach(m => panInner.remove(m)); panMeshes = [];
    if (panPropGeo) {
      const m = panPropMesh = new THREE.Mesh(panPropGeo, panPropMat); m.scale.setScalar(1 / 0.8);
      const tint = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 28), panFaceMat); tint.position.y = 0.0;
      panMeshes.push(m, tint);
    } else {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.9, 0.16, 28), panFaceMat); face.position.y = -0.08;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 32), panRimMat); rim.rotation.x = Math.PI / 2;
      panMeshes.push(face, rim);
    }
    panMeshes.forEach(m => panInner.add(m));
    const ol = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 0.2, 28), panOutlineMat); ol.position.y = -0.06; ol.userData.outline = true;
    ol.visible = TIERS[tier].outline; panInner.add(ol); panMeshes.push(ol);
  }
  rebuildPan();
  const STACK_MAX = 100;
  let stackMesh = null;
  const stackColor = new THREE.Color();
  function rebuildStack() {
    if (stackMesh) { scene.remove(stackMesh); stackMesh.dispose(); }
    stackMesh = new THREE.InstancedMesh(GEO.pizza, FLAT.pizza ? propMatFlat : propMat, STACK_MAX);
    stackMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); stackMesh.count = 0; stackMesh.frustumCulled = false;
    for (let i = 0; i < STACK_MAX; i++) stackMesh.setColorAt(i, stackColor.set(i % 2 ? 0xfff2e0 : 0xffffff));
    scene.add(stackMesh);
  }
  rebuildStack();

  // ---------- fallers (pooled per type) ----------
  const glowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const GLOW = { mushroom: '#2E8B57', greenmushroom: '#7ED957', pepper: '#D64541' };
  const pools = {}, used = {};
  function makeFaller(type) {
    const g = new THREE.Group();
    const geo = GEO[type] || GEO.pizza;
    const mesh = new THREE.Mesh(geo, FLAT[type] ? propMatFlat : propMat); g.add(mesh);
    const ol = new THREE.Mesh(geo, propOutline); ol.userData.outline = true; mesh.add(ol);
    if (GLOW[type]) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: GLOW[type], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.renderOrder = -1; g.add(s); g.userData.glow = s;
    }
    g.userData.mesh = mesh; scene.add(g); return g;
  }
  function resetPool(type) { (pools[type] || []).forEach(g => scene.remove(g)); pools[type] = []; }
  const seeds = new WeakMap();
  // Debris (dropped pizzas on the floor)
  const debrisPool = [];
  function debrisMesh(i) {
    if (!debrisPool[i]) {
      const m = new THREE.Mesh(GEO.pizza, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex, transparent: true }));
      m.scale.set(1, 0.35, 1); scene.add(m); debrisPool[i] = m;
    }
    return debrisPool[i];
  }

  // ---------- Chef ----------
  const chef = new THREE.Group(); scene.add(chef);
  const chefInner = new THREE.Group(); chef.add(chefInner);
  const shadowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });
  const chefShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat); chefShadow.rotation.x = -Math.PI / 2; scene.add(chefShadow);
  const growGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#2E8B57', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  growGlow.renderOrder = -1; scene.add(growGlow);
  let mixer = null, actions = {}, current = null, chefModelHeight = 1, bones = {}, chefOutline = null, chefMat = null;

  // ---------- state for procedural moves ----------
  const fx = { stumble: 0, stumbleDir: 1, miss: 0, celebrate: 0, flash: 0, flashColor: new THREE.Color(), greet: 2.2, lastState: '' };
  const lastChefFeet = new THREE.Vector3(), lastStackTop = new THREE.Vector3();
  let lastChefHeight = 1, lastGroundTop = 0.885;
  const ringAt = () => [lastChefFeet.x, floorY + 0.02, lastChefFeet.z + 0.35];
  api.event = (name, arg) => {
    if (name === 'stumble') {
      fx.stumble = 0.7; fx.stumbleDir = Math.random() < 0.5 ? -1 : 1; fx.flash = 0.45; fx.flashColor.set('#ff3b2f');
      if (fxLib && arg === 'pepper') fxLib.powerUp(ringAt(), 'pepper', { radius: lastChefHeight * 0.45 });
    }
    else if (name === 'miss') {
      fx.miss = 0.5;
      if (fxLib && typeof arg === 'number') { screenToFloor(arg * W, lastGroundTop * H + 8, _fxp); fxLib.miss([_fxp.x, floorY + 0.03, _fxp.z], { count: 10 }); }
    }
    else if (name === 'celebrate') {
      fx.celebrate = 1.3; fx.flash = 0.6; fx.flashColor.set(C.glow);
      if (fxLib) fxLib.milestone(lastStackTop, { count: 36 });
    }
    else if (name === 'catch') {
      // squash/stretch of the Chef comes from game state; the pack adds a pan bounce and power-up rings
      if (fxLib) {
        fxLib.catchPizza(panInner);
        if (arg === 'mushroom' || arg === 'greenmushroom') fxLib.powerUp(ringAt(), 'mushroom', { radius: lastChefHeight * (arg === 'greenmushroom' ? 0.6 : 0.45) });
      }
    }
    else if (name === 'reset') { fx.stumble = fx.miss = fx.celebrate = fx.flash = 0; if (fxLib) fxLib.clear(); }
  };
  const _fxp = new THREE.Vector3();

  function fadeTo(name, dur = 0.25) {
    const next = actions[name];
    if (!next || next === current) return;
    next.reset().setEffectiveWeight(1).fadeIn(dur).play();
    if (current) current.fadeOut(dur);
    current = next;
  }

  // Simple aim IK: rotate bone so the direction to its child points at target.
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qi = new THREE.Quaternion();
  function aim(bone, child, target, w) {
    if (!bone || !child || w <= 0) return;
    bone.getWorldPosition(_a); child.getWorldPosition(_b);
    _b.sub(_a).normalize(); _c.copy(target).sub(_a).normalize();
    _q.setFromUnitVectors(_b, _c);
    if (w < 1) _q.slerpQuaternions(_qi, _q, w);
    bone.getWorldQuaternion(_q2); _q2.premultiply(_q);
    bone.parent.getWorldQuaternion(_q3).invert();
    bone.quaternion.copy(_q3.multiply(_q2));
    bone.updateMatrixWorld(true);
  }

  // Coin skins: recolor the hat, shirt stripes and trousers of the baked texture.
  // Regions come from the bind-pose height (the head is 0.90 to 1.70, torso and arms
  // 0.38 to 0.93, legs below) combined with the texel color, so the red shoes, skin,
  // face and eyes are never touched. Classic keeps the original texture.
  const SKIN = { on: { value: 0 }, hat: { value: new THREE.Color() }, sd: { value: new THREE.Color() }, sl: { value: new THREE.Color() }, pants: { value: new THREE.Color() } };
  let lastSkinKey = null;
  function addSkinRecolor(m) {
    const base = m.onBeforeCompile;
    m.onBeforeCompile = s => {
      base(s);
      s.uniforms.uSkinOn = SKIN.on; s.uniforms.uSkinHat = SKIN.hat; s.uniforms.uSkinSD = SKIN.sd; s.uniforms.uSkinSL = SKIN.sl; s.uniforms.uSkinPants = SKIN.pants;
      s.vertexShader = 'varying float vBindY;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindY = position.y;');
      s.fragmentShader = 'varying float vBindY;\nuniform float uSkinOn;\nuniform vec3 uSkinHat;\nuniform vec3 uSkinSD;\nuniform vec3 uSkinSL;\nuniform vec3 uSkinPants;\n' + s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  if (uSkinOn > 0.5) {
    vec3 c = diffuseColor.rgb;
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float sat = mx > 0.001 ? (mx - mn) / mx : 0.0;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    if (vBindY > 1.22 && c.r > 0.2 && c.r > c.g * 2.2 && c.r > c.b * 2.2) diffuseColor.rgb = uSkinHat * clamp(c.r / 0.6, 0.35, 1.3);
    else if (vBindY > 0.38 && vBindY < 0.93 && sat < 0.25) diffuseColor.rgb = mix(uSkinSD, uSkinSL, smoothstep(0.04, 0.45, lum));
    else if (vBindY < 0.93 && c.b > c.r * 1.2 && c.b > 0.12) diffuseColor.rgb = uSkinPants * clamp(lum / 0.35, 0.4, 1.4);
  }`);
    };
    m.customProgramCacheKey = () => 'toonrim-chefskin';
  }
  function applySkin(v) {
    const key = v.skinId || 'classic';
    if (key === lastSkinKey || !v.skin) return;
    lastSkinKey = key;
    SKIN.on.value = key === 'classic' ? 0 : 1;
    SKIN.hat.value.set(v.skin.hatTop); SKIN.sd.value.set(v.skin.stripeDark); SKIN.sl.value.set(v.skin.stripeLight); SKIN.pants.value.set(v.skin.pantsL);
  }

  loader.load('/avatars/chef-3d-game.glb', gltf => {
    const root = gltf.scene;
    let skinned = null;
    root.traverse(o => { if (o.isSkinnedMesh) skinned = o; if (o.isBone) bones[o.name] = o; });
    if (!skinned) { console.warn('Chef model missing skinned mesh, staying 2D'); return; }
    const src = skinned.material;
    chefMat = toon({ map: src.map || null, color: 0xffffff }, CHEF_RIM);
    addSkinRecolor(chefMat);
    skinned.material = chefMat; skinned.frustumCulled = false;
    chefOutline = new THREE.SkinnedMesh(skinned.geometry, outlineMaterial(0.012));
    chefOutline.bind(skinned.skeleton, skinned.bindMatrix);
    chefOutline.position.copy(skinned.position); chefOutline.quaternion.copy(skinned.quaternion); chefOutline.scale.copy(skinned.scale);
    chefOutline.frustumCulled = false; chefOutline.userData.outline = true;
    skinned.parent.add(chefOutline);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    chefModelHeight = box.max.y - box.min.y || 1;
    root.position.y = -box.min.y;
    chefInner.add(root);
    // Strip root motion so clips play in place; keep only rotations + Hips height.
    gltf.animations.forEach(clip => {
      clip.tracks = clip.tracks.filter(t => {
        if (t.name.endsWith('.quaternion')) return true;
        if (/^Hips\.position$/.test(t.name)) { const v = t.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; } return true; }
        return false;
      });
    });
    mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
    api.clips = gltf.animations.map(c => c.name); api.chefModelHeight = chefModelHeight;
    [CLIPS.greet, CLIPS.gameover].forEach(n => { const a = actions[n]; if (a) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } });
    fadeTo(CLIPS.greet in actions ? CLIPS.greet : CLIPS.idle, 0);
    setTier(tier);
    canvas.style.display = 'block';
    api.active = true;
    loadProps();
  }, undefined, err => { console.warn('Chef model failed to load, staying 2D', err); });

  // ---------- tiers + fps watchdog ----------
  function setTier(t) {
    tier = t; api.tier = t;
    const T = TIERS[t];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, T.dpr));
    RIM.strength.value = 0.45 * T.rim; CHEF_RIM.strength.value = 0.55 * T.rim;
    decoGroup.visible = T.deco; rimLight.visible = T.rim > 0; ovenLight.visible = T.deco;
    scene.traverse(o => { if (o.userData.outline) o.visible = T.outline; });
    lastSize = '';
  }
  let fpsAcc = 0, fpsFrames = 0, lowSecs = 0, highSecs = 0, lastNow = performance.now(), graceT = 2;
  // /play?debug=fps shows a small live readout, for checking real phones.
  let fpsEl = null;
  if (qs.get('debug') === 'fps') {
    fpsEl = document.createElement('div');
    fpsEl.style.cssText = 'position:absolute;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:20;background:rgba(0,0,0,.72);color:#F2C14E;font:600 12px/1.2 monospace;padding:4px 8px;border-radius:6px;pointer-events:none;white-space:nowrap';
    frame.appendChild(fpsEl);
  }

  // ---------- screen to world mapping ----------
  const _ray = new THREE.Vector3(), _out = new THREE.Vector3();
  let W = 1, H = 1, lastSize = '', k = 0.01, floorY = -3;
  function screenToPlane(px, py, z, out) {
    _ray.set(px / W * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const t = (z - camera.position.z) / _ray.z;
    return out.copy(camera.position).addScaledVector(_ray, t);
  }
  function screenToFloor(px, py, out) {
    _ray.set(px / W * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const t = (floorY - camera.position.y) / _ray.y;
    return out.copy(camera.position).addScaledVector(_ray, t > 0 ? t : 100);
  }
  function layout(v) {
    const fw = frame.clientWidth, fh = frame.clientHeight;
    const sizeKey = fw + 'x' + fh + ':' + v.W + 'x' + v.H + ':' + tier;
    if (sizeKey === lastSize) return;
    lastSize = sizeKey;
    W = v.W || fw; H = v.H || fh;
    renderer.setSize(fw, fh, false);
    camera.aspect = fw / fh; camera.clearViewOffset(); camera.updateProjectionMatrix();
    const p1 = screenToPlane(0, H / 2, 0, new THREE.Vector3()), p2 = screenToPlane(W, H / 2, 0, new THREE.Vector3());
    k = (p2.x - p1.x) / W;
    floorY = screenToPlane(W / 2, v.groundTop * H, 0, _out).y;
    floor.position.y = floorY;
    // Backdrop placement relative to floor and visible width
    const wallZ = -5.5;
    const top = screenToPlane(W / 2, 0, wallZ, new THREE.Vector3()).y;
    const left = screenToPlane(0, H / 2, wallZ, new THREE.Vector3()).x;
    counter.position.set(0, floorY + 0.62, -4.4); ctop.position.set(0, floorY + 1.3, -4.35);
    oven.position.set(left * 0.38, floorY + 1.36 + 0.65, -4.6); oven.scale.setScalar(0.85);
    windowGroup.position.set(-left * 0.5, floorY + 3.6, wallZ + 0.02);
    sign.position.set(0, Math.min(top - 1.2, floorY + 6.4), wallZ + 0.05);
    lamps.forEach((g, i) => g.position.set(g.userData.x * Math.abs(left) / 3.2, Math.min(top - 1.2, floorY + 5.4), -2.6));
    for (let i = 0; i < STRING_N; i++) {
      const t = i / (STRING_N - 1), x = left + (-2 * left) * t;
      const y = top - 0.5 - Math.sin(t * Math.PI * 3) * 0.25 - 0.35;
      stringLights.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, wallZ + 0.2));
    }
    stringLights.instanceMatrix.needsUpdate = true;
  }

  // ---------- level look ----------
  let lastLevel = '';
  const NIGHT = [0, 0.1, 0.35, 0.8, 0.85, 1];
  const wallDay = new THREE.Color(0xffffff), wallNight = new THREE.Color('#6d6488'), tmpC = new THREE.Color();
  function applyLevel(v) {
    const name = v.level ? v.level.name : '';
    if (name === lastLevel) return;
    lastLevel = name;
    const idx = Math.max(0, v.levelIdx), n = NIGHT[Math.min(idx, NIGHT.length - 1)];
    if (v.level) paintSky(v.level.sky[0], v.level.sky[1]);
    wallMat.color.copy(wallDay).lerp(wallNight, n * 0.7);
    floorMat.color.copy(wallDay).lerp(wallNight, n * 0.6);
    hemi.intensity = 1.25 - n * 0.55; key.intensity = 2.1 - n * 0.9;
    hemi.color.set(0xfff1dc).lerp(tmpC.set('#9fa8ff'), n * 0.5);
    stringLights.visible = idx >= 4;
  }

  // ---------- per-frame chef update ----------
  const _hl = new THREE.Vector3(), _hr = new THREE.Vector3(), _pan = new THREE.Vector3();
  let ikL = 1, ikR = 1, yaw = 0;
  function updateChef(v, dt, panPos, panR) {
    if (!mixer) return;
    const st = v.state;
    // Clip selection
    let want;
    if (st === 'ending' || st === 'gameover') want = CLIPS.gameover;
    else if (st === 'playing') want = v.isRunning ? CLIPS.run : CLIPS.idle;
    else if (st === 'paused') want = v.pauseTime > 29 ? CLIPS.impatient : CLIPS.idle;
    else want = fx.greet > 0 ? CLIPS.greet : CLIPS.idle;
    if (st !== fx.lastState) { if (st === 'start') fx.greet = 2.2; fx.lastState = st; }
    fx.greet = Math.max(0, fx.greet - dt);
    if (!actions[want]) want = CLIPS.idle;
    fadeTo(want, want === CLIPS.run ? 0.15 : 0.3);
    if (actions[CLIPS.run]) actions[CLIPS.run].timeScale = v.isSprinting ? 1.9 : 1.15;
    mixer.update(dt);

    // Placement: feet on the floor at bodyX, a bit behind the pan
    const grow = v.growActive ? 1.25 : 1;
    const chefZ = -0.45;
    screenToPlane(v.bodyX * W, v.groundTop * H, chefZ, _out);
    // Chibi proportions: hands sit low, so size the Chef from screen width (the 2D
    // sprite was 0.25W tall) and keep the pan at chest height in front of him.
    const height = 0.34 * W * k * grow;
    const s = height / chefModelHeight;
    // Procedural squash/stretch (catch), hop (celebrate), wobble (stumble, miss)
    const sq = v.squash || 0;
    let hop = 0, roll = 0;
    if (fx.celebrate > 0) { const t = 1.3 - fx.celebrate; hop = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) * height * 0.22 : 0; fx.celebrate -= dt; }
    if (fx.stumble > 0) { roll += Math.sin(fx.stumble * 26) * 0.28 * (fx.stumble / 0.7) * fx.stumbleDir; fx.stumble -= dt; }
    if (fx.miss > 0) { roll += Math.sin(fx.miss * 30) * 0.08 * (fx.miss / 0.5); fx.miss -= dt; }
    chef.position.set(_out.x, floorY + hop, chefZ);
    lastChefFeet.set(_out.x, floorY, chefZ); lastChefHeight = height; lastGroundTop = v.groundTop;
    chefInner.scale.set(s * (1 + sq * 0.12), s * (1 - sq * 0.16), s * (1 + sq * 0.12));
    const targetYaw = st === 'playing' && v.isRunning ? v.facing * (v.isSprinting ? 0.8 : 0.55) : 0;
    yaw += (targetYaw - yaw) * Math.min(1, dt * 10);
    chef.rotation.set(0, yaw, roll);
    chefShadow.position.set(_out.x, floorY + 0.01, chefZ + 0.1);
    chefShadow.scale.set(height * 0.75 * (1 - hop / height), height * 0.4, 1);
    growGlow.visible = !!v.growActive;
    if (v.growActive) { const p = 0.5 + 0.5 * Math.sin(v.glowT * 6); growGlow.position.set(_out.x, floorY + height * 0.5, chefZ - 0.3); growGlow.scale.setScalar(height * (1.5 + p * 0.4)); }

    // Hands hold the pan (IK), released for the game over shrug; the right hand waves on celebrate.
    const holding = st !== 'ending' && st !== 'gameover';
    const waving = fx.celebrate > 0;
    ikL += ((holding ? 1 : 0) - ikL) * Math.min(1, dt * 8);
    ikR += ((holding ? 1 : 0) - ikR) * Math.min(1, dt * 8);
    chef.updateMatrixWorld(true);
    // Each hand grips the rim on its own side of the body. The Chef faces the camera, so
    // his left hand is on screen right; aiming it at the screen-left rim crossed his arms.
    const lSide = bones.LeftArm && bones.RightArm ? Math.sign(bones.LeftArm.getWorldPosition(_a).x - bones.RightArm.getWorldPosition(_b).x) || 1 : 1;
    _hl.set(panPos.x + lSide * panR * 0.92, panPos.y - panR * 0.08, panPos.z - panR * 0.12);
    if (waving) _hr.set(_out.x - lSide * height * 0.35 + Math.sin(v.glowT * 18) * height * 0.08, floorY + height * 1.05, chefZ + 0.2);
    else _hr.set(panPos.x - lSide * panR * 0.92, panPos.y - panR * 0.08, panPos.z - panR * 0.12);
    aim(bones.LeftArm, bones.LeftForeArm, _hl, ikL); aim(bones.LeftForeArm, bones.LeftHand, _hl, ikL);
    aim(bones.RightArm, bones.RightForeArm, _hr, ikR); aim(bones.RightForeArm, bones.RightHand, _hr, ikR);

    // Rim tint: skin accent color, green while big, flash on hits and milestones
    applySkin(v);
    const baseRim = v.growActive ? '#7ED957' : '#ffe2b0';
    CHEF_RIM.color.value.set(baseRim);
    if (fx.flash > 0) { CHEF_RIM.color.value.lerp(fx.flashColor, Math.min(1, fx.flash * 2.5)); fx.flash -= dt; }
    CHEF_RIM.strength.value = 0.55 * TIERS[tier].rim + (fx.flash > 0 ? 0.8 : 0) + (v.growActive ? 0.4 : 0);
  }

  // ---------- render ----------
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _qq = new THREE.Quaternion();
  const TILT = 0.2;
  api.render = (v) => {
    if (!api.active) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
    // fps watchdog (only while actually playing and visible)
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 1) {
      api.fps = Math.round(fpsFrames / fpsAcc);
      if (fpsEl) fpsEl.textContent = '3D | ' + api.fps + ' fps | tier ' + tier + ' | dpr ' + renderer.getPixelRatio().toFixed(2) + (api.props.length ? ' | props' : '') + (fxLib ? ' | fx' : '');
      if (v.state === 'playing' && !document.hidden && graceT <= 0 && !forcedTier) {
        lowSecs = api.fps < (tier > 1 ? 45 : 24) ? lowSecs + 1 : 0;
        highSecs = api.fps >= 55 ? highSecs + 1 : 0;
        if (lowSecs >= 3 && tier > 0) { setTier(tier - 1); lowSecs = highSecs = 0; graceT = 2; }
        else if (highSecs >= 8 && tier < TOP_TIER) { setTier(tier + 1); lowSecs = highSecs = 0; graceT = 2; }
      } else lowSecs = highSecs = 0;
      graceT = Math.max(0, graceT - fpsAcc);
      fpsAcc = 0; fpsFrames = 0;
    }
    layout(v);
    applyLevel(v);
    const t = v.glowT || now / 1000;

    // Oven + string light animation
    const flick = 0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.1) * 0.05;
    mouthMat.color.setRGB(1, 0.5 * flick + 0.05, 0.18 * flick);
    for (const f of flames) {
      const n = Math.sin(t * 9.1 + f.seed) * 0.5 + Math.sin(t * 15.7 + f.seed * 2.3) * 0.3 + Math.sin(t * 23.3 + f.seed * 0.7) * 0.2;
      f.m.scale.set(1 + n * 0.12, 1 + n * 0.32, 1);
      f.m.position.x = f.base + Math.sin(t * 6.2 + f.seed) * 0.025;
      f.m.rotation.z = Math.sin(t * 5.3 + f.seed) * 0.1;
    }
    glowMat.opacity = 0.42 + flick * 0.18;
    emberMat.color.setRGB(1, 0.24 + Math.sin(t * 4.1) * 0.06, 0.05);
    ovenLight.intensity = 6 * flick * (1 + NIGHT[Math.max(0, Math.min(5, v.levelIdx))] * 0.6);
    if (stringLights.visible) for (let i = 0; i < STRING_N; i++) stringLights.setColorAt(i, tmpC.copy(STRING_COLORS[(i + Math.floor(t * 2)) % STRING_COLORS.length]).multiplyScalar(v.rush ? 1.4 : 1));
    if (stringLights.instanceColor) stringLights.instanceColor.needsUpdate = true;

    // Pan
    const sq = v.squash || 0;
    screenToPlane(v.panX * W, v.panY * H + 4.5 + sq * 3, 0, _pan);
    const panR = 35.64 * k;
    panGroup.position.copy(_pan);
    panGroup.scale.setScalar(panR);
    panGroup.rotation.set(TILT, 0, 0);
    if (v.pan) {
      panFaceMat.color.set(v.pan.face); panRimMat.color.set(v.pan.rim);
      if (panPropMesh) { const r3 = v.pan.rim3d; panPropMesh.material = r3 ? panSkinMat : panPropMat; if (r3) panSkinMat.color.set(r3); }
    }

    updateChef(v, dt, _pan, panR);

    // Stack
    const h = Math.min(v.towerHeight || 0, v.stackCap || 100, STACK_MAX);
    for (let i = 0; i < h; i++) {
      const tt = (i + 1) / Math.max(1, h), sway = v.segSway[i] || 0;
      screenToPlane(v.panX * W + sway * 30, v.panY * H + 2 - (i + 1) * v.segLift, 0, _p);
      const rx = (20 - Math.min(tt * 3, 10)) * k;
      _e.set(TILT, 0, -sway * 0.5); _qq.setFromEuler(_e);
      _s.set(rx, v.segLift * k * 0.85 / 0.42, rx);
      stackMesh.setMatrixAt(i, _m.compose(_p, _qq, _s));
    }
    stackMesh.count = h; stackMesh.instanceMatrix.needsUpdate = true;
    screenToPlane(v.panX * W, v.panY * H - (h + 1) * v.segLift, 0, lastStackTop);
    if (fxLib) fxLib.update(dt);

    // Fallers
    for (const key in used) used[key] = 0;
    const fl = v.fallers;
    for (let i = 0; i < fl.length; i++) {
      const p = fl[i], type = GEO[p.type] ? p.type : 'pizza';
      const pool = pools[type] || (pools[type] = []);
      const n = used[type] || 0; used[type] = n + 1;
      const g = pool[n] || (pool[n] = makeFaller(type));
      g.visible = true;
      let seed = seeds.get(p); if (seed === undefined) { seed = Math.random() * 10; seeds.set(p, seed); }
      screenToPlane(p.x * W, p.y * H, 0, g.position);
      const r = p.r * W * k;
      const m = g.userData.mesh;
      m.scale.setScalar(r);
      if (type === 'pizza' || type === 'burnt') m.rotation.set(1.05 + Math.sin(t * 2 + seed) * 0.25, seed, Math.sin(t * 1.5 + seed) * 0.3);
      else if (type === 'pepper') m.rotation.set(0.2, t * 1.5 + seed, -0.42);
      else if (type === 'brick' || type === 'rollingpin') m.rotation.set(t * 2 + seed, seed, t * 1.3);
      else m.rotation.set(0.25, t * 1.2 + seed, Math.sin(t * 3 + seed) * 0.15);
      const glow = g.userData.glow;
      if (glow) {
        const pulse = type === 'pepper' ? 0.6 + 0.4 * Math.abs(Math.sin(t * 9)) : type === 'greenmushroom' ? 0.6 + 0.4 * Math.abs(Math.sin(t * 5)) : 0.7 + 0.3 * Math.sin(t * 6);
        glow.scale.setScalar(r * (type === 'greenmushroom' ? 6.4 : 5.2) * pulse);
        glow.material.opacity = 0.85;
      }
    }
    for (const key in pools) { const pool = pools[key], n = used[key] || 0; for (let i = n; i < pool.length; i++) pool[i].visible = false; }

    // Debris
    const db = v.debris || [];
    for (let i = 0; i < db.length; i++) {
      const d = db[i], m = debrisMesh(i);
      screenToFloor(d.x * W, d.y * H, m.position); m.position.y = floorY + 0.03;
      const r = d.r * W * k; m.scale.set(r, r * 0.35, r);
      m.material.opacity = Math.max(0, d.life / d.maxLife) * 0.85; m.visible = true;
    }
    for (let i = db.length; i < debrisPool.length; i++) debrisPool[i].visible = false;

    // Screen shake: exact pixel offset that matches the 2D overlay
    if (v.shakeX || v.shakeY) camera.setViewOffset(W, H, -v.shakeX, -v.shakeY, W, H);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    renderer.render(scene, camera);
  };
}
