#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$root" archive --format=tar HEAD | tar -xf - -C "$tmp"
cd "$tmp"

bun run init -- \
  --name smoke-app \
  --identifier com.example.smoke-app \
  --title "Smoke App"

if bun run init -- \
  --name accidental-rebrand \
  --identifier com.example.accidental-rebrand; then
  echo "initializer accepted a second initialization without --force" >&2
  exit 1
fi

cp .github/workflows/validate.yml .github/workflows/validate.yml.bak
sed -i 's/component: smoke-app/component: missing-marker/' .github/workflows/validate.yml
if bun run init -- \
  --force \
  --name partial-rebrand \
  --identifier com.example.partial-rebrand \
  --title "Partial Rebrand"; then
  echo "initializer accepted a repository with an invalid downstream marker" >&2
  exit 1
fi

grep -q '"name": "smoke-app"' package.json
grep -q 'name = "smoke-app"' src-tauri/Cargo.toml
grep -q '"productName": "Smoke App"' src-tauri/tauri.conf.json
mv .github/workflows/validate.yml.bak .github/workflows/validate.yml

bun run init -- \
  --force \
  --name rebranded-smoke-app \
  --identifier com.example.rebranded-smoke-app \
  --title "Rebranded Smoke App"

grep -q '"name": "rebranded-smoke-app"' package.json
grep -q '"name": "rebranded-smoke-app"' bun.lock
grep -q 'name = "rebranded-smoke-app"' src-tauri/Cargo.toml
grep -q 'name = "rebranded-smoke-app"' src-tauri/Cargo.lock
grep -q 'name = "rebranded_smoke_app_lib"' src-tauri/Cargo.toml
grep -q 'rebranded_smoke_app_lib::run()' src-tauri/src/main.rs
grep -q '"productName": "Rebranded Smoke App"' src-tauri/tauri.conf.json
grep -q '"identifier": "com.example.rebranded-smoke-app"' src-tauri/tauri.conf.json
grep -q 'component: rebranded-smoke-app' .github/workflows/validate.yml
grep -q '^# Rebranded Smoke App$' README.md
grep -q '`rebranded-smoke-app` is an application initialized from `tauri-template`' AGENTS.md

bun install --frozen-lockfile
bun run verify:fast
bun run verify:native
