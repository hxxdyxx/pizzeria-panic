# Skins shop previews

`skin-<id>.jpg` and `pan-<id>.jpg` are the pictures on the Skins screen. One
file per entry in `SKIN_CATALOG` and `PAN_CATALOG` in `play.html`, named by
its `id`. If a file is missing, the card falls back to the old colour dot.

They are screenshots of the real 3D game, so they match what players see:

- Chef skins: the outfit on 3D Pietro, with the pan hidden.
- Pan skins: Classic Pietro holding that pan.

## How skins reach the 3D Pietro

- Chef skins: a shader in `js/render3d.js` (`addSkinRecolor`) recolours the
  baked texture of `avatars/chef-3d-game.glb`. It picks regions by bind-pose
  height plus texel colour: hat (red, above 1.22), shirt stripes (low
  saturation, 0.38 to 0.93) and trousers (blue, below 0.93). Shoes, skin, face
  and eyes are never touched. It uses the palette's `hatTop`, `stripeDark`,
  `stripeLight` and `pantsL`.
- Pan skins: the face disc takes `face`, and the prop pan's whole body takes
  `rim3d`. Classic has no `rim3d` and keeps the prop's baked dark steel.

**If the Chef model is ever replaced,** check the shader's height bands and
colour tests against the new texture, then re-render these previews.

## Regenerating

Add or change a catalog entry in `play.html`, then (macOS with Chrome):

    npm i puppeteer-core
    node assets/skins/render-thumbs.mjs

It renders every skin and pan with the auto quality drop disabled (so the
software renderer doesn't blur later shots) and writes 306x325 JPEGs here.
