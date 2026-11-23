# Pizzeria Panic 3.0
## Retention-first game expansion and Meshy production plan

**Target:** `ppp-3.0-retention-expansion`  
**Base:** `main`  
**Product:** Pietro's Pizzeria Panic at https://pppanic.com  
**Primary objective:** Give players a compelling reason to return tomorrow, then give them meaningful goals that keep paying off over weeks.  
**North star:** More players voluntarily start another run, return on another day, and share a challenge with someone else. No pay-to-win, forced ads, or real-money continue mechanics.

---

## Executive decision

Pizzeria Panic already has a meaningful amount of retention and progression infrastructure. Version 3.0 must extend it, not rebuild or duplicate it.

The current game already includes:
- Daily Challenge with a rotating daily modifier, seeded item sequence, local daily best, and a separate daily leaderboard.
- A local play streak with a small shield bonus.
- Three active missions that carry progress across runs, tier up, award coins, and raise Chef Level.
- Lifetime achievements, unlock celebrations, Pizza Coins, cosmetic Chef skins, pan skins, purchasable upgrades, and a Pizza Book.
- Six progression levels/worlds: Kitchen, Boardwalk, Rooftop, Street Festival, and Neon Arcade, with two Kitchen phases.
- Coin-based one-time continue, hazards, power-ups, rush events, weather, combo systems, haptics, sound, landscape, and gamepad support.
- Anonymous aggregate run telemetry in `api/run.js`, including run length, score, cause, level, combo, hits, drops, continue use, controls, renderer, and first-run cohort.

**Therefore 3.0 is a retention layer plus a content expansion.** The most important gaps are durable cross-device identity/progression, a richer return loop, weekly/social goals, event variety, content pacing, and a measured balance process. The existing local streak and progression are not a substitute for server-backed player continuity.

## Product pillars

1. **Come back:** daily and weekly rituals with clear rewards and no punitive streak loss.
2. **Get better:** skill-based challenges, readable mastery goals, fair difficulty, and satisfying feedback.
3. **Collect:** cosmetics, Chef/pan variants, rare visual drops, and world collectibles. No gameplay power locked behind spending.
4. **Discover:** new events and hazards that change how a run feels, not just reskinned objects.
5. **Share:** challenge links and friend competition that work without forcing account creation.
6. **Feel:** distinct world identity through sound, music, animated scenery, haptics, and polished transitions.

---

## Existing systems audit and integration rules

| Existing system | 3.0 decision | Rule |
|---|---|---|
| Daily Challenge | Expand | Keep the shared daily seed and separate board. Add daily reward claim state and challenge variety without changing the deterministic run seed. |
| Local play streak | Upgrade carefully | Keep existing local keys readable. Introduce server-backed profile streak only after identity/consent design is approved. Do not reset existing streaks. |
| Missions | Extend | Keep the three-slot cross-run mission structure. Add weekly contract layer separately, not a fourth hidden mission slot. |
| Achievements / Pizza Book | Expand | Add world/event mastery sets and collection pages. Existing achievement IDs and rewards remain stable. |
| Coins / shop / upgrades | Preserve | Coins remain earned through play. Avoid inflation and avoid selling power. New cosmetics should have transparent costs. |
| Daily leaderboard | Preserve | Keep current board and season semantics. Version 3.0 scoring changes require a deliberate season bump. |
| Run telemetry | Extend | Preserve anonymous collection. Add event/return funnel fields only after privacy review and schema tests. Never collect names, email, or precise location in run telemetry. |
| Worlds | Expand | Preserve the six existing progression thresholds until playtest data supports a change. Worlds need visual/audio events, not a forced level reset. |
| Continue | Preserve | One coin continue per run remains. Do not add ad gates or real-money continue. |
| 3D renderer | Preserve fallback | Every new 3D prop has a procedural or existing-art fallback. No feature may make WebGL mandatory. |

### Important technical facts from main

