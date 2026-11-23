# Pizzeria Panic 3.0 Retention Core

Status: implementation branch, not production release.

## Included in this build

- Three rotating weekly contracts, each worth 100 Pizza Coins. Rotation is based on the UTC week. Existing player progress is stored in `ppp_weekly_v1` and retained.
- Daily kitchen login reward. The 7-day reward cycle pays 25, 35, 45, 55, 65, 80, and 100 coins. A missed UTC day resets the streak. Claiming is idempotent per UTC date.
- Five rotating world challenges, one per day. Kitchen catches, Boardwalk orders, and Rooftop dodges accumulate across runs. Festival combo and Neon score use the best single-run result. Each completed challenge pays 75 coins once per UTC day.
- World visit mastery across the five named worlds. Bronze at 1 visit, Gold at 3 visits, Master at 5 visits. One-time rewards total 150 coins per world, with tier claims persisted separately from visit counts.
- Five unique signature collectibles, one themed to each world: Golden Ladle, Boardwalk Conch, Rooftop Star, Festival Lantern, and Neon Pixel. First collection pays 25 coins and 50 score; repeats pay 10 coins and 15 score. Collection progress persists and is visible in the World Collection counter.
- Five world-specific hazard encounters, one per world: Grease Spill (burnt-pizza behavior), Boardwalk Gull (pineapple behavior), Rooftop Antenna (brick behavior), Festival Spark (pepper behavior), and Neon Glitch (rolling-pin behavior). Each is introduced with a named warning and uses the established collision and dodge rules.
- Distinct arrival stingers and world-specific musical arrangements for each world, using the existing synthesizer and audio settings.
- Community Shift milestone display reads the real anonymous aggregate run count from the existing `GET /api/run?days=7` endpoint. It shows an offline state if telemetry is unavailable. It does not fabricate counts or promise a global reward.
- Share action creates a seeded daily score-target challenge using `?daily=1&seed=YYYY-MM-DD&beat=`. Shared links preserve the UTC seed, item sequence, and daily modifier.
- Golden Ticket collection and Golden Pan unlock from the recovered prototype. Five tickets unlock the Golden Pan; existing coin milestones remain intact.
- Local return tracking stores login streak and total run count. Existing anonymous aggregate run telemetry in `api/run.js` remains the server-side measurement source.

## Storage and compatibility

New local state uses `ppp_retention_v1`. Existing coin state remains `ppp_coins`. Weekly contracts remain in `ppp_weekly_v1`. Golden Ticket and owned-pan state keep their existing keys. No player data migration or account identity is required.

Daily and weekly schedules use UTC to avoid timezone-dependent reward duplication. Local progression does not sync across devices. Server-side aggregate telemetry is anonymous and is not a cross-device player profile.

## Validation

- `node --check js/retention3.js`
- `node --test js/retention3.test.mjs` (10 tests)
- Inline game scripts extracted from `play.html` and syntax-checked with Node.
- `git diff --check`
- Existing FX tests pass with the repository's declared Three.js 0.180.0 test dependency.

Full browser QA is not yet complete.

## Remaining work before calling this a complete 3.0 release

- Signature collectibles, collection tracking, and five themed hazard encounters are implemented. The rotating world challenges are separate progression objectives.
- Additional ambience layers, transitions, and the broader sensory pass beyond the five world arrangements and arrival stingers.
- Daily challenge share payloads that preserve the exact deterministic daily seed, plus a proper friend result card.
- The community milestone display uses real aggregate run telemetry. A shared server-side reward or unlock is not implemented.
- Full browser QA across portrait, landscape, touch, gamepad, reduced motion, and WebGL fallback, including the production build.
- Cross-device identity/progression is intentionally not included. It requires a privacy-conscious account or sync decision and backend support.

Meshy is not part of this implementation. Existing and procedural assets are used.
