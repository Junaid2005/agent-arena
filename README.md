# AGENT ARENA

Multiplayer paintball inside a hand-built 3D interpretation of the DevDay Exchange hackathon venue.

**Play:** https://agent-arena-paintball.vercel.app
**Server health:** https://agent-arena-paintball.vercel.app/api/health

Enter a name and play. Everyone joins one public arena, with 12 concurrent seats. Weapon damage determines how many hits eliminate a player; respawns take three seconds. The game runs continuously: there are no room codes, match timers or automatic score resets. Scores last while the player’s server identity remains available. Disconnecting reserves the identity for 30 seconds; Server restarts reset the temporary arena state.

## Play as a Codex pet

Choose one of nine built-in Codex pets as your playable character before entering. Your choice is previewed in the lobby, remembered on this device, and sent to the server so every player sees the same character. Pets animate while idle, running, jumping, diving and stumbling, and keep their identity after elimination, respawn and reconnect. All characters share the same movement, health, hitbox and firing rules. There is no separate humanoid or companion, and shots require player input.

Both frontend and server must be updated together. Older server versions ignore pet selection; the client reports a failed character load instead of silently substituting Codex.

The arena requires a live server connection; there is no offline mode.

## Random gun game

Everyone starts with a random weapon. Each server-confirmed elimination immediately rolls a different gun from the eight-weapon arsenal. Hits do not reroll; death, respawn and reconnect keep your current gun. Hold FIRE with any weapon; ammo is unlimited. The HUD shows a matching weapon silhouette and ammunition icon, cadence, range and handling tip, and announces each kill swap. Held guns use compact low-poly models; bullets have copper tips and distinct sizes, shotgun pellets trail colourful confetti, lasers have energy cores, rockets have fins and exhaust, and the fart cannon emits expanding gas puffs. Bullet travel effects are cosmetic; hitscan damage and rocket flight remain server-authoritative.

| Weapon               | How it plays                                            |
| -------------------- | ------------------------------------------------------- |
| Pocket Pistol        | Accurate three-tap, 280 ms between shots                |
| Paintstorm AR        | Automatic fire, slight spread, 160 ms cadence           |
| Pocket Shredder SMG  | 80 ms cadence, wider spread, 24 m range                 |
| Big Peep Sniper      | Accurate one-shot, 1.3 second cooldown                  |
| Party Crasher RPG    | Rockets travel at 20 m/s; 4 m splash, lethal within 2 m |
| Disco Laser          | Accurate beams every 120 ms                             |
| Silent But Deadly    | Two-damage, 6 m forward stink cone every 650 ms         |
| Confetti Catastrophe | Seven pellets every 800 ms, each deals one damage       |

Rockets explode at their traced impact point after flight time, giving targets time to move. Splash and fart cones respect cover and spawn protection, can hit several opponents, and spare their shooter. Each victim earns one score and one roll. All live damage, random assignments and kill rolls are server-owned; the browser only sends controls. The frontend and multiplayer authority must use the same weapon protocol.

## Live commentary

The persistent VPS server runs one live shoutcaster for the public arena. It watches kills, streaks, dives, camping and the general state of the match, then speaks short hype lines as 16 kHz PCM audio and captions through the arena connection. The audio is generated with the Deepgram Voice Agent API and is broadcast to everyone in the arena, so all players hear one shared cast.

Commentary is opt-in and server-only. Set `DEEPGRAM_API_KEY` in the server process environment to enable it. For local development, put it in `apps/server/.env.local`; `npm run dev` loads that gitignored file with `--env-file-if-exists`. The key is never sent to the browser. Commentary only connects while connected players are active, and disconnects after `COMMENTARY_IDLE_MS` of inactivity, so Deepgram bills only for connected time. `COMMENTARY_ENABLED=false` turns it off without removing the key.

## Contributing

Use Node 24 and npm. Clone this repository and install from the root:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. A separate Socket.IO server runs on port 3001. Multiple local browser tabs join the same local arena. Copy `.env.example` to `apps/web/.env.local` to override the server URL or load an optional venue GLB. Set server variables in the server process environment.

