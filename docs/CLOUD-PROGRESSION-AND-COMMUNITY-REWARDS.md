# Cloud Progression and Community Rewards

## Player cloud saves
- Optional recovery-code save, no email or mandatory account.
- 128-bit random hexadecimal recovery code. The server stores a SHA-256-derived Redis key, not the raw code.
- Progress snapshot is restricted to `ppp_` local-storage keys, excludes cloud credentials, and is capped at 48 KB.
- Existing gameplay remains local-first. A linked save syncs after local progress writes and on a 30-second interval.
- Save writes use an atomic revision check. If another device has saved newer progress, the stale device restores the newer cloud copy rather than silently overwriting it.
- Keep the recovery code private. Anyone holding it can access the save. There is no email-based recovery.

## Community milestones
- Each newly accepted anonymous run increments a lifetime Redis counter once, using existing signed run-session deduplication.
- Milestones: 1,000 / 5,000 / 10,000 / 25,000 / 50,000 / 100,000 runs.
- Rewards: 25 / 50 / 75 / 100 / 150 / 250 Pizza Coins.
- Rewards are claimed per cloud save and protected by an atomic Redis Lua operation, preventing duplicate claims across devices.
- Counting begins when this feature deploys. Earlier telemetry is not retroactively added.
- Community rewards require a cloud save. The game remains playable without one.
