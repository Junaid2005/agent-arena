# GHOST ARENA

Multiplayer paintball inside a hand-built 3D interpretation of the DevDay Exchange hackathon venue.

**Play:** https://ghost-arena-theta.vercel.app
**Server health:** https://ghost-arena.162.19.137.169.sslip.io/health

Enter a name and play. Everyone joins one public arena, with 12 concurrent seats. Three hits eliminate a player; respawns take three seconds. The game runs continuously: there are no room codes, match timers or automatic score resets. Scores last while the player’s server identity remains available. Disconnecting reserves the identity for 30 seconds; restarting the server resets its in-memory state.

## Play as a Codex pet

Choose one of nine built-in Codex pets as your playable character before entering. Your choice is previewed in the lobby, remembered on this device, and sent to the server so every player sees the same character. Pets animate while idle, running, jumping, diving and stumbling, and keep their identity after elimination, respawn and reconnect. All characters share the same movement, health, hitbox and firing rules. There is no separate humanoid or companion, and shots require player input.

Both frontend and server must be updated together. Older server versions ignore pet selection; the client reports a failed character load instead of silently substituting Codex.

## Live commentary

The persistent server can run a live shoutcaster on the public arena. It watches kills, streaks, dives, camping and the general state of the match, then speaks short hype lines as 16 kHz PCM audio and captions through the same Socket.IO room. The audio is generated with the Deepgram Voice Agent API and is broadcast to everyone in the arena, so all players hear one shared cast.

Commentary is opt-in and server-only. Set `DEEPGRAM_API_KEY` in the server process environment to enable it. For local development, put it in `apps/server/.env.local`; `npm run dev` loads that gitignored file with `--env-file-if-exists`. The key is never sent to the browser. Commentary only connects while connected players are active, and disconnects after `COMMENTARY_IDLE_MS` of inactivity, so Deepgram bills only for connected time. `COMMENTARY_ENABLED=false` turns it off without removing the key.

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

`test:network` creates nine real clients with distinct pet characters, navigates through venue doors using input commands, and tests authoritative combat, score synchronization, respawn, invalid input rejection, reconnect identity and the shared arena. Run it against a fresh local server so existing human players do not occupy its test spawn positions. It takes about 20–45 seconds. Never run combat fixtures in an occupied public arena.

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

Playable characters are camera-facing animated pet sprites using the built-in 8-column, 9-row sheets. The client has a stable Rapier capsule and static colliders. Authoritative movement uses shared kinematic collision rules. Hitscan uses authoritative boxes, with conservative ramp bounding boxes.

## Venue

The layout is manually traced from `hackathon-map-rev03.webp`; materials and furniture reference `PXL_20261101_115923846.mp4`. The supplied plan has no survey scale, so dimensions and irregular boundaries are approximate. The model includes stage/demos, hacking desks, food, courtyard, judges, crew and welcome areas, with floor labels, exposed brick, steel trusses, high windows, skylights, audience seats, laptops and stage lighting.

The 311 MB source video stays local and is excluded from Git, Vercel and Docker uploads. The floor plan is served at `/venue/floorplan.webp`. No automated photogrammetry reconstruction is claimed.

`NEXT_PUBLIC_VENUE_URL` optionally overlays a GLB; scale and Y rotation are configurable. Align manually defined authoritative colliders with imported geometry. Use a CORS-enabled asset host.

## Outstanding work

**Photo-generated avatars are not enabled.** No completed generated photo mesh or successful provider call is claimed. Gameplay currently uses pet sprites. Photo meshes, trusted asset registration, upload UI, provider calls and storage would require a separate implementation and end-to-end testing.

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
