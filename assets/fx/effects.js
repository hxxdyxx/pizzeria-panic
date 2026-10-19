/** Pizzeria Panic FX. Supply the same THREE namespace used by the host renderer. */
export function createEffects({ THREE, scene, triggerShake = () => {}, reducedMotion = false, maxParticles = 128, random = Math.random } = {}) {
  if (!THREE || !scene?.add) throw new TypeError('THREE and scene are required');
  if (typeof triggerShake !== 'function' || typeof random !== 'function') throw new TypeError('Callbacks must be functions');
  const T = THREE;
  const root = new T.Group();
  root.name = 'PizzeriaPanicFX';
  scene.add(root);
  const colors = { tomato: 0xd64541, basil: 0x2e8b57, gold: 0xf2c14e, white: 0xfaf8f5 };
  const limit = Math.max(0, Math.min(512, Math.floor(Number(maxParticles) || 0)));
  const sphere = new T.IcosahedronGeometry(1, 0);
  const ringGeo = new T.RingGeometry(0.75, 1, 24);
  const particles = [], free = [], rings = [], catches = new Map();
  let disposed = false;
  const world = new T.Vector3();
  function position(value, target) {
    if (value?.isObject3D) { value.getWorldPosition(world); target.copy(world); }
    else if (value?.isVector3) target.copy(value);
    else if (Array.isArray(value)) target.set(value[0], value[1], value[2]);
    else target.set(value?.x ?? 0, value?.y ?? 0, value?.z ?? 0);
    // Effects live in the host scene's coordinate system, including transformed scenes.
    root.updateWorldMatrix(true, false);
    root.worldToLocal(target);
  }
  function particle(at, color, size, ttl, velocity, flat = false) {
    if (disposed || particles.length >= limit) return;
    let p = free.pop();
    if (!p) {
      const material = new T.MeshBasicMaterial({ transparent: true, depthWrite: false });
      p = { mesh: new T.Mesh(sphere, material), velocity: new T.Vector3() };
      root.add(p.mesh);
    }
    position(at, p.mesh.position);
    p.mesh.visible = true;
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 1;
    p.mesh.scale.set(size, flat ? size * 0.13 : size, size);
    p.velocity.set(...velocity);
    p.age = 0; p.ttl = ttl; p.flat = flat;
    particles.push(p);
  }
  function catchPizza(object) {
    if (disposed || reducedMotion || !object?.scale) return;
    const previous = catches.get(object);
    catches.set(object, { base: previous ? previous.base : object.scale.clone(), age: 0 });
  }
  function glowRing(at, kind = 'mushroom', { duration = 0.9, radius = 0.65 } = {}) {
    if (disposed) return;
    if (kind !== 'mushroom' && kind !== 'pepper') throw new RangeError('kind must be mushroom or pepper');
    if (rings.length >= 16) { const old = rings.shift(); root.remove(old.mesh); old.mesh.material.dispose(); }
    const mesh = new T.Mesh(ringGeo, new T.MeshBasicMaterial({
      color: kind === 'mushroom' ? colors.basil : colors.tomato,
      transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false,
      blending: T.AdditiveBlending
    }));
    root.add(mesh); position(at, mesh.position);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(radius);
    rings.push({ mesh, age: 0, ttl: Math.max(0.1, duration), radius, kind });
  }
  function powerUp(at, kind = 'mushroom', options) {
    if (disposed) return;
    glowRing(at, kind, options);
    if (kind === 'pepper' && !reducedMotion) triggerShake(9);
  }
  function milestone(at, { count = 48 } = {}) {
    if (disposed) return;
    if (!reducedMotion) triggerShake(18);
    const palette = [colors.gold, colors.tomato, colors.white];
    const n = reducedMotion ? Math.min(6, count) : Math.min(limit, count);
    for (let i = 0; i < n; i++) {
      const angle = random() * Math.PI * 2;
      const speed = reducedMotion ? 0.2 : 1.2 + random() * 2.2;
      particle(at, palette[i % 3], 0.035 + random() * 0.045, 0.65 + random() * 0.5,
        [Math.cos(angle) * speed, reducedMotion ? 0.15 : 1.5 + random() * 2.5, Math.sin(angle) * speed]);
    }
  }
  function miss(at, { count = 12 } = {}) {
    if (disposed) return;
    for (let i = 0; i < Math.min(reducedMotion ? 4 : limit, count); i++) {
      const a = random() * Math.PI * 2, speed = reducedMotion ? 0 : 0.3 + random() * 0.8;
      particle(at, colors.tomato, 0.07 + random() * 0.08, 0.7 + random() * 0.35,
        [Math.cos(a) * speed, 0, Math.sin(a) * speed], true);
    }
  }
  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt <= 0) return;
    for (const [object, state] of catches) {
      state.age += dt;
      const u = Math.min(state.age / 0.28, 1);
      const squash = Math.sin(u * Math.PI * 2) * (1 - u) * 0.28;
      object.scale.set(state.base.x * (1 + squash), state.base.y / ((1 + squash) ** 2), state.base.z * (1 + squash));
      if (u >= 1) { object.scale.copy(state.base); catches.delete(object); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.age += dt;
      if (p.age >= p.ttl) { p.mesh.visible = false; free.push(p); particles.splice(i, 1); continue; }
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (!p.flat && !reducedMotion) p.velocity.y -= dt * 5;
      p.mesh.material.opacity = 1 - p.age / p.ttl;
      if (!p.flat && !reducedMotion) p.mesh.rotation.z += dt * 3;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.age += dt;
      if (r.age >= r.ttl) { root.remove(r.mesh); r.mesh.material.dispose(); rings.splice(i, 1); continue; }
      const u = r.age / r.ttl;
      r.mesh.scale.setScalar(r.radius * (reducedMotion ? 1 : 1 + u * 1.4));
      // Slow pulse avoids rapid flashing. Reduced motion uses a steady fade.
      const pulse = !reducedMotion && r.kind === 'pepper' ? 0.65 + 0.35 * Math.cos(r.age * Math.PI * 4) : 1;
      r.mesh.material.opacity = (1 - u) * 0.85 * pulse;
    }
  }
  function clear() {
    for (const [object, state] of catches) object.scale.copy(state.base);
    catches.clear();
    for (const p of particles) { p.mesh.visible = false; free.push(p); }
    particles.length = 0;
    for (const r of rings) { root.remove(r.mesh); r.mesh.material.dispose(); }
    rings.length = 0;
  }
  function dispose() {
    if (disposed) return;
    clear(); disposed = true;
    for (const p of free) p.mesh.material.dispose();
    free.length = 0;
    sphere.dispose(); ringGeo.dispose(); scene.remove(root);
  }
  return { catchPizza, glowRing, powerUp, milestone, miss, update, clear, dispose,
    get stats() { return { particles: particles.length, rings: rings.length, catches: catches.size, pooled: free.length }; } };
}
