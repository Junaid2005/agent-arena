# Current experience: Hoxton Docks simulator

The default frontend is now a standalone first-person tour. Human eye level is 1.65 m; walking is 1.4 m/s, with collision-aware desktop/touch controls and room shortcuts. The 5.5 m Boat Space ceiling reference is visible; other room heights remain provisional. No game server is required for the tour. See README and docs/venue-geometry.md. These changes are local, not deployed.

# GHOST ARENA status

Public frontend: https://ghost-arena-theta.vercel.app
Game health: https://ghost-arena-theta.vercel.app/api/health

## Completed implementation

- [x] M1: Walkable R3F arena, stable capsule movement, jumping, diving, pointer-lock camera and shooting
- [x] M2: 25 Hz authoritative Node/Socket.IO server, one public arena (12 seats), prediction/reconciliation, remote interpolation, reconnection and cleanup
- [x] M3: Validated hitscan, three-hit health, trails/impacts, muzzle flash, hit feedback, elimination feed, scores, three-second respawn and continuous play with no timer or score resets
- [x] M5 partial: Articulated default humanoid, cosmetic wobble, strides, recoil, dive, stumble and collapse; synchronized knockdown state
- [x] M6 blockout: Shared ground-floor trace at the architectural plan’s published 1:200 / A3 scale, neutral rooms/walls, rotated collisions and source-overlay review; photo/material layer deferred
- [x] M7: Responsive lobby/HUD and PUBG-style touch movement, right-side aiming, dedicated fire/jump/dive buttons
- [x] M8 deployment: Vercel frontend and native WebSocket game routes; shared Upstash Redis state, health endpoint and automatic reconnection.
- Live commentary remains available on the standalone server; Vercel commentary integration is deferred.

## Verification

- Twelve local tests pass: validation, movement/jump, every spawn, combat/respawn, wall occlusion, continuous arena, dive/stumble, published drawing scale, every doorway, diagonal walls, long-room traversal and lintel headroom.
- Type checking passes for web and server.
- Local eight-client network test passed movement through venue doors, elimination, scores, respawn, invalid input, reconnect and shared-arena joining.
- Vercel production build passed with Next 16.4.3; install audit reported zero vulnerabilities.
- Public frontend and API return HTTP 200.
- Desktop production browser entered the game.
- Eight clients passed the production WSS combat test before the continuous-arena update. Updated shared-arena eight-client test passes locally. Mobile/touch verification in progress; no physical-device test claimed.

## Known gaps / blockers

- Genuine photo-to-3D pipeline is not implemented/enabled. Meshy docs researched; provider key, prepaid credits and shared object storage credentials are missing. No fake progress/model is shown.
- Real ragdoll simulation and spectator mode are not implemented.
- Venue horizontal geometry now follows the supplied architectural drawing at its published 1:200 / A3 scale. This is illustrative, not surveyed; heights/thicknesses and ambiguous openings remain assumptions. See docs/venue-geometry.md. Optional GLBs still need aligned colliders.
- Model loading supports GLB and embedded clips but generated-model orientation, skeletal compatibility and animation acceptance remain untested.
- Longer Vercel soak/load tests remain deferred for the MVP; free Redis quotas limit sustained traffic.
- Two people on physical devices still need to play the production URL.

## Next actions

Merge the Vercel migration PR to preserve this setup on future Git deployments. Follow up with production soak/mobile checks and avatar generation when credentials are supplied.

## Floor-plan correction (local branch)

Replaced the rectangular event approximation with a shared architectural trace. Added rotated collision/hitscan/camera support and `/venue` for source-overlay review. Neutral geometry precedes the photo/material pass. Not deployed to production.

Current branch validation: web/server typecheck, 12 tests, final production build and local eight-client network test pass. Browser verified actual local-server gameplay, source-overlay controls, 3D orbit and responsive plan framing without page errors. Screenshots are local in artifacts/. No production deployment of this geometry change.

Simulator validation: all 15 tests pass (including walking speed/normalization, tall ceiling proportions, room destinations and collision); web/server typecheck and production build pass. Local browser checks verified keyboard walking, Escape mouse release, room shortcuts/reset, touch walking, and standalone rendering with no game-server requests or page errors. Screenshots: artifacts/tour-boat-space.png, artifacts/tour-atrium.png and artifacts/tour-mobile.png. No production deployment.

Photo batch 1 correction: the user identified the photos as room 2 and the tall roof zone as the dashed square 1. The model regions, room detection and navigation labels now follow that clarification. Concrete finishes cover this hall; room 2's dark roof placeholder has a cutout over square 1. The raised roof/glazing are now represented as an explicitly provisional timber/masonry/clerestory assembly; upper height is estimated at 8 m pending measurement. No new partitions or inferred wall openings. See docs/room-02-photo-survey.md. Both regions remain incomplete.

Event stage: user placed it around marker 2. Reconstructed photo-estimated platform, screen, lattice lectern, speaker stands, roll-up banners and black draping; no people, tables or chairs. Added stage navigation, shared event colliders and deck-relative first-person eye level. Sixteen tests pass, including stage step-up, screen occlusion and return to ground level. Dimensions/anchor remain explicitly photo-estimated.

Stage validation: final production build/typecheck pass. Browser entered the tour, selected Stage / room 2, approached/left the deck and reset to the entrance without page errors. Preview saved to artifacts/room-02-stage.png. Stage placement and dimensions remain estimates, not a completed room survey. No push or deployment.

