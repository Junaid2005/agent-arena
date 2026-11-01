# GHOST ARENA status

Public frontend: https://ghost-arena-theta.vercel.app
Persistent server: https://ghost-arena.162.19.137.169.sslip.io/health

## Completed implementation

- [x] M1: Walkable R3F arena, stable capsule movement, jumping, diving, pointer-lock camera and shooting
- [x] M2: 25 Hz authoritative Node/Socket.IO server, one public arena (12 seats), prediction/reconciliation, remote interpolation, reconnection and cleanup
- [x] M3: Validated hitscan, three-hit health, trails/impacts, muzzle flash, hit feedback, elimination feed, scores, three-second respawn and continuous play with no timer or score resets
- [x] M5 partial: Articulated default humanoid, cosmetic wobble, strides, recoil, dive, stumble and collapse; synchronized knockdown state
- [x] M6: Venue reconstructed manually from the supplied floor plan and video, primitive collisions, stage ramp, room labels, furniture, brick, windows and trusses; optional GLB overlay
- [x] M7: Responsive lobby/HUD and PUBG-style touch movement, right-side aiming, dedicated fire/jump/dive buttons
- [x] M8 deployment: Vercel production build, persistent VPS container, HTTPS/WSS proxy, CORS and health endpoint
- [x] Live commentary: Deepgram Voice Agent shoutcaster with shared PCM audio, captions, activity-gated billing and reconnects

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
- Server restarts reset in-memory rooms. Demo DNS uses sslip.io; Caddy route restoration uses a one-minute cron job.
- Two people on physical devices still need to play the production URL.

## Next actions

Finish production single-arena/mobile checks, push one initial commit to the public GitHub repository, then enable/test avatar generation when credentials are supplied.

## Auto-deployment setup

- Merged Pets PR #1 is on default branch `feat/ghost-arena` at `910277d`.
- Vercel project updated to Node 24 and Git deployment creation enabled.
- GitHub app access is authorized and Vercel is connected to `Junaid2005/codex-paintabll`, confirmed through the project API.
- Production branch: `feat/ghost-arena`. Default-branch pushes/merges publish production; other branches create previews.
- GitHub CI runs successfully with all eight tests, type checking and the production build.
- Added CI for web/server type checking, unit tests and production frontend builds.
- Corrected the existing solo-combat test fixture to keep companion fire on cooldown; player-shot and respawn assertions remain intact.
- The VPS server is separate from Vercel’s frontend deployment pipeline.

## Landing-page scrolling

- The lobby now scrolls vertically on short laptop windows; its form and footer participate in normal layout rather than clipping below the viewport.
- The 3D background stays fixed while the lobby scrolls.
- Browser-verified at 1366×620, 1280×720 and 390×844: mouse-wheel scrolling reaches the entry button without horizontal overflow.
- Confirmed entering the arena still produces a fixed 620px-high game viewport with scrolling disabled. Web/server type checking passes.
