# Golden Pizza Ticket: Production Asset Brief

## Gameplay purpose

The Golden Pizza Ticket is a rare, positive in-run collectible. It adds a collection objective to normal runs and gives players a visible long-term reward without changing the core catch/stack/survive loop.

## Prototype behavior implemented on the 3.0 branch

- Begins spawning after run progress reaches 20.
- Independent low spawn chance of 0.45% per spawn cycle.
- Only one ticket can be on screen at a time.
- Falls more slowly than standard objects and uses the positive catch band.
- Catching increments the device-local lifetime counter `ppp_golden_tickets`.
- The fifth ticket unlocks the existing Golden Pan without a coin purchase. If the player already owns it, the fifth ticket grants 100 Pizza Coins.
- Every later fifth-ticket milestone grants 100 Pizza Coins.
- Pizza Book displays lifetime ticket count and the next reward.
- Existing weekly contracts, missions, wallet, leaderboard, and run score are not modified by ticket collection.
- A procedural 3D model and a dedicated 2D fallback are included. The runtime is wired to prefer `assets/props/meshy-golden-ticket.glb` when that file exists.

## Production model requirements

**One asset only:** `meshy-golden-ticket.glb`

- Target: 1,500 to 2,200 triangles.
- Target file size: under 100 KB.
- Vertex colors preferred. No external textures unless the model cannot retain its palette otherwise.
- No embedded text, lettering, logos, watermark, or extra objects.
- Rounded, chunky, toy-like proportions that match the existing Pizzeria Panic prop style.
- Silhouette: compact rectangular ticket with softly scalloped/perforated short edges, slight bevel, and a raised pizza-slice emblem in the center.
- Palette: warm metallic gold body, pale-gold inset face, tomato-red emblem ring, small basil-green detail.
- Must remain recognizable at approximately 20 to 30 screen pixels.
- Single centered object, orthographic three-quarter view, clean neutral background.
- Keep front/back thickness modest so it reads clearly while rotating in the fall.

## Meshy prompt

A single collectible golden pizza ticket for a colorful, chunky 3D mobile arcade game. Compact rectangular ticket with softly scalloped perforation edges, rounded corners, a subtle raised bevel, and one clear raised pizza-slice emblem centered on the face. Warm metallic gold body, pale gold inset face, tomato-red circular emblem detail, tiny basil-green accent. Friendly toy-like proportions, clean simple geometry, strong readable silhouette at very small mobile screen size, hand-painted game prop finish, flat-shaded stylized 3D art, isolated single object, centered, orthographic three-quarter view, plain neutral background. No text, no lettering, no numbers, no logo, no watermark, no extra objects, no base, no stand.

## Acceptance before merge

- Export GLB and record Meshy task ID and license/ownership details.
- Validate GLB structure, materials, transforms, bounds, triangle count, and byte size.
- Place the model at actual in-game scale and compare against the procedural fallback.
- Verify it renders in 3D and 2D fallback remains unchanged.
- Verify ticket spawn, catch, miss cleanup, fifth-ticket reward, repeat milestone reward, and save persistence.
- Test at mobile portrait/landscape and desktop widths.
- Keep the procedural fallback if the generated model is too heavy, unreadable, or visually inconsistent.

## Current status

The gameplay prototype and procedural 2D/3D representations are committed to `ppp-3.0-retention-expansion`. The Meshy GLB has not yet been generated or exported. The feature-branch Vercel preview currently requires Vercel authentication, so live in-game browser QA is blocked pending an authenticated preview session. No Meshy credits have been spent.
