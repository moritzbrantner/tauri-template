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

grep -q '"name": "smoke-app"' package.json
grep -q '"name": "smoke-app"' bun.lock
grep -q 'name = "smoke-app"' src-tauri/Cargo.toml
grep -q 'name = "smoke-app"' src-tauri/Cargo.lock
grep -q 'name = "smoke_app_lib"' src-tauri/Cargo.toml
grep -q 'smoke_app_lib::run()' src-tauri/src/main.rs
grep -q '"productName": "Smoke App"' src-tauri/tauri.conf.json
grep -q '"identifier": "com.example.smoke-app"' src-tauri/tauri.conf.json
grep -q 'component: smoke-app' .github/workflows/validate.yml

bun install --frozen-lockfile
bun run verify:fast
bun run verify:native
