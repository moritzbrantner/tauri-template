#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$root" archive --format=tar HEAD | tar -xf - -C "$tmp"
cd "$tmp"

bun install --frozen-lockfile
bun run verify:fast
bun run verify:native
