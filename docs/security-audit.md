# Targeted security audit — 2 November 2026

Scope: this repository, the `ghost-arena-server` game container, its deployment files, and its public HTTPS/WebSocket endpoint. Other applications on the shared VPS were not modified. This is a point-in-time vulnerability/configuration review, not a full host penetration test or a claim of complete security.

## Findings and fixes

| Finding                                                                                                              | Action and verification                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original container had 22 vulnerability matches, including vulnerable npm-bundled dependencies and BusyBox utilities | Removed unused shell/base utilities, npm, yarn and apk from the final runtime. Grype 0.121.0 reports zero matches on the actual rebuilt VPS image. Distro metadata is retained so scanning still identifies Alpine packages correctly.                                            |
| Container installs ignored the committed lockfile                                                                    | Multi-stage build uses `npm ci` for the server workspace. Base image is pinned by digest. Tests and development tooling are excluded.                                                                                                                                             |
| Connections could remain open without joining; proxy clients shared a single rate-limit identity                     | Added join/Socket.IO deadlines, bounded per-IP attempt tracking, 24 connections per IP and 128 globally. Trust forwarded IPs only from loopback/the Docker gateway; Caddy replaces untrusted forwarded headers. Unit and HTTP/WebSocket integration tests cover these boundaries. |
| Runtime/deployment safeguards were incomplete                                                                        | Added process/file limits, Docker init, bounded log rotation, startup health waiting and private app-directory/script permissions. Kept non-root execution, read-only filesystem, dropped capabilities, no-new-privileges, CPU/RAM limits and loopback publishing.                |
| Retired multiplayer/cloud code increased maintenance and dependency surface                                          | Removed Redis coordinator, old native protocol/fixtures, Vercel Functions SDK, unused AWS SDK, export helper and unused exports/assets. Knip now passes.                                                                                                                          |
| No shared lint/format/security automation                                                                            | Added ESLint 10 and React hooks rules, Prettier, Knip, EditorConfig, npm audit, checksum-pinned Gitleaks/Grype scripts, pinned GitHub Actions and weekly Dependabot updates.                                                                                                      |
| Newly added lint tooling pulled a vulnerable minimatch release                                                       | Override to patched minimatch 11.0.3. Clean install, lint and audit pass; zero npm findings including development dependencies.                                                                                                                                                   |
| Missing browser hardening headers                                                                                    | Added nosniff, referrer/permissions policies and CSP restrictions on frames, base URLs and objects. Game responses disable caching and enable HSTS.                                                                                                                               |

## Verification

- Full Git-history scan: Gitleaks 8.30.1, zero findings, redaction enabled. The maintenance script also scans staged changes before committing.
- Repository and original application dependency audit: zero npm findings. The broader container scan found additional bundled/OS packages missed by npm audit.
- Original runtime: 22 Grype matches. Final runtime: zero known matches, without suppression/ignore rules. Machine-readable summary: [security-scan.json](security-scan.json).
- 67 unit tests, four security integration tests, fresh-server nine-client network fixture, type checking, ESLint, Prettier, Knip, Bash ShellCheck and production build.
- Exact hardened image tested on an isolated VPS port with nine clients: navigation, combat, scores/weapons, respawn, malformed input, reconnect/takeover.
- External probes could not connect to ports 3011, 3012 or 2019. TLS 1.1 was rejected. Caddy continues to terminate public HTTPS/WSS.
- Outbound provider TLS works with the stripped runtime; commentary credentials remain only in the private VPS environment file.

## Operational boundaries

The arena is intentionally public and has no accounts. Limits reduce simple abuse; they do not provide DDoS protection or prevent coordinated clients occupying its 12 seats. Several players behind one NAT share the per-IP allowance. The Docker gateway trust list assumes the current bridge network; review it if deployment networking changes.

No host-wide firewall, SSH policy or unrelated service was changed. Other listening services observed on the VPS are outside this audit's scope. Secrets injected as container environment variables remain readable by the host/Docker administrator, so access to Docker and SSH must remain trusted.

Re-run `npm run audit`, `npm run security:secrets`, and `bash scripts/scan-image.sh <image>` regularly. CI fails on moderate-or-higher npm advisories, any detected secret, or high-or-higher runtime vulnerability. Scanner binaries are downloaded from pinned releases and verified with committed SHA-256 checksums. CI requires public access to vendor vulnerability databases; it fails if scans cannot complete.
