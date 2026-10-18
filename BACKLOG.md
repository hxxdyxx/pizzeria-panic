# Backlog: Pietro's Pizzeria Panic

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
- [x] **Console hygiene:** added an inline pizza favicon (production was
  logging a favicon.ico 404) and load model-viewer only when WebGL exists
  (it threw errors on no-WebGL devices). Replaced the em dashes in
  player-facing copy per brand rules.
- **Debug switches:** `/play?r=2d` forces the 2D renderer; `/play?fx=0|1|2`
  pins an effects tier and disables auto-downgrade.
- **Verified:** headless Chrome at a 390x844 phone viewport. Full runs to
  game over with zero console errors, warnings or failed requests, both
  with and without Agent B's props; the auto-downgrade fired as expected
  under software rendering; and the forced-2D and no-WebGL paths render
  the original game with zero errors.

**Follow-ups:**
- [ ] **Chef skins in 3D.** The 5 coin skins recolor the 2D sprite's hat,
  stripes and pants. The GLB uses one baked texture atlas, so 3D currently
  shows the equipped skin only as the Chef's rim-light accent color. A
  real recolor needs region masks for the atlas. Pan skins do recolor.
- [ ] **Wire in `assets/fx/effects.js`** once PR #6 merges (glow rings,
  3D milestone bursts, sauce splats). Use either its injected shake or
  the existing `triggerShake` call per event, not both.
- [ ] **Real-device fps check** on a mid-range Android phone. Headless
  testing uses software WebGL, so it can't confirm 60fps.


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
- [ ] **Paid or ad-based "continue"** after game over — common, effective retention+monetization lever in this genre. Needs a decision on mechanism (ad-gated vs. small paid continue) before building.
- [ ] **Leaderboard seasons/resets.** Right now it's an evergreen top-10, which becomes an unreachable wall for new players once populated. A weekly-reset board (keeping an all-time board too) is standard practice but is a real schema/UX change — worth doing once there's actual traffic to protect.

## Nice-to-have, lower priority

- [ ] Guided first-run tutorial beyond the current static instructions (the difficulty curve already ramps gently, so this is polish, not urgent).
- [ ] Art/asset pass if budget allows — current pixel-art Pietro + canvas effects are already solid, but a professional illustrator pass would raise production value further.

## Explicitly out of scope tonight

Ad network integration and any real-money continue mechanic were not implemented — both involve business/brand decisions and new third-party accounts that shouldn't be set up without explicit sign-off.