- Main branch at audit: tree `ffc55b90e719cf9c9fc1b561f34787155988eaf3`.
- Core game logic and UI are currently concentrated in `play.html`; Three.js scene and prop/world integration live in `js/render3d.js`.
- `api/run.js` stores anonymous aggregate run records in KV; `api/session.js` issues signed short-lived run tokens.
- `api/leaderboard.js` owns normal and daily boards and season keys.
- `api/props.js` lists available GLBs and optional FX availability.
- Meshy world props are registered in the `WORLDS` table in `js/render3d.js`; falling objects are registered in `PROP_FILES`.
- Current Meshy prop pipeline is documented in `assets/props/meshy/README.md`; current shared art conventions are in `assets/props/README.md`.
- Existing model budget has generally targeted approximately 150 KB per GLB, but several current world models exceed it (for example the AC unit at ~240 KB and model pans at ~160-182 KB). Treat 150 KB as a target, not a false claim about every existing file.
- The existing FX module is `assets/fx/effects.js`; retain reduced-motion support and bounded particle counts.

---

## The 3.0 player loop

### Session loop
1. Player opens the game and immediately sees today's challenge, their current progress, and one clear Play action.
2. Player chooses standard play or Daily Challenge. Daily Challenge remains fair and shared.
3. During the run, a small number of contextual events create memorable moments: order rush, environmental hazard, rare collectible, or world event.
4. End-of-run results show the best next action: claim progress, finish a mission, retry today's challenge, or share a score challenge.
5. Rewards are granted once, with explicit confirmation and no confusing double-claim state.

### Return loop
1. A daily visit offers a predictable, achievable reward.
2. A weekly contract offers a longer skill goal that can be completed across sessions.
3. Collection pages show what is earned, what is missing, and how to earn it.
4. A rotating event changes one meaningful mechanic or world interaction.
5. Returning players see their last milestone and the next attainable one.

### Retention guardrails
- Never punish a missed day by deleting earned content or resetting long-term progression.
- Streaks are celebratory bonuses, not the only route to progression.
- Avoid manipulative countdowns, deceptive scarcity, or notifications that cannot be disabled.
- No paid random loot, gambling-like reward wheels, or pay-to-win boosts.
- Rewards must be granted idempotently. A retry or network failure must not duplicate coins or cosmetics.
- Keep the start screen uncluttered. Surface the next best action, not every system at once.

---

## Implementation roadmap

The phases are ordered dependencies. Complete each phase with its tests before moving to the next. The PR should remain additive and preserve the current main-branch game as a working fallback.

### Phase 0: Baseline, safety, and instrumentation

**Deliverables**
- Capture current baseline for first-run completion, runs per player/device, median session duration, D1/D7 return proxy, Daily Challenge starts/completions, mission completion, continue use, and leaderboard submissions.
- Add a lightweight internal event taxonomy for funnel steps: `game_open`, `run_start`, `run_end`, `daily_start`, `daily_complete`, `reward_claim`, `challenge_share`, `return_visit`.
- Keep analytics anonymous. Use a rotating random installation token only if needed for aggregate return measurement, with a clear privacy note and a reset option. Do not fingerprint devices.
- Add a versioned event schema and strict allowlist. Do not accept arbitrary client JSON fields.
- Add a debug-only retention panel or documented query for the aggregate metrics. Never expose private KV credentials.

**Acceptance**
- Existing `/api/run` contract remains backward compatible.
- Invalid or oversized event payloads are rejected.
- No personally identifying fields are stored.
- Telemetry failure never blocks gameplay.
- Baseline values are recorded before balance changes.

### Phase 1: Daily return loop 2.0

**Deliverables**
- Keep the existing daily modifier and deterministic sequence.
- Add a daily reward ladder with three transparent milestones: first completed run, challenge score target, and optional mastery target. Rewards are coins and/or cosmetic tokens, never paid currency.
- Add a single claim state per UTC challenge date. Server-backed claims only after a stable anonymous player key exists; until then, local state must be namespaced and safely migrated.
- Add a seven-day calendar view that celebrates completed days but does not erase lifetime progress after a missed day.
- Add a weekly completion chest earned by completing a defined number of daily challenges, not by logging in every day.
- Add an accessible “Today / This Week” summary to the start screen. Do not add a new full-screen modal on every visit.

