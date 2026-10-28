# Backlog: Pietro's Pizzeria Panic

## Done (2026-10-28): Brick and rolling pin hazards

hoody: use the brick and rolling pin as hazards, as recommended.

- Brick (from progress 45, up to 5% of spawns): falls 1.3x, costs a life (shield
  absorbs it), breaks the combo, knocks 3 pizzas off the stack.
- Rolling pin (from progress 60, up to 4%): no life lost, breaks the combo, and
  bonks the Chef: steering is cut to 40% for 1.5s (`stunT`), 3D wobble matches.
- Big Pietro ignores both. Dodges count toward "Dodge 8 hazards". The first of
  each per run gets a big-text warning. Both have warning glows and 2D drawings.

## Done (2026-10-27): Meshy falling items

hoody: use Meshy and Blender to make the game better, any credits needed.

- All six falling items (pizza, burnt pizza, red and green mushroom, chili,
  pineapple) are now sculpted Meshy models with their colors baked into vertex
  colors in Blender, about 0.5 MB for all eight files. Brick and rolling pin
  made too (now spawned, see 2026-10-28).
- Burnt pizza and green mushroom are their own models now (were tinted copies).
- Procedural props stay as the fallback. Pipeline and Meshy task ids:
  `assets/props/meshy/README.md`.
- Background oven is a Meshy brick oven now; the animated fire sits in its
  mouth and the chimney pipe meets its chimney.
- Checked in headless Chrome on the real game: all items load, no errors,
  pizza stack on the pan uses the new pizza.

## Done (2026-10-20): Continue after a run

hoody: add a continue button after each run. Chose: pay with coins, once per
run, back with 3 lives.

- When a run ends (lives or ceiling), a "KEEP THE SHIFT GOING?" card shows
  over the game before the results: score kept, back in with 🍕🍕🍕, a 6 s
  countdown ring, "Continue · 🍕 50" and "No thanks, end the shift".
- Continue costs 50 coins (`CONTINUE_COST`), once per run (`continueUsed`).
  Comes back with 3 lives (`CONTINUE_LIVES`); score, level, goals and run stats
  are kept; falling items are cleared, the combo resets, 1.6 s before the next
  spawn, and "BACK ON THE LINE!" flashes.
- Only offered when the player has 50+ coins; otherwise straight to results.
  Countdown running out or "No thanks" goes to results.
- Offered before the results on purpose: coins, best score, achievements and
  the leaderboard submit only happen once, for the final total. The server's
  play-session check only needs enough elapsed time, so a longer run is fine.
- Closes the "Paid or ad-based continue" backlog item with a coin-based
  version (no ads or real money).

## Done (2026-10-19): Keep the 3D Pietro sharp

hoody: the first 3D Pietro looked sharp and focused; has quality degraded?

