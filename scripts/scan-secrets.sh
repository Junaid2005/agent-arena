#!/usr/bin/env bash
set -euo pipefail
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
curl --fail --silent --show-error --location --retry 3 "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz" -o "$workdir/gitleaks_8.30.1_linux_x64.tar.gz"
printf '%s  %s\n' '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' "$workdir/gitleaks_8.30.1_linux_x64.tar.gz" | sha256sum --check --status
tar -xzf "$workdir/gitleaks_8.30.1_linux_x64.tar.gz" -C "$workdir" gitleaks
"$workdir/gitleaks" git --redact .
"$workdir/gitleaks" git --pre-commit --staged --redact .
