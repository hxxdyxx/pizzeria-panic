# Pizzeria Panic props and FX

Additive asset pack for Agent A. No changes to play.html, production, game rules, fonts, or the canonical Chef avatar.

## Art and coordinates

Chunky silhouettes, low polygon counts, flat-shaded rough materials, material-batched meshes, no textures or external resources. Modeled to sit alongside avatars/chef-3d.glb. HSC colors are taken from the repository landing page: tomato #D64541, basil #2E8B57, olive #2C2C2C, gold #F2C14E, warm white #FAF8F5. Warm cheese, crust, wood, and brick support those colors. No text or font assets are embedded. Host UI retains Fredoka and Open Sans.

Y is up. Props use local ground y=0 and are centered around x=0, z=0. The pan handle points toward +Z. Pizza diameter is about 1.43 units, pan diameter about 1.65 units. Use the same scale for pizza and pan; the pizza fits the pan. Backdrop width is 6.15 units, with its brick wall toward -Z and oven facing +Z. The oven uses emissive geometry and does not require bloom. Add host lighting for standard materials; MeshToonMaterial conversion is optional at load time.

## Files

| File | Bytes | Contents |
| --- | ---: | --- |
| pizza-cheese.glb | 21,476 | Rounded crust, sauce, cheese |
| pizza-pepperoni.glb | 47,624 | Cheese pizza with seven pepperoni discs |
| pan.glb | 18,884 | Shallow pan, rim, chunky handle |
| mushroom.glb | 36,032 | Round red cap, cream spots and stem |
| chili-pepper.glb | 14,004 | Curved tapered red pepper and green stem |
| brick.glb | 5,696 | Red brick with three top recess marks |
| rolling-pin.glb | 19,164 | Wooden barrel and two rounded handles |
| pizzeria-backdrop.glb | 82,604 | Counter, brick wall, emissive oven |

Every GLB is below 150,000 bytes, including the complete backdrop. validation.json contains the Khronos glTF Validator results: zero errors and zero warnings for all eight files.

## Rebuild and verify

Node 20 or newer. Development dependencies only; no paid libraries and no new runtime dependency for the existing game.

```sh
cd assets/props
npm install
npm run build
npm run validate
npm run test:fx
```

The build script uses deterministic procedural geometry and Three.js GLTFExporter. validate.cjs rejects any GLB at or above 150,000 bytes or with validator errors. The FX tests cover scale restoration, overlapping catches, shake strengths, particle/ring limits, expiry, pooling, teardown, reduced motion, and world-coordinate mapping.

## Agent A integration

Load models with the host Three.js GLTFLoader. Keep canonical Chef asset and existing gameplay ownership unchanged. Import the FX factory from /assets/fx/effects.js. See ../fx/README.md for its complete API. This pack is deliberately not wired into play.html.
