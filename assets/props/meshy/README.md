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
| meshy-oven.glb | background oven (replaces box + dome) | 6,000 | 01a18089-1deb |
| meshy-magnet.glb | magnet power-up | 2,600 | 01a1830c-bd38 |
| meshy-cutter.glb | pizza cutter power-up | 2,600 | 01a1830c-cf0c |
| meshy-timer.glb | slow-mo timer power-up | 2,600 | 01a1830d-4f65 |
| meshy-tipjar.glb | tip jar power-up | 2,600 | 01a1830d-8c24 |
| meshy-surfboard.glb | Boardwalk world | 2,600 | 01a18330-afe0 |
| meshy-lifering.glb | Boardwalk world | 2,600 | 01a18331-0431 |
| meshy-umbrella.glb | Boardwalk world | 2,600 | 01a18331-4abd |
| meshy-watertower.glb | Rooftop world | 4,500 | 01a18331-4996 |
| meshy-acunit.glb | Rooftop world | 12,900 (dense scan, won't decimate further) | 01a18332-3c0d |
| meshy-pigeon.glb | Rooftop world | 2,600 | 01a18331-9e1b |
| meshy-foodtruck.glb | Street Festival world | 4,500 | 01a18332-13b9 |
| meshy-lantern.glb | Street Festival world | 1,800 | 01a18331-de42 |
| meshy-arcade.glb | Neon Arcade world | 4,500 | 01a18332-1453 |
| meshy-jukebox.glb | Neon Arcade world | 4,500 | 01a18332-67cd |
| meshy-claw.glb | Neon Arcade world | 4,500 | 01a18334-0ade |

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

The oven is loaded separately (`useMeshyOven` in `js/render3d.js`): kept in
model space, scaled to the old oven's 2.6 width, the animated fire fitted
into the model's arched mouth, and the tall chimney pipe moved onto its
chimney. Those offsets are measured from this model, so re-measure them if
the oven file changes.

The magnet is modeled lying flat and is stood up at load (like the pepper).
Power-up GLBs were saved by hand from the Meshy viewer (2026-10-28).

World props are placed by the WORLDS table in js/render3d.js (height, x as a fraction of
the visible half-width, base height, depth, turn). Portrait phones only show about
xf -0.85..0.85 and the oven covers the left, so keep props between xf 0 and 0.8.
The first claw machine images both came out with a doll resembling a known animated
character; the prompt now says "plush pizza slice toys, no dolls, no people".