**Acceptance**
- All clients receive the same challenge seed and modifier for the same UTC date.
- Date boundary tests cover UTC midnight and local timezone changes.
- Replaying a completed daily challenge cannot duplicate rewards.
- Existing daily leaderboard behavior and historical scores remain intact.
- The daily challenge remains playable without signing in.

### Phase 2: Weekly contracts and mastery

**Deliverables**
- Add three rotating weekly contracts selected from skill categories: precision catches, hazard dodges, combo mastery, power-up use, world progression, and clean runs.
- Weekly progress carries across normal runs and daily runs only where the contract explicitly allows it.
- Add a World Mastery page with one clear set of goals per existing world.
- Add “personal best to beat” and “one step away” prompts on results, based on the player's own history.
- Add a weekly reward track with fixed, published rewards and a cosmetic capstone.
- Avoid making objectives depend on rare random spawns unless the spawn rate is tuned to make completion realistic.

**Acceptance**
- Contract definitions are data-driven and testable.
- Weekly rollover is deterministic and timezone-safe.
- Progress is idempotent and cannot be counted twice from a duplicate run submission.
- No contract requires a paid upgrade or a specific control scheme.
- At least one accessible alternate objective exists for tilt/controller limitations.

### Phase 3: World events and gameplay expansion

**Deliverables**
- Add one signature interactive event per world, reusing existing environment assets before commissioning new models:
  - Kitchen: Oven flare / hot tray wave. Telegraph clearly, then alter the falling-item rhythm for a short interval.
  - Boardwalk: Crosswind gust. Existing umbrella, surfboard, and lifering become animated scene dressing; gust is a gameplay modifier, not an unavoidable hit.
  - Rooftop: Pigeon fly-by / rooftop gust. Pigeon animation and warning cue; optional collectible breadcrumb, never an unfair collision.
  - Street Festival: Food-truck service rush. A short order sequence adds score/coin skill bonus for accurate catches.
  - Neon Arcade: Bonus cabinet / claw grab. A limited bonus window awards a cosmetic token or coins for a skill condition, not random paid rewards.
- Add two new gameplay objects only after the existing spawn table is mapped and balance-tested: a positive collectible with clear value, and a hazard with a distinct readable silhouette and warning.
- Add one rare “Golden Order” event that is skill-earned, not a random jackpot.
- Add event telemetry for trigger, completion, dodge/failure, and reward.

**Acceptance**
- Every event has a readable tell, consistent hitbox, cooldown, and safe fallback.
- No two high-intensity events overlap in a way that creates unavoidable damage.
- Big Pietro behavior, hazard shield handling, and continue flow remain correct.
- Events run in both 2D fallback and 3D renderer. 3D-only dressing may be omitted in 2D.
- Performance remains stable on low-tier mobile devices.

### Phase 4: World identity, animation, audio, and haptics

**Deliverables**
- Give each world a concise audio identity: short looping music bed or procedural motif, 2-3 world-specific stingers, and consistent gameplay sound vocabulary.
- Add ambient loops only when they do not mask gameplay cues. Master, music, SFX, and haptics controls must be independent.
- Animate existing Meshy props through lightweight transforms or sprite/mesh rigs where possible. Do not regenerate static props simply to make them move.
- Add transitions between worlds with a short camera/light/material transition and a world title card that does not pause or obstruct active play.
- Add haptic patterns for rare reward, clean combo, world event, hazard hit, and boss/event completion. Respect device support and user settings.
- Respect `prefers-reduced-motion`, audio autoplay restrictions, and the current iOS Safari limitations.

