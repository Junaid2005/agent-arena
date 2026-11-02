#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/ghost-arena"
test -f server.env
chmod 750 "$HOME/ghost-arena" scripts
chmod 600 server.env
chmod 640 scripts/ensure-proxy.py
docker rm -f ghost-arena-server 2>/dev/null || true
docker run -d --name ghost-arena-server --restart unless-stopped \
  --init --memory=512m --cpus=1 --pids-limit=128 --ulimit nofile=1024:1024 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --log-opt max-size=10m --log-opt max-file=3 \
  --env-file server.env -p 127.0.0.1:3011:3011 ghost-arena-server:latest
python3 scripts/ensure-proxy.py
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3011/health > /dev/null; then
    echo 'Agent Arena is healthy.'
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    echo 'Agent Arena failed its startup health check.' >&2
    exit 1
  fi
  sleep 1
done
# Retain other user jobs; this idempotent route restorer only adds this game's host.
(crontab -l 2>/dev/null | sed '\|ghost-arena/scripts/ensure-proxy.py|d'; printf '* * * * * /usr/bin/python3 %s/ghost-arena/scripts/ensure-proxy.py >> %s/ghost-arena/proxy.log 2>&1\n' "$HOME" "$HOME") | crontab -
