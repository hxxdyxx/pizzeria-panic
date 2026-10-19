# Effects API

Dependency-free ES module using the host's Three.js namespace. No renderer, camera, animation loop, network request, DOM mutation, or paid library is created. All distances use the same world units as the props. Inject the existing triggerShake function so the host owns camera or canvas shake.

```js
import { createEffects } from '/assets/fx/effects.js';
const fx = createEffects({
  THREE,
  scene,
  triggerShake: strength => triggerShake(strength),
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  maxParticles: 128
});

// Call from Agent A's existing events and animation loop:
fx.catchPizza(pizzaObject);
fx.powerUp(mushroomObject, 'mushroom');
fx.powerUp(pepperObject, 'pepper'); // invokes triggerShake(9)
fx.milestone(panObject); // invokes triggerShake(18)
fx.miss([missX, floorY + 0.02, missZ]);
fx.update(deltaSeconds);

// On restart, scene teardown, or navigation:
fx.clear();
fx.dispose();
```

| API | Behavior |
| --- | --- |
| createEffects({THREE, scene, triggerShake, reducedMotion, maxParticles, random}) | Creates a private scene group. Particle cap defaults to 128, maximum 512. Optional random function supports reproducible tests. |
| catchPizza(object3D) | 0.28-second volume-preserving squash and stretch. Restores original non-uniform scale, including repeated catches and teardown. Host must not concurrently animate that object's scale. |
| glowRing(at, kind, {duration: 0.9, radius: 0.65}) | Green mushroom ring or slowly pulsing red pepper ring. No shake. Maximum 16 live rings. |
| powerUp(at, kind, options) | glowRing plus triggerShake(9) for pepper. Mushroom does not shake. |
| milestone(at, {count: 48}) | Gold, tomato, and warm-white 3D particles with gravity and triggerShake(18). |
| miss(at, {count: 12}) | Flattened tomato-red sauce droplets spreading in the XZ floor plane. Supply floor world Y to avoid z-fighting. |
| update(deltaSeconds) | Advances effects; call once per rendered frame. Does not own a requestAnimationFrame loop. Pause by skipping updates. |
| clear() | Restores caught objects, removes rings, recycles live particles. Reuse on restart. |
| dispose() | Idempotent teardown of the group and owned GPU geometry/materials. Never disposes host models. |
| stats | Read-only snapshot of active particles, rings, catches, and pooled particles. |

`at` accepts an Object3D, Vector3, [x,y,z], or {x,y,z}. Coordinates are world coordinates. Object3D positions are sampled when the effect starts; effects do not follow moving targets. Rings lie in the XZ plane. Orient a wrapper or adapt this for a different gameplay plane. Sauce stays in its supplied plane; it is not a geometry decal or collision simulation.

Reduced motion suppresses catch scaling and shake, removes ring growth/pulsing, and reduces bursts. Keep this option in sync by recreating the FX instance when the host accessibility preference changes. Pepper's normal pulse is two cycles per second with no strobe or bloom dependency.

Do not call both the existing event shake and the matching FX shake for the same event. Either inject the existing function and remove the redundant event call during Agent A integration, or pass a no-op callback and keep host shakes. No integration changes are included in this branch.

Particles are capped and recycled; sphere and ring geometry are shared. Materials are simple MeshBasicMaterial instances so FX remain visible without extra lights. Glow is additive geometry and works without postprocessing. Effects only supply visuals and shake callbacks; scoring, shields, lives, stack state, and hit detection remain host responsibilities.

From assets/props, run `npm run test:fx` after installing the documented development dependencies.