**Acceptance**
- Sound remains opt-in after user gesture and mute preference persists.
- Haptic failure never breaks the run.
- Reduced-motion mode removes nonessential camera shake, excessive particles, and flashing.
- Music ducks under critical warning cues.
- All world transitions work on portrait and landscape screens.

### Phase 5: Social challenge and community loop

**Deliverables**
- Upgrade share links to encode a challenge type and target score while keeping the current `?beat=` links valid.
- Add daily challenge share action with the date and challenge ID; recipients land on the same deterministic challenge.
- Add a friend challenge result card with score, world reached, and a short share URL. Do not expose private player data.
- Add optional weekly community target only if aggregate infrastructure can support it reliably. Show progress as a community milestone, not a fake live counter.
- Keep leaderboard display separate from personal mastery so players who never submit initials still get meaningful progression.

**Acceptance**
- Old challenge URLs continue to work.
- Invalid or manipulated challenge parameters cannot change scoring rules.
- Share actions have clipboard/Web Share fallbacks.
- No account is required to play or receive a challenge.

### Phase 6: Content, economy, and polish

**Deliverables**
- Add a curated cosmetic collection tied to world mastery and weekly contracts.
- Rebalance coin income against existing skin, pan, and upgrade prices before adding more sinks.
- Add a rotating free cosmetic showcase; rotation changes what is highlighted, not whether an already-earned item remains owned.
- Improve the Pizza Book into a clear collection and progress destination, not a duplicate menu.
- Add onboarding that teaches one mechanic at a time and does not block experienced players.
- Review all overlays for mobile scroll, 320px width, landscape, controller navigation, keyboard navigation, and readable contrast.

**Acceptance**
- Economy simulation covers new, returning, and high-skill cohorts.
- Existing local coins, skins, pans, upgrades, achievements, and best scores survive the upgrade.
- All new rewards are obtainable through play.
- No new asset is required for the 2D fallback.

---

## Meshy production plan

### Production rules

1. Reuse the existing 25+ Meshy assets first. New generation is justified only when a model unlocks a new gameplay mechanic or materially improves a world identity.
2. Generate one asset per prompt with a consistent style suffix. Keep silhouettes chunky, readable at small mobile size, and compatible with Pietro's toy-like 3D style.
3. Prefer image-to-3D for distinctive designed props, then retopologize/decimate and bake color. Use text-to-3D only for simple props where shape accuracy is not critical.
4. Target under 150 KB per GLB for ordinary props and under 100 KB for falling objects. Keep texture atlases at 512 px or smaller unless there is a demonstrated visual need.
5. Aim for 2,000-4,500 triangles for ordinary props; 1,500-3,000 for falling objects. Avoid dense scans. No model may ship without a validation report and in-game scale check.
6. Use vertex colors for small rounded props. Preserve UVs and a small baked texture for large flat printed patterns that cannot survive vertex-color baking.
7. No text, logos, or font baked into models. UI typography stays in the host app.
8. Preserve source model, Meshy task ID, license/ownership notes, triangle count, byte size, and final path in the asset manifest.
9. Keep canonical Pietro avatar unchanged. New characters are separate environmental NPCs or event props, never a replacement chef.
10. Every asset must have a procedural/2D fallback and a clear owner in the asset manifest.

### Meshy batch A: high-value gameplay assets

| Priority | Asset | Gameplay use | Target tris | Target size | Notes |
|---|---|---|---:|---:|---|
| P0 | Golden pizza ticket | Daily/weekly reward collectible | 1,200 | <80 KB | High-contrast gold ticket, no embedded lettering |
| P0 | Order bell | Golden Order / service-rush trigger | 1,800 | <100 KB | Distinct bell silhouette, animated ring via code |
| P0 | Tomato crate | New readable hazard or world event prop | 2,200 | <120 KB | Rounded crate, clear silhouette, no tiny slats |
| P1 | Cheese wheel | Positive collectible / bonus objective | 2,000 | <100 KB | Large readable wedge or wheel; gameplay value determined in code |
| P1 | Sauce bottle | New falling collectible or order ingredient | 1,800 | <100 KB | Cap and body contrasting; no thin glass details |
| P1 | Flour sack | Environmental hazard / wind event prop | 2,000 | <110 KB | Soft sack with tied top, stable collision silhouette |

