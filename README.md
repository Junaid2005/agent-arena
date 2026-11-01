# AGENT ARENA

Multiplayer paintball inside a hand-built 3D interpretation of the DevDay Exchange hackathon venue.

**Play:** https://ghost-arena-theta.vercel.app
**Server health:** https://ghost-arena-theta.vercel.app/api/health

Enter a name and play. Everyone joins one public arena, with 12 concurrent seats. Weapon damage determines how many hits eliminate a player; respawns take three seconds. The game runs continuously: there are no room codes, match timers or automatic score resets. Scores last while the player’s server identity remains available. Disconnecting reserves the identity for 30 seconds; Vercel instances recover shared state from Redis.

## Play as a Codex pet

Choose one of nine built-in Codex pets as your playable character before entering. Your choice is previewed in the lobby, remembered on this device, and sent to the server so every player sees the same character. Pets animate while idle, running, jumping, diving and stumbling, and keep their identity after elimination, respawn and reconnect. All characters share the same movement, health, hitbox and firing rules. There is no separate humanoid or companion, and shots require player input.

Both frontend and server must be updated together. Older server versions ignore pet selection; the client reports a failed character load instead of silently substituting Codex.

The arena requires a live server connection; there is no offline mode.

## Random gun game

Everyone starts with a random weapon. Each server-confirmed elimination immediately rolls a different gun from the eight-weapon arsenal. Hits do not reroll; death, respawn and reconnect keep your current gun. Hold FIRE with any weapon; ammo is unlimited. The HUD shows a matching weapon silhouette and ammunition icon, cadence, range and handling tip, and announces each kill swap. Held guns use compact low-poly models; bullets have copper tips and distinct sizes, shotgun pellets trail colourful confetti, lasers have energy cores, rockets have fins and exhaust, and the fart cannon emits expanding gas puffs. Bullet travel effects are cosmetic; hitscan damage and rocket flight remain server-authoritative.

| Weapon | How it plays |
| --- | --- |
| Pocket Pistol | Accurate three-tap, 280 ms between shots |
| Paintstorm AR | Automatic fire, slight spread, 160 ms cadence |
| Pocket Shredder SMG | 80 ms cadence, wider spread, 24 m range |
| Big Peep Sniper | Accurate one-shot, 1.3 second cooldown |
| Party Crasher RPG | Rockets travel at 20 m/s; 4 m splash, lethal within 2 m |
| Disco Laser | Accurate beams every 120 ms |
| Silent But Deadly | Two-damage, 6 m forward stink cone every 650 ms |
| Confetti Catastrophe | Seven pellets every 800 ms, each deals one damage |

Rockets explode at their traced impact point after flight time, giving targets time to move. Splash and fart cones respect cover and spawn protection, can hit several opponents, and spare their shooter. Each victim earns one score and one roll. All live damage, random assignments and kill rolls are server-owned; the browser only sends controls. The frontend and multiplayer authority must use the same weapon protocol.

## Live commentary

The standalone local server can run a live shoutcaster on the public arena. Vercel commentary integration is deferred. It watches kills, streaks, dives, camping and the general state of the match, then speaks short hype lines as 16 kHz PCM audio and captions through the same Socket.IO room. The audio is generated with the Deepgram Voice Agent API and is broadcast to everyone in the arena, so all players hear one shared cast.

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

Next.js App Router, React Three Fiber/Three.js, Drei, Rapier and Zustand. Production uses native WebSockets on Vercel Functions with Upstash Redis checkpoints, pub/sub and a fenced leader lease. One Node instance simulates at approximately 25 Hz; other instances relay inputs and snapshots. Connections recycle before the function duration limit and automatically resume. Local development retains the standalone Socket.IO server. Clients send sequenced inputs, predict movement using the shared simulation and reconcile acknowledged inputs; remote avatars interpolate. The server owns positions, movement bounds, collisions, hitscan, fire cooldown, health, scores and knockdown state. Player resume tokens stay in sessionStorage. There are no accounts; Redis stores temporary arena state.

Playable characters are camera-facing animated pet sprites using the built-in 8-column, 9-row sheets. The client has a stable Rapier capsule and static colliders. Authoritative movement uses shared kinematic collision rules. Hitscan uses authoritative boxes, with conservative ramp bounding boxes.

## Venue

The arena now uses PR #13's Hoxton Docks floor plan: a human-scale, photo-informed reconstruction with the high bay, main hall and event stage, Canal Room, Atrium, entrance, courtyard, yard and parking. One unit is one metre at the drawing's published 1:200/A3 calibration. Exact placement, heights and unmeasured details remain estimates; this is not a surveyed digital twin.

