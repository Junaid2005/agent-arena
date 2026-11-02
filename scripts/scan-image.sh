#!/usr/bin/env bash
set -euo pipefail
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
curl --fail --silent --show-error --location --retry 3 "https://github.com/anchore/grype/releases/download/v0.121.0/grype_0.121.0_linux_amd64.tar.gz" -o "$workdir/grype_0.121.0_linux_amd64.tar.gz"
printf '%s  %s\n' '64e07133d3486115de647a66581461dccf5c732748a0a3119077395565f15519' "$workdir/grype_0.121.0_linux_amd64.tar.gz" | sha256sum --check --status
tar -xzf "$workdir/grype_0.121.0_linux_amd64.tar.gz" -C "$workdir" grype
"$workdir/grype" "${1:-ghost-arena-server:latest}" --fail-on high