**Batch A prompt suffix:** “stylized chunky 3D arcade game prop, rounded toy-like proportions, clean readable silhouette at small mobile screen size, hand-painted warm colors, simple geometry, flat-shaded friendly game art, isolated single object, centered, orthographic three-quarter view, plain neutral background, no text, no logos, no watermark, no extra objects.”

### Meshy batch B: world event props

| Priority | Asset | World | Target tris | Target size | Notes |
|---|---|---|---:|---:|---|
| P1 | Animated oven door assembly | Kitchen | 3,000 | <150 KB | Door, handle, hinge separated if practical; code drives motion |
| P1 | Boardwalk gull | Boardwalk | 2,000 | <100 KB | Friendly stylized bird, no recognizable character |
| P1 | Rooftop vent fan | Rooftop | 2,500 | <120 KB | Blades separated or pivot-friendly |
| P1 | Festival order sign prop | Street Festival | 1,800 | <100 KB | Blank signboard; text rendered in UI |
| P1 | Arcade bonus cabinet | Neon Arcade | 3,500 | <150 KB | Simple cabinet, emissive details via code |
| P2 | Pizza parade float | Festival / special event | 4,000 | <150 KB | One-time seasonal event, only if it supports a playable event |

### Meshy batch C: collection rewards and cosmetics

| Priority | Asset | Use | Target tris | Target size |
|---|---|---|---:|---:|
| P2 | Golden chef hat | Cosmetic reward | 2,000 | <100 KB |
| P2 | Basil leaf crown | Cosmetic reward | 1,500 | <80 KB |
| P2 | Pizza medal | Collection badge / pan charm | 1,200 | <80 KB |
| P2 | Neon pan skin model | Arcade mastery reward | 3,000 | <150 KB |
| P2 | Festival pan skin model | Festival mastery reward | 3,000 | <150 KB |

Do not commission all batches at once. Batch A only after gameplay rules and reward economy are approved; Batch B after event prototypes are fun with placeholder geometry; Batch C after the retention loop is measurable.

### Meshy-to-game pipeline

1. Write the gameplay purpose, interaction, silhouette, spawn/trigger rule, and fallback before opening Meshy.
2. Generate a reference image with the shared art suffix. Review silhouette and color before spending 3D credits.
3. Create the model in Meshy using Image-to-3D. Record task ID and license details.
4. Export GLB and retain the original source in a non-runtime source folder if repository size permits.
5. Run the existing bake pipeline in `assets/props/meshy/bake.py` for vertex-color assets or `bake_tex.py` for patterned flat surfaces.
6. Run glTF validation. Reject invalid transforms, missing materials, non-finite values, unexpected external resources, and oversized files.
7. Record bytes, triangles, bounds, origin, scale, and expected collision radius in the manifest.
8. Add the model to `api/props.js` discovery and the appropriate registry in `js/render3d.js`. Keep fallback geometry.
9. Test in the actual game at phone scale, not only in Meshy viewer. Check portrait, landscape, low-tier rendering, shadow/outline behavior, and overlapping animations.
10. Merge only after the asset is loaded, used by its intended feature, and confirmed in both render paths.

### Suggested Meshy generation order

1. Golden pizza ticket
2. Order bell
3. Tomato crate
4. Cheese wheel
5. Sauce bottle
6. Flour sack
7. Only then world-specific event props based on prototype playtest results

This order prioritizes mechanics and reward feedback over decorative asset volume.

---

## Architecture and data design

### Player identity

Current progression is mostly localStorage-based. Cross-device progression requires a durable player identity and server-side save model. Do not silently create a fingerprint.

