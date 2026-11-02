#!/usr/bin/env bash
set -euo pipefail
remote="${GHOST_SSH_HOST:-vps}"
ssh_options=(-o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=2)
# Upload only source and manifests. Never send the video, credentials, or node_modules.
ssh "${ssh_options[@]}" "$remote" 'mkdir -p ~/ghost-arena/apps/server ~/ghost-arena/apps/web ~/ghost-arena/packages/shared ~/ghost-arena/scripts'
# Synchronize only tracked application source; --delete cannot reach credentials or other services.
rsync -az --delete -e 'ssh -o BatchMode=yes -o ConnectTimeout=10' apps/server/src/ "$remote:ghost-arena/apps/server/src/"
rsync -az --delete -e 'ssh -o BatchMode=yes -o ConnectTimeout=10' packages/shared/src/ "$remote:ghost-arena/packages/shared/src/"
tar -czf - package.json package-lock.json apps/server/package.json apps/server/Dockerfile apps/web/package.json packages/shared/package.json scripts/ensure-proxy.py .dockerignore | ssh "${ssh_options[@]}" "$remote" 'tar -xzf - -C ~/ghost-arena'
ssh "${ssh_options[@]}" "$remote" 'cd ~/ghost-arena && docker build -f apps/server/Dockerfile -t ghost-arena-server:latest .'
# Deploy explicitly with GHOST_CORS_ORIGIN set on the remote before running the final command.
printf '\nBuild ready. Set ~/ghost-arena/server.env with PORT and CORS_ORIGIN, then start the isolated container.\n'
