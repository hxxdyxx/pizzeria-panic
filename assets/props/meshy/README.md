# Meshy props (falling items)

`assets/props/meshy-*.glb` replace the procedural falling items when present
(see `PROP_FILES` in `js/render3d.js`; the first file the server lists wins,
so deleting a `meshy-*.glb` falls back to the procedural one).

| File | Item | Tris | Meshy task (textured) |
| --- | --- | ---: | --- |
| meshy-pizza.glb | pizza (also the pan stack) | 3,200 | 01a1806e-4b75 |
| meshy-burnt.glb | burnt pizza | 3,200 | 01a1806e-a3a0 |
| meshy-mushroom.glb | red mushroom (extra life) | 2,200 | 01a1806e-ed7a |
| meshy-greenmushroom.glb | green mushroom (Big Pietro) | 2,200 | 01a1806f-0e3e |
| meshy-pepper.glb | chili pepper | 2,200 | 01a1806e-f3f5 |
| meshy-pineapple.glb | pineapple | 3,200 | 01a1806f-3412 |
| meshy-brick.glb | brick (not spawned by the game yet) | 2,200 | 01a1806f-3dee |
| meshy-rollingpin.glb | rolling pin (not spawned yet) | 2,200 | 01a1806f-4b4a |

## How they were made (2026-10-27)

1. Meshy image generation (Nano Banana Pro), one prompt per item with a shared
   style suffix: "stylized cartoon 3D game prop, chunky rounded toy-like
   shapes, bold saturated colors, simple clean hand-painted texture, ...
   plain pure white background".
2. Meshy Image to 3D (Meshy 7.1, textured, private license).
3. `bake.py` in headless Blender 4.2:
   `Blender -b -P bake.py -- in.glb out.glb TARGET_TRIS [preview.png]`
   welds the seam splits, samples the texture into per-vertex colors on the
   full-detail mesh, decimates to TARGET_TRIS, and exports an untextured GLB
   with COLOR_0 (100 to 160 KB each, about 0.5 MB for all eight).

The renderer keeps COLOR_0 when a prop has it and smooth-shades `meshy-*`
props; procedural props still get their flat per-material colors. The Meshy
pepper is modeled upright and is turned on its side at load.
