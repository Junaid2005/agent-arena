# AGENT ARENA status

Public frontend: https://ghost-arena-theta.vercel.app
Game health: https://ghost-arena-theta.vercel.app/api/health

## Completed implementation

- [x] M1: Walkable R3F arena, stable capsule movement, jumping, diving, pointer-lock camera and shooting
- [x] M2: 25 Hz authoritative Node/Socket.IO server, one public arena (12 seats), prediction/reconciliation, remote interpolation, reconnection and cleanup
- [x] M3: Validated hitscan, three-hit health, trails/impacts, muzzle flash, hit feedback, elimination feed, scores, three-second respawn and continuous play with no timer or score resets
- [x] M5 partial: Articulated default humanoid, cosmetic wobble, strides, recoil, dive, stumble and collapse; synchronized knockdown state
- [x] M6: Venue reconstructed manually from the supplied floor plan and video, primitive collisions, stage ramp, room labels, furniture, brick, windows and trusses; optional GLB overlay
- [x] M7: Responsive lobby/HUD and PUBG-style touch movement, right-side aiming, dedicated fire/jump/dive buttons
- [x] M8 deployment: Vercel frontend and native WebSocket game routes; shared Upstash Redis state, health endpoint and automatic reconnection.
- Live commentary remains available on the standalone server; Vercel commentary integration is deferred.

## Verification

- Seven unit tests pass: validation, collision/movement/jump, every spawn, combat/respawn, wall occlusion, match restart, dive/stumble/ramp recovery.
- Type checking passes for web and server.
- Local eight-client network test passed movement through venue doors, elimination, scores, respawn, invalid input, reconnect and shared-arena joining.
- Vercel production build passed with Next 16.4.3; install audit reported zero vulnerabilities.
- Public frontend and API return HTTP 200.
- Desktop production browser entered the game.
- Eight clients passed the production WSS combat test before the continuous-arena update. Updated shared-arena eight-client test passes locally. Mobile/touch verification in progress; no physical-device test claimed.

## Known gaps / blockers

- Genuine photo-to-3D pipeline is not implemented/enabled. Meshy docs researched; provider key, prepaid credits and shared object storage credentials are missing. No fake progress/model is shown.
- Real ragdoll simulation and spectator mode are not implemented.
- Venue dimensions are approximate; no scale was supplied. Optional GLBs still need aligned manual collider geometry.
- Model loading supports GLB and embedded clips but generated-model orientation, skeletal compatibility and animation acceptance remain untested.
- Longer Vercel soak/load tests remain deferred for the MVP; free Redis quotas limit sustained traffic.
- Two people on physical devices still need to play the production URL.

## Next actions

Merge the Vercel migration PR to preserve this setup on future Git deployments. Follow up with production soak/mobile checks and avatar generation when credentials are supplied.

## Auto-deployment setup

- Merged Pets PR #1 is on default branch `feat/ghost-arena` at `910277d`.
- Vercel project updated to Node 24 and Git deployment creation enabled.
- GitHub app access is authorized and Vercel is connected to `Junaid2005/codex-paintabll`, confirmed through the project API.
- Production branch: `feat/ghost-arena`. Default-branch pushes/merges publish production; other branches create previews.
- GitHub CI runs successfully with all eight tests, type checking and the production build.
- Added CI for web/server type checking, unit tests and production frontend builds.
- Corrected the existing solo-combat test fixture to keep companion fire on cooldown; player-shot and respawn assertions remain intact.
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

## Hoxton map integration (PR #13)

- Imports the photo-informed venue, source plan, geometry tests, documentation and review screenshots.
- Preserves Agent Arena branding and the centered game lobby at `/`, plus pets, gun/ammo art, no practice mode and the current Vercel/Redis transport.
- Standalone walk-through at `/tour`, plan review at `/venue`, legacy `/paintball` redirects to `/`.
- Game movement, shots, camera and Rapier now share the visible event furniture/stage and rotated walls. Spawns are moved out of locked rooms and furniture.
- Geometry deployment requires a new Redis map namespace; old sessions must not restore positions from the previous map. No production deployment is included.