```sh
npm run check
npm run test:integration
npm run audit
npm run security:secrets
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

Next.js App Router, React Three Fiber/Three.js, Drei, Rapier and Zustand. The frontend runs on Vercel; one persistent Node/Socket.IO server on the VPS owns the 25 Hz simulation and the shared Deepgram commentary session. Clients use WSS with polling fallback, send sequenced inputs, predict movement and reconcile acknowledged inputs; remote avatars interpolate. Gameplay, inputs and audio never pass through Redis. The server owns collisions, hits, health, scores and knockdown state. Resume tokens stay in sessionStorage; disconnected identities are retained for 30 seconds. Server restarts reset arena state.

Playable characters are camera-facing animated pet sprites using the built-in 8-column, 9-row sheets. The client has a stable Rapier capsule and static colliders. Authoritative movement uses shared kinematic collision rules. Hitscan uses authoritative boxes, with conservative ramp bounding boxes.

## Venue

The current playable map and tour recreate Hoxton Docks from the supplied floor plan and photo survey. Geometry, registration and known approximations are documented in [docs/venue-geometry.md](docs/venue-geometry.md). The active plan is `/venue/hoxton-ground-floor.webp`. Collision rules and rendering share the same geometry; source video stays local and is excluded from Git and deployment uploads.

## Outstanding work

Photo-to-3D uploads and generated humanoid avatars are not implemented. Current selectable pets use animated sprites. Full simulated ragdolls and spectator mode are also pending. Two people on physical devices still need to perform the final acceptance test; automated checks do not replace it.

## Automatic deployment and checks

Vercel is connected to `Junaid2005/agent-arena` through its GitHub app, with automatic Git deployments enabled and Node 24 configured. The production branch is `feat/ghost-arena` (the repository’s default branch). Pushes and merged PRs to that branch publish to https://agent-arena-paintball.vercel.app; other branches receive previews. Manage the connection in [Vercel Git settings](https://vercel.com/junaid2005s-projects/ghost-arena/settings/git). No Vercel token is stored in GitHub.

`.github/workflows/ci.yml` runs type checking, simulation/combat tests and a production build on pushes and pull requests. Vercel’s native build and this CI check run independently; branch protection can require the CI check before merging. Fork deployment authorization remains managed by Vercel.

Production frontend deploys on Vercel; deploy server-side gameplay updates to the VPS separately. CI starts isolated Node servers for multiplayer and security integration checks.

## Deployment

The frontend runs on Vercel at https://agent-arena-paintball.vercel.app. Its Production and Preview `NEXT_PUBLIC_SERVER_URL` is `https://ghost-arena.162.19.137.169.sslip.io`. `/api/health` proxies the persistent server's `/health`; the former Redis WebSocket route returns 410 so it cannot consume Upstash commands. Production no longer requires Redis.

The VPS runs one isolated `ghost-arena-server` Docker container (one CPU, 512 MB memory limit, restart unless-stopped). It listens on loopback port 3011 behind the existing Caddy HTTPS/WSS proxy. Only this game's route and cron restorer are managed by the deployment scripts; other services remain untouched.

```sh
bash scripts/deploy-server.sh
ssh vps 'bash -s' < scripts/start-production.sh
```

Keep `PORT=3011`, `CORS_ORIGIN` (comma-separated permitted frontend origins), and server-only `DEEPGRAM_API_KEY` in `/home/ubuntu/ghost-arena/server.env` with mode 600. After changing credentials, rerun the start command to recreate the container. Vercel sensitive keys cannot be exported; copy your Deepgram key directly to this file. Missing commentary credentials do not stop gameplay.

Vercel Git deployment updates the frontend automatically. Server-side changes require the explicit VPS deployment above. Preview browser testing requires adding its exact origin to `CORS_ORIGIN`; the public production domains and localhost are already allowed.

```sh
TEST_SERVER_URL=https://ghost-arena.162.19.137.169.sslip.io TEST_ORIGIN=https://agent-arena-paintball.vercel.app npm run test:network
```

This network fixture creates nine clients and checks shared movement, combat, score, weapons, respawn, input validation and reconnects; run on an empty test arena. Avoid committing credentials, `.env` files or source video.

## Maintenance and security

`npm run lint` checks TypeScript and React hooks; `npm run format` applies the shared Prettier rules. `npm run deadcode` checks for unused files, exports and dependencies. Run `npm run check`, `npm run test:integration` and `npm run build` before a PR. Integration tests start fresh local servers with commentary disabled and never touch the public arena.

CI checks the same rules, Bash scripts, dependency vulnerabilities, Git-history secrets and the production container. Dependency/container/action updates are proposed weekly by Dependabot. GitHub Actions and container bases are pinned; scanner downloads have pinned SHA-256 checksums. The targeted audit and its limits are recorded in [docs/security-audit.md](docs/security-audit.md).

The production runtime contains no shell, npm, yarn, apk, test fixtures or development dependencies. It installs application packages from the committed lockfile. The container is non-root and read-only, with bounded memory, CPU, processes, file descriptors and log rotation. Keep backend secrets only in the VPS's mode-600 environment file. Deployment needs `rsync`, SSH, Docker, Python and curl on the configured host.
