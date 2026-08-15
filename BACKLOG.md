# Backlog — Pietro's Pizzeria Panic

Living list from a full audit against genre best practices (endless arcade catchers: Fruit Ninja, Crossy Road, Stack) and top-earning F2P retention/monetization patterns. See session notes for full reasoning.

## Done (2026-08-15)

- [x] **Leaderboard anti-cheat.** Previously anyone could POST a fake top score directly to `/api/leaderboard` with zero gameplay — no validation existed at all. Added a signed session token (`/api/session`) issued at game start; submissions now require it and are checked against a minimum-plausible-elapsed-time for the claimed score. Verified with automated tests (no token, fake signature, and implausibly-fast submissions all correctly rejected; legitimate timed submissions succeed).
- [x] **Personal best tracking.** Nearly universal in this genre (Flappy Bird, etc.) and was entirely missing. Now tracked in localStorage and shown on the start screen.
- [x] **Daily streak.** Classic F2P "come back tomorrow" retention hook. Tracks consecutive calendar days played, shown on start screen, grants a small starting-shield bonus at 2+ days. No account system needed.
- [x] **Near-miss messaging on game over.** Shows "X points from your best" or "X points from the leaderboard" — proven re-engagement hook, previously absent.

## Needs a business decision before implementing

- [ ] **Real monetization.** The only revenue path today is a voluntary Stripe donate button ($0 raised so far, confirmed). Top F2P games monetize primarily through rewarded video ads (opt-in "watch ad to continue/2x score") and light IAP (cosmetics, remove-ads). Neither exists here. This needs: which ad network (AdMob, etc.), a decision on whether rewarded ads fit the brand, and new account/SDK setup — not something to wire up blind.
- [ ] **Paid or ad-based "continue"** after game over — common, effective retention+monetization lever in this genre. Needs a decision on mechanism (ad-gated vs. small paid continue) before building.
- [ ] **Leaderboard seasons/resets.** Right now it's an evergreen top-10, which becomes an unreachable wall for new players once populated. A weekly-reset board (keeping an all-time board too) is standard practice but is a real schema/UX change — worth doing once there's actual traffic to protect.

## Nice-to-have, lower priority

- [ ] Guided first-run tutorial beyond the current static instructions (the difficulty curve already ramps gently, so this is polish, not urgent).
- [ ] Direct "beat my score" challenge links (prefill a friend's target score via URL param) — cheap addition to the existing share flow.
- [ ] Art/asset pass if budget allows — current pixel-art Pietro + canvas effects are already solid, but a professional illustrator pass would raise production value further.

## Explicitly out of scope tonight

Ad network integration and any real-money continue mechanic were not implemented — both involve business/brand decisions and new third-party accounts that shouldn't be set up without explicit sign-off.
