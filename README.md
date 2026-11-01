# HOXTON DOCKS / SPATIAL SIMULATOR

The default route is a first-person walk-through of Hoxton Docks. Horizontal geometry uses the venue drawing’s published **1:200 at A3** calibration; one world unit represents one metre. Camera eye level is **1.65 m** and walking speed **1.4 m/s**. Rooms 1/2 include the timber bay, photo-supported finishes, event furniture and DevDay/OpenAI backdrop. Room 5 adds the Atrium’s pitched roof, dual skylights, trusses, crane gear, factory windows and furniture. Exact placement and unmeasured dimensions remain estimates.

The Boat Space has a **5.5 m ceiling** according to the brochure prose (the drawing says 5.6 m). The lower hall uses that 5.5 m reference. Room 1 now has tall timber doors and a separate raised masonry/glazing assembly, with an explicitly provisional 8 m upper roof. Other unsurveyed heights remain estimates. This is an illustrative-plan reconstruction, not a surveyed digital twin.

## Run the simulator

Use Node 24 and npm from the repository root:

```sh
npm ci
npm run dev
```

The tour runs at `http://localhost:3000` without a game server, account, network session or database. Select **Enter the venue**. Walk with WASD/arrows; look with the mouse; Shift walks faster; Esc releases the mouse. Touch devices have walking arrows and drag-to-look. The room selector and **Return to entrance** provide navigation shortcuts. Movement is constrained by the traced walls and columns.

Open `/venue` for top-down/3D plan review, the source overlay and metric grid. [Geometry notes](docs/venue-geometry.md) record the calibration and its limitations. Photos/materials, surveyed vertical dimensions, roof profiles, stair traversal and fixtures remain future work. No production deployment is included in this branch.

```sh
npm run typecheck
npm test
npm run build
```

## Retained paintball implementation

The previous paintball source and server remain in the repository for reference, but the default page now runs the standalone tour. `npm run dev:paintball` starts the original pair of development processes; the default frontend remains the simulator. The prior deployed game is at https://ghost-arena-theta.vercel.app and has not been updated by these local changes. The following architecture/deployment notes describe that retained implementation.

## Codex buddies

Before entering, choose a built-in ChatGPT Pet as your arena buddy. The selected pet follows its owner, fires a deliberately slow server-authoritative assist shot at nearby visible opponents, and credits any elimination to its owner. Pets vanish with their owner on elimination and return after respawn. The lobby uses the official Pet sprite sheets; the selected pet is carried in the join request so every player sees the same companion.

## Contributing

Use Node 24 and npm. Clone this repository and install from the root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. A separate Socket.IO server runs on port 3001. Multiple local browser tabs join the same local arena. Copy `.env.example` to `apps/web/.env.local` to override the server URL or load an optional venue GLB. Set server variables in the server process environment.

```sh
npm run typecheck
npm test
npm run test:network
npm run build
```

`test:network` creates eight real clients, navigates through venue doors using input commands, and tests authoritative combat, score synchronization, respawn, invalid input rejection, reconnect identity and the shared arena. Run it against a fresh local server so existing human players do not occupy its test spawn positions. It takes about 20–45 seconds. Never run combat fixtures in an occupied public arena.

Please use feature branches and pull requests. Useful contribution areas:

- Venue fidelity: shared geometry in `packages/shared/src/constants.ts`, rendering in `apps/web/components/game/Arena.tsx`.
- Mobile feel and performance: `MobileControls.tsx`, `useControls.ts`, `Scene.tsx`.
- Genuine photo-to-3D avatars and object storage (see outstanding work below).
- Humanoid animation, skinning and compatible elimination ragdolls.

## Controls

Desktop: WASD to move, click the arena to lock the mouse, mouse to aim, hold left click to fire, Space to jump, Shift to dive, R to stumble, Tab for scores, Esc to release the cursor.

Mobile: left joystick to move, drag the right half to aim, hold FIRE to shoot. Jump and dive have their own buttons. Landscape is recommended. The game menu includes fullscreen, sound, scores and leaving the arena. Sound effects include marker pops, pet shots, paint splats, hit/elimination confirmation, damage, respawn, footsteps, jumps, landings, dives and stumbles. Nearby shots and impacts fade with distance and pan with your aim. Audio starts after interaction; Mute silences all effects, including sounds already playing. Effects are synthesized locally with Web Audio and require no downloads.

## Architecture

Next.js App Router, React Three Fiber/Three.js, Drei, Rapier and Zustand. The persistent Node/Socket.IO server simulates at 25 Hz. Browser clients currently use Socket.IO long polling for reliable connectivity; the server also supports WSS, which is exercised by the network test. Clients send sequenced inputs, predict movement using the shared simulation and reconcile acknowledged inputs; remote avatars interpolate. The server owns positions, movement bounds, collisions, hitscan, fire cooldown, health, scores and knockdown state. Player resume tokens stay in sessionStorage. There are no accounts or databases.

The default humanoid has articulated joints and cosmetic wobble, stride, dive, stumble, recoil and elimination collapse. This is **not a fully simulated ragdoll**. The client has a stable Rapier capsule and static colliders. Authoritative movement uses shared kinematic collision rules. Hitscan uses authoritative boxes, with conservative ramp bounding boxes.