Recommended staged approach:
- **3.0A:** remain anonymous and device-local; add versioned save migration and export/import backup.
- **3.0B:** optional account/link flow only after the product has a real authentication provider and clear privacy policy. Do not roll a homegrown password system.
- **3.0C:** server-backed reward claims and cross-device sync, with conflict resolution and idempotency keys.

### Save schema proposal

Use a versioned profile document, separate from leaderboard submissions:

```json
{
  "schemaVersion": 1,
  "profileId": "opaque-random-id",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "wallet": { "coins": 0 },
  "collection": { "chefSkins": [], "pans": [], "achievements": [] },
  "progress": {
    "chefLevel": 1,
    "missions": {},
    "worldMastery": {},
    "weeklyContracts": {}
  },
  "daily": { "lastCompletedUtcDate": null, "claimedDates": [] },
  "settings": { "music": true, "sfx": true, "haptics": true, "reducedMotion": false }
}
```

This is a proposal, not a deployed schema. Validate all values server-side. Never trust client-supplied coin totals, ownership, or reward completion. Server-side reward grants must be transactional or use idempotency keys.

### API additions (only when auth and storage are ready)

- `GET /api/profile`: read authenticated/linked profile.
- `POST /api/profile/migrate`: one-time validated local-save migration.
- `POST /api/rewards/claim`: idempotent claim by reward ID and challenge date.
- `GET /api/events/current`: current event/weekly contract configuration.
- `POST /api/events/progress`: signed run summary contributes progress once.

Do not implement these endpoints using a client-controlled profile ID as authorization. Do not put KV credentials in the browser. Reuse the existing server-side signing pattern only as a run integrity primitive, not as a replacement for account authentication.

---

## Measurement plan

Track the following weekly, segmented only by broad cohorts (new/returning, control mode, renderer tier where available):

| Metric | Definition | Why |
|---|---|---|
| First-run completion | First sessions reaching a valid run end | Onboarding and difficulty |
| Runs per active day | Valid runs / active player-days | Session replay |
| D1 return | New players with a second active day within 1-2 days | First return |
| D7 return | New players active again 6-8 days later | Habit formation |
| Daily challenge participation | Daily starts / active players | Daily loop |
| Daily completion | Daily runs meeting completion rule / daily starts | Challenge fairness |
| Weekly contract completion | Completed contracts / started contracts | Long-term goal quality |
| Reward claim rate | Claims / eligible rewards | Clarity and perceived value |
| Challenge share rate | Share actions / completed runs | Organic acquisition |
| Share conversion | Challenge landings / share actions where measurable | Social loop |
| Median session length | Median active seconds per session | Engagement, not a goal alone |
| Continue use | Continued runs / eligible ended runs | Economy and difficulty |

**Do not optimize for raw time spent alone.** Retention is healthy only if players choose to return and report a satisfying experience. Monitor early quit rate and frustration signals alongside return rate.

### Experiment rules

- Change one major variable at a time.
- Keep a stable control cohort when sample size allows.
- Never compare pre/post periods without noting game version and season reset.
- Do not reset leaderboard seasons for cosmetic-only changes.
- A scoring or difficulty change that affects competitive fairness requires a season bump and clear release note.
- Set minimum sample thresholds before declaring a winner; low-volume data is directional only.

---

## QA and release checklist

### Gameplay
- [ ] New and returning player paths both work.
- [ ] Daily seed and modifier are identical across devices for the same UTC date.
- [ ] Daily/weekly rewards are granted once and only once.
- [ ] Streak loss never deletes collection or lifetime progress.
- [ ] Weekly contracts can be completed without a paid upgrade.
- [ ] No event can create unavoidable damage.
- [ ] Existing continue, shield, Big Pietro, hazards, power-ups, missions, achievements, and world transitions still work.
- [ ] Challenge links preserve current `?beat=` behavior.