- The tier settings hadn't changed, but the auto-downgrade did more harm than
  needed: under 45 fps for 3 s it dropped resolution and outlines, twice, down
  to 1x pixel ratio (about a third of an iPhone's sharpness), and never stepped
  back up. A 30 fps cap (iOS Low Power Mode) always triggered it within ~6 s of
  play. Later additions (oven fire, celebrations, run dust) add load too.
- Now 4 tiers, sharpest last to go: wall deco off, then rim light off, then
  1.5x. Outlines stay on at every tier. Dropping below 1.5x needs under 24 fps,
  so Low Power Mode settles at 1.5x with outlines. 8 s at 55+ fps steps back up.
- `?fx=0..3` still forces a tier; `?debug=fps` shows fps, tier and pixel ratio.
- Tested with a simulated frame rate: 60 fps stays at tier 3 (2x); 30 fps
  settles at tier 1 (1.5x); back to 60 fps recovers to tier 3; 10 fps goes to
  tier 0. Not yet measured on a real phone.
## Done (2026-10-19): Skins on the 3D Pietro

hoody: worried the coded skins wouldn't transfer to the new (3D) Pietro.

- Checked all 5 Chef skins and 4 pans on the 3D model. Chef skins already
  carried over (hat, shirt stripes and trousers recolour; shoes, face and skin
  untouched) and match the 2D palettes.
- Gap fixed: pan skins only tinted the centre disc; the rim stayed dark grey.
  Pan entries now have `rim3d` and the whole prop pan takes that colour
  (Golden, Copper, Record). Classic keeps the original dark steel.
- The Skins shop showed only a colour dot per item. Cards now show a render of
  3D Pietro in that outfit (pan hidden so the clothes show) or holding that pan
  (`assets/skins/*.jpg`, ~17 KB each, lazy-loaded; falls back to the dot).
- `assets/skins/render-thumbs.mjs` regenerates the previews from the real game;
  `assets/skins/README.md` explains how skins map onto the model and what to
  re-check if the Chef model is ever replaced.

## Done (2026-10-19): Tips out of the way, double-tap to run

hoody: the in-game tip boxes blocked Pietro too much (make them transparent,
higher, shorter, or closable), and add a double-tap left/right "run" vs "walk".

- Tutorial tips moved from 18% above the bottom (on top of Pietro) to the top
  of the play area, below the HUD. See-through (62% background, light blur),
  smaller text, 2.4 to 2.6 s instead of 3.2 to 3.4 s, and a tap closes them (✕).
  They wait until the goals card has closed so the two never stack up.
- Goals card: same see-through style, 2.6 s instead of 3.6 s, tap to close.
- Didn't pause the game for tips: with the tips short, high and closable,
  pausing would just interrupt the run.
- Run: double-tap a side of Pietro (or double-press an arrow/A/D key within
  300 ms). Keep the finger or key down to keep running at 1.85x speed; a quick
  tap-tap gives a short burst. Dust puffs, a whoosh, faster stride and more
  lean (2D and 3D). With the finger down, the finger stays the target, so he
  doesn't overshoot it. Works in Tilt mode too (tap-tap gives the burst).
- First tutorial tip now mentions it: "Double-tap a side to run."

## Done (2026-10-19): Link-preview image

hoody: wanted a link-preview image for shared pppanic.com links (no
Instagram graphics).

- `og-image.jpg` (1200x630, 145 KB) at the site root: the 3D Chef holding a
  pan of pepperoni pizzas, the gold PIZZERIA PANIC title, "Catch. Stack.
  Survive the rush." and "Play free · pppanic.com".
- Source: `assets/brand/og-card.html` (layout) and `assets/brand/og-image.png`.
  The Chef is rendered with the same aim-IK setup as the app icon.
- `index.html` and `play.html` now have a meta description, canonical URL,
  Open Graph tags and a `summary_large_image` Twitter card.

## Done (2026-10-19): Cleaner play screen, goal and achievement celebrations, oven fire, tip lines

hoody: the play screen was too cluttered; remove the sound button and the
words LIVES/SHIELD, keep goals off the play screen (show them at the start
and on pause), celebrate completed goals as big as a hazard hit without any
penalty, burst "ACHIEVEMENT UNLOCKED" with trophies, flash SHIELD in green,
add flickering flames to the oven, and replace "Buy the Chef a Slice".

- [x] **HUD:** lives are pizzas only; shield is green crosses (SVG, one per
  shield) with no words; both pills keep an aria-label with the count. The
  sound toggle moved from the HUD to the pause card. The goals panel is gone
  from the HUD.
- [x] **Goals:** a SHIFT GOALS card with progress (e.g. 12/30) slides in at
  the start of each run for ~3.6s, and a GOALS LEFT card after each new
  shift. The pause card lists all goals with progress and checkmarks.
- [x] **Goal complete:** same shake (9.45), burst and Chef reaction size as
  a pepper hit, but gold/green and nothing is lost. A ticket with the goal
  pops up, gets a green check and a red strike-through, then blasts away
  (scale, spin, blur) with confetti while "ACHIEVEMENT UNLOCKED" bursts in
  with flying trophies and stars. Built as a DOM layer (`#celebrateLayer`,
  z-index above overlays) so it also works on the game over and skins
  screens; extra unlocks queue.
- [x] **Pizza Book achievements** use the same burst (with the achievement
  name) instead of the small floating text.
- [x] **Bug fix:** "Don't drop a single pizza" used to count as done on the
  first catch. It is now judged only when the run ends (`endOnly`).
- [x] **SHIELD flash:** canvas big text in green (dark green stroke), same
  animation as the other words; also on a streak-bonus shield at run start.
  Big text now queues instead of overwriting.
- [x] **Oven fire (3D):** dark arched mouth on the oven front with an ember
  bed, warm glow and ten layered cone flames that flicker, sway and stretch.
- [x] **Tip copy:** "Buy the Chef a Slice" replaced by a rotating line
  (tip the kitchen crew / back of house / line cooks / dish pit / bussers and
  servers / the Chef, buy the cooks a cold drink / a round of coffee). It
  changes each time the start or pause screen opens. Nothing alcoholic, and
  no "shift drink" (it reads as beer in restaurant talk). Same Stripe link.
- [x] **Reduced motion:** trophies and confetti are skipped and the burst
  fades in and out instead of popping.
- **Verified** in headless Chrome at 390x844: start, HUD, shield flash, goal
  sequence (frame-by-frame with paused CSS animations, both motion modes),
  pause, achievement burst over game over, full run and retry, zero console
  errors.

## Done (2026-10-19): Handle-free pan, uncrossed arms, cleaner start and pause screens

hoody reported from a phone that Pietro's arms were crossed and the pan
handle didn't sit in his hands, and that the start and pause screens were
too cluttered.

- [x] **Pan has no handle.** `assets/props/build-props.mjs` no longer adds
  the handle bar and wooden grip; `pan.glb` was rebuilt (12,224 bytes, glTF
  Validator 0 errors / 0 warnings) and is otherwise the same round saucer.
  The primitive fallback pan in `js/render3d.js` lost its handle too.
- [x] **Arms uncrossed, hands on the pan.** Root cause: the aim IK sent the
  Chef's left hand to the screen-left rim, but he faces the camera, so his
  left hand is on screen right; both arms crossed the body to reach. Each
  hand now grips the rim on its own side (side picked from the shoulder
  bones' world positions, so it stays right while running), and the
  celebrate wave uses the right hand's own side.
- [x] **Start screen:** one primary Play button; best, streak and coins as
  small chips; challenge line only when a `?beat=` link is used; daily
  special as one short line; Skins / Book / Scores / Sound as a 4-tile row;
  Touch/Tilt as a compact segmented toggle; donate as a quiet text link next
  to the credit. Removed the Current Shift card (always Morning Prep before
  a run), the Pizza Book counter card (the Book screen shows it), and the
  long rules paragraph (the in-game tutorial covers it). The scrim fades
  toward the bottom so the waving Chef stays visible.
- [x] **Pause screen:** Paused, Resume, Controls toggle, and a small donate
  link. Removed the brand credit block from the card.
- **Verified** in headless Chrome at 390x844 with the local build: all hub
  buttons open and close their screens, sound and control toggles persist,
  pause/resume, a full run to game over, and retry, with zero console
  errors. The 2D fallback renderer still draws its own pixel pan with a
  handle; not changed.
## Done (2026-10-19): App icon and favicons

hoody wanted Pizzeria Panic to have a home screen icon like The Chef app
(chef.1hotslice.com) instead of the generic "P" iOS was generating.

- [x] **Icon art:** a 3D render of the Chef from the canonical
  `avatars/chef-3d.glb`, holding the handle-free pan with two pepperoni
  pizzas, on a warm gold gradient. Same character and render style as The
  Chef's icon, but gold instead of dark so the two are easy to tell apart on
  a home screen. Source: `assets/brand/icon-1024.png`; the render page that
  made it is `assets/brand/icon-render.html` (Three.js, same aim IK as the
  game, matte materials, neutral tone mapping so the hat stays red).
- [x] **Files at the site root:** `apple-touch-icon.png` (180),
  `icon-192.png`, `icon-512.png`, `favicon-32.png`, `favicon-16.png`,
  `favicon.ico` (16/32/48). The small favicons use a tighter face-and-hat
  crop so they read at 16px.
- [x] **`manifest.json`:** short name "Pizzeria Panic", opens `/play`,
  standalone, portrait, `#2C2C2C` theme.
- [x] **Head tags** in `index.html` and `play.html` replace the inline pizza
  emoji SVG favicon: icon links, apple-touch-icon, manifest,
  `apple-mobile-web-app-title`, theme color.
- To see the new icon on an iPhone, remove the old home screen shortcut and
  add it again from Safari (iOS caches the icon at add time).

## Done (2026-10-18): 3D renderer (Three.js, toon Chef, 2D fallback)

hoody asked to replace the 2D pixel-art rendering in `play.html` with a 3D
Three.js scene using the chibi Chef, keeping game logic, scoring,
leaderboard, anti-cheat tokens, streaks and challenge links functionally
identical. Confirmed first that main already had the v2.0 Foundation Pass
(and the v2.1 pass on top), so nothing needed restoring.

**Architecture: logic untouched, renderer swapped.** All game rules still
live in the existing 2D script. `js/render3d.js` is a separate ES module
that reads a per-frame snapshot (`snapshot3d()` in `play.html`) and draws
the world. Every gameplay object is placed by ray-casting its exact 2D
screen position onto the 3D plane z=0, so what the player sees lines up
pixel for pixel with the collision math. The 2D canvas stays on top as a
transparent overlay for particles, weather, wind, lightning, big text and
the stack count. The only logic-file edits are one-line `fx3d('...')` event
hooks (catch, hazard hit, pizza drop, milestone, level change, order
filled, reset) that only trigger animations.

- [x] **Three.js r170 vendored** at `vendor/three/` (core, GLTFLoader,
  BufferGeometryUtils, LICENSE), loaded through an import map. No CDN.
- [x] **Chef model:** `avatars/chef-3d-game.glb` is a 2.1MB game copy of the
  canonical `avatars/chef-3d.glb` (14MB). Same mesh, rig and all 11 clips;
  only the 4096px PNG texture was downscaled to a 1024px JPEG. The
  canonical file is untouched and still used by the post-game avatar.
- [x] **Clip map:** idle `Idle_11`; run left/right `Running` with the body
  yawed toward the direction of travel; start screen greeting
  `Wave_One_Hand`; impatient pause (29s+) `Finger_Wag_No`; game over
  `Shrug`. No clip existed for catch, stumble or celebrate, so they are
  procedural: catch is squash and stretch (same values as the 2D sprite),
  stumble (pepper, pineapple, burnt) is a decaying roll wobble plus a red
  rim flash, a dropped pizza is a small flinch, and celebrate (combo tier,
  new shift, order served) is a hop, gold rim flash and a one-arm wave.
  Root motion is stripped so clips play in place. Simple aim IK keeps both
  hands on the pan, released for the game over shrug.
- [x] **Look:** MeshToonMaterial with a 3-step ramp and a fresnel rim on
  everything, warm key light, back rim light, oven point light, inverted
  hull outlines. Pizzeria backdrop: brick wall, checkered floor, counter,
  brick oven with flickering mouth, window showing each level's sky
  colors, neon HOT SLICE sign, hanging lamps, and string lights for the
  Festival Lights and Midnight Rush levels. Night levels dim and cool the
  room.
- [x] **Props:** placeholder primitives for pizza, burnt pizza, mushroom,
  green mushroom, pepper, pineapple, brick and rolling pin, each merged
  into one vertex-colored geometry (one draw call each; the stack is a
  single InstancedMesh). Agent B's GLBs in `assets/props/` (PR #6) are
  loaded automatically when present: `GET /api/props` (new,
  `api/props.js`) lists the GLBs bundled into the deployment, so the
  browser never requests a missing file. Bricks and rolling pins render
  if those faller types return, but current spawn logic has no such types
  (they were replaced by pineapple and burnt pizza earlier), and no spawn
  logic was changed.
- [x] **Performance:** pixel ratio capped at 2. Three tiers (2: DPR 2 +
  outlines + rim; 1: DPR 1.5, no outlines; 0: DPR 1, no rim, no deco
  lights). If fps stays under 45 for 3 seconds while playing, it drops one
  tier (with a 2s grace period after each change). The 2D renderer remains
  the fallback whenever WebGL is unavailable, the Chef fails to load, or
  the WebGL context is lost.
- [x] **Console hygiene:** added an inline pizza favicon to `play.html`
  and `index.html` (production was logging a favicon.ico 404) and load model-viewer only when WebGL exists
  (it threw errors on no-WebGL devices). Replaced the em dashes in
  player-facing copy per brand rules.
- **Debug switches:** `/play?r=2d` forces the 2D renderer; `/play?fx=0|1|2`
  pins an effects tier and disables auto-downgrade.
- **Verified:** headless Chrome at a 390x844 phone viewport. Full runs to
  game over with zero console errors, warnings or failed requests, both
  with and without Agent B's props; the auto-downgrade fired as expected
  under software rendering; and the forced-2D and no-WebGL paths render
  the original game with zero errors.

**Follow-ups (all closed the same day, 2026-10-18, branch feat/3d-polish):**
- [x] **Chef skins in 3D.** The coin skins now truly recolor the 3D Chef:
  hat, shirt stripes and trousers. No new art; a shader picks regions by
  bind-pose height (head 0.90 to 1.70, torso and arms 0.38 to 0.93, legs
  below) plus texel color, so the red shoes, skin, face and eyes are never
  touched. Classic keeps the original texture. Verified with screenshots of
  all five skins.
- [x] **`assets/fx/effects.js` wired in:** pan bounce on every catch, green
  floor ring on mushrooms (bigger for the green one), red pulsing ring on
  pepper hits, 3D gold/tomato/white burst at the stack top on milestones,
  sauce splat where a pizza hits the floor, cleared on restart. Shake stays
  owned by the game (the pack gets a no-op shake), so there is still exactly
  one shake per event. Honors prefers-reduced-motion. Loaded only when
  `/api/props` reports `fx: true`, so it switches on by itself once PR #6
  (the props and FX pack) is merged, with no 404s before that.
- [x] **FPS check.** `/play?debug=fps` shows a live readout (fps, tier,
  pixel ratio, props, fx) for checking on a real phone. Measured on a real
  GPU (Intel HD 6000, a 2015 laptop integrated chip, weaker than most
  current mid-range phones) at a 390x844 phone viewport, 3x screen: a steady
  60fps on every tier, including the top tier with props and FX loaded, and
  auto mode stayed on the top tier.
- [ ] **PR #6 (props and FX pack) still needs merging.** Everything above
  that depends on it activates automatically after the merge.

## Done (2026-09-08) — v2.0 Foundation Pass: coins, skins, achievements, shift goals, sound, daily special

hoody asked for the game to become "more of a full fledged built out game"
and provided a design doc pitching a full Pizzeria-2.0 direction (campaign
shifts, currency, customers/orders, boss rushes, a persistent hub, etc.).
Rather than build all 20 ideas from the doc at once, built the foundation
layer that everything else hangs off of, matching the doc's own recommended
priority order (currency + unlocks, shift objectives, daily challenge,
character personality, sharing). Client-side only — no `api/*` changes, so
the leaderboard, session signing, and chef-link flows are untouched.

Shipped as 29 targeted string-replacement patches against `play.html`
(not a rewrite), verified with a headless jsdom harness that loads the
patched page, fakes canvas/AudioContext/fetch, clicks through every new
screen, and plays a full run via real `requestAnimationFrame` timing through
game-over. Zero runtime errors across that run, including the coin/
achievement payout path on game-over.

- [x] **Pizza Coins** — earned per run (score/10, floored) plus a bonus per
  completed Shift Goal. Persisted in `localStorage` (`ppp_coins`).
- [x] **Shift Goals** — 3 random objectives picked from a 12-item pool each
  run (catch counts, combo thresholds, survival time, no-drop run, etc.),
  shown live in the HUD, pay out 15 coins each on completion.
- [x] **Achievements ("Pizza Book")** — 13 achievements tracked against
  lifetime stats (`ppp_stats`) and unlocked state (`ppp_achievements`),
  browsable from a new hub screen, 25-coin bounty on unlock.
- [x] **Cosmetic unlocks** — 5 Pietro skins (recolored hat/stripes/pants via
  a palette object, no new art) and 4 pan skins (rim/face recolor),
  purchasable with coins from a new Skins screen, persisted and equipped
  live in `drawPietroBuffer()`/`drawPanAndTower()`.
- [x] **Combo tiers** — named tiers (HOT → EXTRA CHEESE → DOUBLE BAKED →
  KITCHEN FIRE → PIZZA GOD at 50+, new top multiplier) replacing the raw
  "COMBO x2!" text, each paired with a random Pietro one-liner.
- [x] **Stack Danger Meter** — live HUD bar showing proximity to the
  ceiling/release lines, color-coded green → yellow → red.
- [x] **Sound** — procedurally synthesized SFX via Web Audio (catch,
  combo-tier, powerup, hazard, life-lost, coin, achievement, game-over,
  UI click) since there were previously zero audio files or cues in the
  game. Mute toggle in the hub and HUD, persisted (`ppp_muted`).
- [x] **Daily Special** — a modifier seeded from today's date (no
  mushrooms / pineapple rain / double wind / fast start / extra spicy),
  shown as a hub badge, with a local best score tracked per day.
  **Not yet a shared/competitive daily leaderboard** — that needs a new
  `api/` endpoint keyed by date and is intentionally deferred; flagged as
  a Phase 2 item, not silently skipped.

**Deferred to a later pass** (from hoody's design doc, in priority order
per the doc's own "what I'd build next" section): campaign/shift structure
across named locations, the Customers & Orders mechanic, Boss Rush events,
a persistent visual Pizzeria Hub (currently a functional hub bolted onto
the existing start screen, not yet a growing restaurant scene), seasonal
reskins, a recurring antagonist, and the backend for a shared daily
leaderboard.

## Done (2026-08-27) — Updated in-game Chef character to match the newest 3D asset

hoody asked to bring the in-game pixel-art Chef (`drawPietroBuffer()` in
`play.html`, the standing character who holds the pan) in line with the
newest Chef assets in `chef-app`'s avatars folder, with explicit
tie-breakers: brand guidelines first, ADA/accessibility overrides brand
on conflict, and the newest asset wins for character-build questions.
Handled autonomously per hoody's request, no check-ins.

Compared the character against 4+ independent new references (the
textured 3D model, 3 ChatGPT character studies) which agreed
consistently: red chef hat, pale-grey skin, black-and-white striped
long-sleeve shirt, black pants, black sneakers with white soles. Verified
each change with real rendered screenshots (brightened crops of the
actual canvas output), not just reading the color values in code.

- [x] **Pants: blue jeans -> black.** Was `#2a4a8a`/`#223d75` (denim
  blue), now `#2C2C2C`/`#1c1c1c` (matches the brand's `--olive-black`).
- [x] **Shirt: solid red torso -> black-and-white horizontal stripes.**
  The torso was being drawn as one solid red silhouette (not actually
  striped, despite reading like stripes in the source) -- rewrote the
  per-row fill to alternate white/black in ~3px bands on the same
  silhouette shape, matching the marinière stripe pattern on every new
  reference asset.
  - [x] **Shoes: added a 1px white sole highlight** under the existing
    dark shoe blocks to read as two-tone sneakers, matching the reference.
- [x] **Left unchanged, already correct:** the red chef hat, pale-grey
  skin/face tones, and brown eyes/eyebrows were already close matches to
  the new assets -- no accessibility or brand conflicts found, so no
  further changes were made there.
- Checked `index.html` and the rest of `play.html` (shop interior, signs)
  for any other Chef depiction that might also need updating -- there
  isn't one; `drawPietroBuffer()` is the only place the character is
  drawn.

## Done (2026-08-26) — 3D Chef avatar link

Added a small idle-bobbing `<model-viewer>` 3D avatar of the Chef next to a
"Talk to the Chef" link -- landing page (`index.html`) CTA section, and the
post-game overlay in `play.html` right next to the existing `chefLinkWrap`
block, same collapsed/unobtrusive placement, never shown during live
gameplay. Links out to chef.1hotslice.com in a new tab rather than
embedding the chat itself (the chat's personalization needs chef-app's own
login session, which doesn't exist here). Vendored `<model-viewer>`
(`vendor/model-viewer.min.js`) and the model (`avatars/chef-3d.glb`)
directly in this repo, loaded via relative path since this page is served
directly by Vercel (unlike THC, which needs absolute URLs there).

Living list from a full audit against genre best practices (endless arcade catchers: Fruit Ninja, Crossy Road, Stack) and top-earning F2P retention/monetization patterns. See session notes for full reasoning.

## Done (2026-08-26) — Recovered a silently-reverted content update, added drift monitoring

A real content update from 2026-08-21 (the "Pietro" -> "the Chef" rebrand,
Rush Hour mechanic, Midnight Rush level) was deployed directly to Vercel,
never committed to git, and got silently erased 5 days later by an
ordinary git-based deploy. Recovered by pulling the actual deployment's
content straight from Vercel and re-merging it into git (commit c48baff)
-- see that commit message for the full incident writeup.

**Guardrail added so this can't happen silently again:** `api/build-info.js`
(this repo) exposes `VERCEL_GIT_COMMIT_SHA` -- empty means the live
deployment wasn't sourced from git. Polled every 4 hours by a new cron in
the `chef-app` repo (`api/cron/deploy-drift-check.js`), which emails an
alert if this or any of the other three Hot Slice properties drifts. See
that repo's `BACKLOG.md` for the full design.

**If you ever need to deploy this project directly again** (dashboard
upload, CLI, debugging): commit and push the exact same content to git
immediately after, or the next ordinary deploy will erase it again.

## Done (2026-08-15)

- [x] **Leaderboard anti-cheat.** Previously anyone could POST a fake top score directly to `/api/leaderboard` with zero gameplay — no validation existed at all. Added a signed session token (`/api/session`) issued at game start; submissions now require it and are checked against a minimum-plausible-elapsed-time for the claimed score. Verified with automated tests (no token, fake signature, and implausibly-fast submissions all correctly rejected; legitimate timed submissions succeed).
- [x] **Personal best tracking.** Nearly universal in this genre (Flappy Bird, etc.) and was entirely missing. Now tracked in localStorage and shown on the start screen.
- [x] **Daily streak.** Classic F2P "come back tomorrow" retention hook. Tracks consecutive calendar days played, shown on start screen, grants a small starting-shield bonus at 2+ days. No account system needed.
- [x] **Near-miss messaging on game over.** Shows "X points from your best" or "X points from the leaderboard" — proven re-engagement hook, previously absent.
- [x] **"Beat my score" challenge links.** Both share actions now carry a `?beat=N` link. Opening one shows the target on the start screen instead of the generic pitch, and game-over messaging reports the exact gap or a win. Chosen over leaderboard seasons/tutorial/art-pass as the highest-leverage item since it grows the player base rather than polishing for existing players — the right call pre-traffic.

## Done (2026-08-27)

- [x] **Admin leaderboard reset.** There was previously no way to clear the board short of manually wiping the KV key by hand. Added `DELETE /api/leaderboard`, gated behind a shared-secret `x-admin-key` header checked against a new `PPP_ADMIN_KEY` env var (same server-to-server pattern as `chef-link.js`'s bridge key) -- never exposed to the browser. Requires `PPP_ADMIN_KEY` to be set in the deploy environment before it'll work.

## Deferred, low-effort when picked back up

- [ ] **Vercel Web Analytics — declined for now, it's paid (2026-09-15).**
  Would give plays/engagement data if that matters for this project's
  goals. It's a billed feature (Vercel won't even let it be enabled
  non-interactively for that reason); hoody said no to the charge, not
  just "not right now." Don't re-suggest as a quick free toggle — revisit
  only if he decides the data is worth paying for. If it's ever turned on:
  `npx vercel project web-analytics enable pizzeria-panic --scope
  hot-slice-pizza` (run by hoody in his own terminal, confirms the
  charge) — also check whether this repo needs a manual script-tag add
  like THC does, or picks it up automatically.

## Needs a business decision before implementing

- [ ] **Real monetization.** The only revenue path today is a voluntary Stripe donate button ($0 raised so far, confirmed). Top F2P games monetize primarily through rewarded video ads (opt-in "watch ad to continue/2x score") and light IAP (cosmetics, remove-ads). Neither exists here. This needs: which ad network (AdMob, etc.), a decision on whether rewarded ads fit the brand, and new account/SDK setup — not something to wire up blind.
- [x] **Paid or ad-based "continue"** (done 2026-10-20 as a coin-based continue, see top; ads/real money still undecided) after game over — common, effective retention+monetization lever in this genre. Needs a decision on mechanism (ad-gated vs. small paid continue) before building.
- [ ] **Leaderboard seasons/resets.** Right now it's an evergreen top-10, which becomes an unreachable wall for new players once populated. A weekly-reset board (keeping an all-time board too) is standard practice but is a real schema/UX change — worth doing once there's actual traffic to protect.

## Nice-to-have, lower priority

- [ ] Guided first-run tutorial beyond the current static instructions (the difficulty curve already ramps gently, so this is polish, not urgent).
- [ ] Art/asset pass if budget allows — current pixel-art Pietro + canvas effects are already solid, but a professional illustrator pass would raise production value further.

## Explicitly out of scope tonight

Ad network integration and any real-money continue mechanic were not implemented — both involve business/brand decisions and new third-party accounts that shouldn't be set up without explicit sign-off.