## Venue

The ground-floor blockout is traced from the venue's September 2025 credentials deck, page 5, using its published **1:200 at A3** scale. One game unit is one metre at that drawing scale. The model follows the irregular envelope, rooms, courtyards and door gaps; renderer, movement, camera collision and shooting share the same rotated walls. Temporary event furniture and speculative decoration have been removed while geometry is reviewed.

Open **`/venue`** (also linked from the lobby) for a top-down/3D review, 1 m grid and source-plan overlay. [Geometry notes](docs/venue-geometry.md) record the scale calculation, source, assumptions and unfinished details. The source is illustrative: this is not a surveyed digital twin. Ceiling heights, wall thicknesses and ambiguous openings need verification. The earlier event plan remains at `/venue/floorplan.webp`; the architectural reference is `/venue/hoxton-ground-floor.webp`.

The 311 MB source video stays local and is excluded from Git, Vercel and Docker uploads. Photo/material reconstruction is deferred.

`NEXT_PUBLIC_VENUE_URL` optionally overlays a GLB; scale and Y rotation are configurable. Align manually defined authoritative colliders with imported geometry. Use a CORS-enabled asset host.

## Outstanding work

**Photo-generated avatars are not enabled.** No completed generated photo mesh or successful provider call is claimed. The existing character loader supports textured GLBs, embedded clips, skeleton-safe cloning and height normalization, but trusted asset registration, upload UI, provider calls and storage still need implementing and end-to-end testing.

Provider research (1 November 2026): [Meshy image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) supports textured GLB, A-pose, 2K textures and target polygon count. [Rigging](https://docs.meshy.ai/en/api/rigging) supports clearly defined textured humanoids and optional basic walk/run outputs. Meshy models face +Z; this game faces −Z, so an orientation adapter is needed. [Pricing](https://docs.meshy.ai/en/api/pricing) lists 30 credits for Meshy 7.1 generation with 2K textures and 5 for automatic rigging; extra animation actions cost extra. Generation latency and skeleton compatibility have not been measured in this project.

Required: a server-only provider key with credits, S3/R2 credentials, public CORS-enabled asset storage, validated photo upload and confirmation, genuine progress polling, durable GLBs, generation-ID caching, rigging/animation integration, error/retry handling and default-avatar fallback. Do not persist expiring provider URLs as permanent avatar assets. Keep the game playable during generation.

Full ragdoll simulation and spectator mode are also pending. The final two-human test on physical devices has not been performed by the agent; automated browser checks do not replace that test.

## Automatic deployment and checks

Vercel is connected to `Junaid2005/codex-paintabll` through its GitHub app, with automatic Git deployments enabled and Node 24 configured. The production branch is `feat/ghost-arena` (the repository’s default branch). Pushes and merged PRs to that branch publish to https://ghost-arena-theta.vercel.app; other branches receive previews. Manage the connection in [Vercel Git settings](https://vercel.com/junaid2005s-projects/ghost-arena/settings/git). No Vercel token is stored in GitHub.

`.github/workflows/ci.yml` runs type checking, simulation/combat tests and a production build on pushes and pull requests. Vercel’s native build and this CI check run independently; branch protection can require the CI check before merging. Fork deployment authorization remains managed by Vercel.

The persistent multiplayer server is deployed separately. A Vercel frontend deployment does not update server-side gameplay changes on the VPS.

## Deployment

The frontend runs on Vercel; the authoritative server runs as an isolated Docker container on the configured VPS. The deployed Next.js dependency is 16.4.3. The public frontend origin must exactly match `CORS_ORIGIN` on the server.

```sh
vercel deploy --prod --yes \
  --build-env NEXT_PUBLIC_SERVER_URL=https://ghost-arena.162.19.137.169.sslip.io
```

`scripts/deploy-server.sh` uploads only source/manifests and builds `ghost-arena-server:latest`. On the VPS, `~/ghost-arena/server.env` supplies `PORT=3011` and allowed origins. `scripts/start-production.sh` starts the container on `127.0.0.1:3011`, with a restart policy, read-only filesystem and CPU/memory limits. Caddy supplies HTTPS/WSS. Updating the server restarts in-memory gameplay.

`scripts/ensure-proxy.py` adds only the GHOST ARENA hostname through Caddy’s local admin API. A user cron job restores this route within one minute of a Caddy reload or reboot; other hosted routes are retained. The demo relies on sslip.io DNS. An owned domain and a permanent Caddyfile entry are preferable after the hackathon. No paid hosting purchase was made.

Do not commit `.env` files, API keys, generated deployment credentials or source video. The status file records completed checks and remaining gaps.

## Downloadable simulator

Run `node scripts/export-tour.mjs` after `npm ci` to regenerate `artifacts/hoxton-docks-simulator.html`. This bundles the tour, review view and source-plan image into one HTML file. Furniture is visible by default; use **Show furniture** / **Solid furniture** to control visibility and obstruction while inspecting. The evidence and accuracy limits for the current photo pass are in [room 2 survey](docs/room-02-photo-survey.md).

The Atrium eaves/ridge are provisional at 5.5 / 7.5 m. See [room 5 evidence and estimates](docs/room-05-atrium.md); photos establish the structural features but not measured heights or exact furniture counts.