### Devices and accessibility
- [ ] iOS Safari portrait and landscape.
- [ ] Android Chrome portrait and landscape.
- [ ] Desktop keyboard and mouse.
- [ ] Bluetooth and USB gamepads.
- [ ] Reduced motion.
- [ ] Audio disabled / autoplay denied.
- [ ] Haptics unavailable.
- [ ] WebGL unavailable and 2D fallback.
- [ ] 320px-wide viewport and short landscape viewport.
- [ ] Touch targets, contrast, menu scroll, and screen-reader labels.

### Assets and performance
- [ ] All GLBs pass glTF validation.
- [ ] Asset sizes and triangle counts match manifest.
- [ ] No missing external textures or broken URLs.
- [ ] Models have correct local origin and scale.
- [ ] Meshy props render at gameplay scale.
- [ ] No unbounded particles or per-frame allocations from new features.
- [ ] Low-tier renderer retains readable silhouettes and stable frame rate.
- [ ] Failed model loads fall back cleanly.

### Release
- [ ] Update build/version metadata.
- [ ] Record exact changes in BACKLOG.md.
- [ ] Bump leaderboard season only if scoring/difficulty fairness changes.
- [ ] Run automated tests and browser smoke tests.
- [ ] Verify deployed `https://pppanic.com` after merge/deploy.
- [ ] Publish concise release notes and a new share graphic.

---

## Recommended build sequence

**First build:** Phase 0 instrumentation and Phase 1 daily reward claims, with no account requirement. This gives the project a measurable return loop without introducing authentication risk.

**Second build:** Weekly contracts and World Mastery using existing models and existing mission/achievement infrastructure.

**Third build:** Prototype the five world events with placeholder geometry. Playtest and tune each event before commissioning Meshy assets.

**Fourth build:** Meshy Batch A and the best-performing world-event assets. Integrate and validate each model individually.

**Fifth build:** World audio, animated dressing, haptics, and transition polish.

**Sixth build:** Share challenges, weekly community goals, and curated cosmetics.

**Do not attempt a single all-at-once 3.0 code dump.** The scope is a major expansion. Ship it as tested, reversible slices under the 3.0 program so a retention feature cannot destabilize the core arcade loop.

---

## Implementation status (2026-11-22)

### Landed on the 3.0 branch: weekly contracts, first slice

- Added a start-screen weekly contract panel with three rotating goals and progress bars.
- Added six deterministic contract types: cumulative pizza catches, hazard dodges, power-ups, and orders; best-in-run combo and score.
- Contract selection is deterministic by ISO UTC week, so devices use the same contract set for the same week.
- Progress accumulates across runs in the existing local save system.
- Each completed contract grants 100 Pizza Coins once on that device for that week.
- No account, network request, notification, paid item, leaderboard change, or production API change is required.
- Existing daily challenge, mission, achievement, and wallet systems are reused, not replaced.

**Known limitation:** this first implementation is device-local. Progress does not sync across devices, and clearing browser storage clears weekly progress. It is intentionally not represented as server-verified or cross-device progression.

**Validation status:** source-level integration checks confirmed the panel, weekly key, contract pool, progress update call, and reuse of existing run metrics are present on the feature branch. Browser/device playtesting and automated regression tests remain outstanding. Do not merge or deploy until those checks pass.

## Immediate next actions

1. Review this plan against the live game's current telemetry and the current `BACKLOG.md`.
2. Implement Phase 0 event schema and baseline reporting without breaking `api/run.js`.
3. Prototype the daily reward ladder using current local save conventions, but keep reward claiming local until server identity is solved.
4. Prototype one world event (Kitchen Oven Flare) with placeholder geometry and test it in 2D and 3D.
5. Only then spend Meshy credits on Batch A.
6. Playtest with new players and returning players. Tune for voluntary second sessions and D1/D7 return, not just longer individual runs.

**Release definition:** Pizzeria Panic 3.0 is successful when the existing game remains instantly playable, players have a clear next goal, the daily/weekly loops are fair and reliable, new world events create distinct memorable runs, and measured return behavior improves without degrading player trust or performance.
