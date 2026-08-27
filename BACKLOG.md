# Backlog — Pietro's Pizzeria Panic

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

## Needs a business decision before implementing

- [ ] **Real monetization.** The only revenue path today is a voluntary Stripe donate button ($0 raised so far, confirmed). Top F2P games monetize primarily through rewarded video ads (opt-in "watch ad to continue/2x score") and light IAP (cosmetics, remove-ads). Neither exists here. This needs: which ad network (AdMob, etc.), a decision on whether rewarded ads fit the brand, and new account/SDK setup — not something to wire up blind.
- [ ] **Paid or ad-based "continue"** after game over — common, effective retention+monetization lever in this genre. Needs a decision on mechanism (ad-gated vs. small paid continue) before building.
- [ ] **Leaderboard seasons/resets.** Right now it's an evergreen top-10, which becomes an unreachable wall for new players once populated. A weekly-reset board (keeping an all-time board too) is standard practice but is a real schema/UX change — worth doing once there's actual traffic to protect.

## Nice-to-have, lower priority

- [ ] Guided first-run tutorial beyond the current static instructions (the difficulty curve already ramps gently, so this is polish, not urgent).
- [ ] Art/asset pass if budget allows — current pixel-art Pietro + canvas effects are already solid, but a professional illustrator pass would raise production value further.

## Explicitly out of scope tonight

Ad network integration and any real-money continue mechanic were not implemented — both involve business/brand decisions and new third-party accounts that shouldn't be set up without explicit sign-off.