The game stays at `/`, with playable pets, matching weapon/ammunition art and Vercel/Redis multiplayer. `/paintball` redirects to the game. `/venue` provides a top-down/orbit review with the source plan overlay; `/tour` preserves the standalone walk-through supplied by the map author. Neither review route changes the game's live-server requirement or restores practice mode.

Architecture, event furniture, open entrance leaves, stage and locked-room panels share rotated collision boxes across Rapier, authoritative movement, camera clearance and hitscan. Diving uses substeps to prevent tunnelling through thin partitions. Rooms 4, 7, 8 and 10 remain locked; all twelve spawns are in public areas clear of furniture. The map and backend geometry must be deployed together, and existing Redis arena state must use a fresh map-version namespace to avoid resuming old positions.

The source plan is served at `/venue/hoxton-ground-floor.webp`. See [geometry notes](docs/venue-geometry.md) and [map MVP notes](docs/venue-mvp.md) for calibration, photo-supported details and remaining limits. The original 311 MB video stays excluded from uploads; no automated photogrammetry is claimed.

`NEXT_PUBLIC_VENUE_URL` optionally overlays a GLB; scale and Y rotation are configurable. Align manually defined authoritative colliders with imported geometry. Use a CORS-enabled asset host.

## Outstanding work

**Photo-generated avatars are not enabled.** No completed generated photo mesh or successful provider call is claimed. Gameplay currently uses pet sprites. Photo meshes, trusted asset registration, upload UI, provider calls and storage would require a separate implementation and end-to-end testing.

Provider research (1 November 2026): [Meshy image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) supports textured GLB, A-pose, 2K textures and target polygon count. [Rigging](https://docs.meshy.ai/en/api/rigging) supports clearly defined textured humanoids and optional basic walk/run outputs. Meshy models face +Z; this game faces −Z, so an orientation adapter is needed. [Pricing](https://docs.meshy.ai/en/api/pricing) lists 30 credits for Meshy 7.1 generation with 2K textures and 5 for automatic rigging; extra animation actions cost extra. Generation latency and skeleton compatibility have not been measured in this project.

Required: a server-only provider key with credits, S3/R2 credentials, public CORS-enabled asset storage, validated photo upload and confirmation, genuine progress polling, durable GLBs, generation-ID caching, rigging/animation integration, error/retry handling and default-avatar fallback. Do not persist expiring provider URLs as permanent avatar assets. Keep the game playable during generation.

Full ragdoll simulation and spectator mode are also pending. The final two-human test on physical devices has not been performed by the agent; automated browser checks do not replace that test.

## Automatic deployment and checks

Vercel is connected to `Junaid2005/codex-paintabll` through its GitHub app, with automatic Git deployments enabled and Node 24 configured. The production branch is `feat/ghost-arena` (the repository’s default branch). Pushes and merged PRs to that branch publish to https://ghost-arena-theta.vercel.app; other branches receive previews. Manage the connection in [Vercel Git settings](https://vercel.com/junaid2005s-projects/ghost-arena/settings/git). No Vercel token is stored in GitHub.

`.github/workflows/ci.yml` runs type checking, simulation/combat tests and a production build on pushes and pull requests. Vercel’s native build and this CI check run independently; branch protection can require the CI check before merging. Fork deployment authorization remains managed by Vercel.

Production game routes and frontend deploy together. CI also exercises two separate WebSocket servers against Redis, including owner retirement and eight clients.

## Deployment

The frontend and authoritative multiplayer run on Vercel in `iad1`, alongside the Upstash Redis region. Link the Upstash free integration to Production and Preview; keep automatic paid upgrades disabled. Set server-only `REDIS_URL` (or `KV_URL`) to its TLS Redis URL. Leave `NEXT_PUBLIC_SERVER_URL` unset in production to use same-origin `/api/arena` WebSockets. Health is `/api/health`.

```sh
vercel deploy --prod --yes
```

Vercel Functions support WebSockets but do not provide persistent shared memory. The Redis lease prevents two active simulations; fenced checkpoints preserve private player tokens and scores across instance changes. Preview state is isolated by branch; production deployments share state. Temporary disconnects reserve identities for 30 seconds. Idle arena checkpoints expire after 12 hours. Free Redis quotas limit sustained traffic; this MVP still needs longer production soak/load testing.

For local distributed testing, run Redis on port 6387 and `npm run test:distributed`. `TEST_VERCEL_URL=https://your-deployment TEST_MVP_SMOKE=1 npm run test:vercel` performs the short two-client production smoke test. Omit the smoke flag for the longer combat fixture on an empty test arena. Protected deployments can supply server-side `TEST_VERCEL_BYPASS`.

Legacy VPS deployment scripts remain for reference; production no longer requires that host after cutover. Do not commit `.env` files, API keys, generated deployment credentials or source video. The status file records completed checks and remaining gaps.