Room-2 detail pass: added photo-supported masonry/concrete finishes, gate ribs/rail, roof members/column lighting, leaning red decorative panel, DevDay/OpenAI backdrop with registration table, timber-top tables, instanced folding chairs and brown lounge seating. Exact count/placement, member dimensions and original print artwork remain estimates, tracked in docs/room-02-photo-survey.md. Furniture is shown by default; solid collisions are optional. All 17 tests pass, including clear destinations and furniture collision modes.

Final detail-pass verification: production build/typecheck and 17 tests pass. Self-contained export was browser-checked for furniture visibility/solid controls, banner navigation, embedded plan overlay and mobile layout, with no page errors or external asset requests. Updated download: artifacts/hoxton-docks-simulator-detailed.html. Evidence limits and provisional placements remain documented; no production deployment.

Room 1 correction: tall paired timber doors, frame/rail/hardware, concrete header, raised brickwork, upper loading panel, clerestory/mullions, hoist chain and provisional upper roof added over square 1. Added overview shortcut and closed-door collisions. Room 5 / Atrium is the next requested photo priority. See docs/room-01-timber-bay.md.

## Auto-deployment setup

- Merged Pets PR #1 is on default branch `feat/ghost-arena` at `910277d`.
- Vercel project updated to Node 24 and Git deployment creation enabled.
- GitHub app access is authorized and Vercel is connected to `Junaid2005/codex-paintabll`, confirmed through the project API.
- Production branch: `feat/ghost-arena`. Default-branch pushes/merges publish production; other branches create previews.
- GitHub CI runs successfully with all eight tests, type checking and the production build.
- Added CI for web/server type checking, unit tests and production frontend builds.
- Corrected the existing solo-combat test fixture to keep companion fire on cooldown; player-shot and respawn assertions remain intact.

Pre-push integration: merged the latest feat/ghost-arena teammate updates, preserving pets, spatial audio and CI. Both player/pet rays use rotated venue geometry; the pet fixture now exercises a clear line in the new Atrium. All 23 combined tests, web/server type checks and the production build pass. Browser verified timber-bay views, the provisional-height label and room-5 navigation without page errors.

Room 5 / Atrium photo pass: implemented the pitched roof, two skylight runs, trusses, crane rails/hoists, linear lighting, projector, brick/factory/frosted window faces, white projection end, banners and optional-collision furniture. Both end-view shortcuts follow the plan axis. Eaves/ridge 5.5/7.5 m and portal height 3.3 m remain estimates; see docs/room-05-atrium.md. Room shortcuts and a solid-furniture central aisle are tested.

Room-5 validation: 25 combined tests, server/web typecheck and final production build pass. Standalone browser verified both end views and the solid-furniture control with no page errors. User accepted 5.5 m wall reference; ridge remains a provisional 7.5 m. Download: artifacts/hoxton-docks-simulator-room5.html.

MVP pass: added room 3's low textured ceiling, steel supports, factory windows, benches, catering setup and service objects; room 11's brick yard, festoons, picnic seating, sofas, planters and rails; and the front entrance's AVERY scale, open timber doors, banners and pressed ceiling. Locked rooms 4/7/8/10 have visible shared door collision, WC signage and no interior teleport shortcuts. Public passages are preserved. Shared masonry/concrete textures fill blank surfaces at the user's request; extrapolated finishes are documented in docs/venue-mvp.md. Room 3's full furniture-solid aisle is tested. Navigation/overlays are responsive. Initial combined verification: 28 tests, typecheck and production build passed; final browser review follows.

- Production frontend and multiplayer now deploy together on Vercel; the old VPS game service is retired.

## Landing-page scrolling

- The lobby now scrolls vertically on short laptop windows; its form and footer participate in normal layout rather than clipping below the viewport.
- The 3D background stays fixed while the lobby scrolls.
- Browser-verified at 1366×620, 1280×720 and 390×844: mouse-wheel scrolling reaches the entry button without horizontal overflow.
- Confirmed entering the arena still produces a fixed 620px-high game viewport with scrolling disabled. Web/server type checking passes.

## Vercel multiplayer MVP — 1 November 2026

- Upstash free Redis linked to production and previews, automatic paid upgrades disabled; secrets remain server-side.
- Native WSS `/api/arena`, Redis leader fencing, private checkpoints, cross-instance input/snapshot relay and reconnect identity. Production and Redis run in `iad1`.
- Type checking, 47 unit tests, two-instance/eight-client Redis integration and production build passed locally. Dependency audit: zero vulnerabilities.
- Actual Vercel candidate and public production URL both passed the short two-client smoke: health, shared movement, manual shots and reconnect identity.
- Candidate `dpl_6EGuxyKoe24AqLrRiieEwwmwgePD` promoted to the public URL. Website and game health return HTTP 200.
- Full production combat/load/long-duration testing deferred at the user's request. No two-human physical-device test claimed.
- Retired the VPS game container, its proxy-restoration cron and its Caddy route; unrelated services were left running.
- Integrated teammate pet-character and random-gun changes; updated distributed combat fixture passes. Vercel uses a new state namespace for the weapon protocol; existing sessions should reload after cutover.

## Venue MVP integration with current game

Merged the current `feat/ghost-arena` implementation into the venue branch. The simulator remains the default route; `/paintball` retains the playable-pet lobby, random weapons, spatial audio and current multiplayer UI. Redis/Vercel routes, commentary, deployment configuration and CI remain intact. Shared weapon, splash and cone occlusion now use the same rotated venue walls as movement and the camera. Weapon, commentary-zone and distributed-network fixtures follow the new drawing geometry. Worktree-local dependency installation, combined server/web type checking and all 63 unit tests passed.
