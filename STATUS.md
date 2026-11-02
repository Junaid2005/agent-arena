# Agent Arena status

Updated: 2 November 2026.

- Public game: https://agent-arena-paintball.vercel.app
- Frontend: Next.js on Vercel; Git auto-deploys from `feat/ghost-arena`.
- Backend: authoritative 25 Hz Node/Socket.IO server on the VPS. One continuous arena, 12 seats. No Redis dependency.
- Venue: manually reconstructed Hoxton Docks map with shared visual/collision geometry.
- Desktop keyboard/mouse and mobile move/aim/fire controls; pet character selection; eight randomized weapons, server-owned hits, scores, respawns and reconnects.
- Deepgram commentary key is stored privately on the VPS. Real generated audio and captions were verified after transfer.

## Cleanup and security

- Removed the obsolete Redis implementation/protocol/tests, unused AWS/Vercel SDKs, old export script and unused exports.
- Added ESLint/React hooks checks, Prettier, EditorConfig, Knip, dependency audit, secret scanning, container scanning and weekly dependency updates. CI exercises fresh local multiplayer servers; no paid API calls or production players are involved.
- Added connection-attempt/concurrency limits, trusted-proxy IP validation, join deadlines, session-token validation and HTTP security headers.
- Production image installs from the lockfile, excludes tests/development tooling, and contains no shell or package managers. Runtime is non-root, read-only, loopback-only and bounded by CPU, memory, process/file and log limits.
- Original runtime: 22 vulnerability matches. Hardened runtime: zero known matches using Grype 0.121.0. npm audit and Git-history secret scan also report zero findings. See [audit report](docs/security-audit.md).
- Type checking, linting, formatting, dead-code analysis, 67 unit tests, four security integration tests and the nine-client game fixture pass. The actual hardened image also passed the nine-client fixture on a separate VPS test port.

## Remaining limitations

- Photo-to-3D avatars, full simulated ragdolls and spectator mode are not implemented. Current pets are animated sprites.
- Venue geometry is approximate. No two-human physical-device acceptance test is claimed.
- Server restarts reset temporary game state. Server deployment remains explicit; Vercel Git deployment updates only the frontend.
- This was a targeted application/container audit, not a full VPS penetration test or a guarantee that no vulnerabilities exist. Unrelated hosted services and the host-wide firewall/SSH policy were not changed.
