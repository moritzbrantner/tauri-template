#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
source_revision="$(git -C "$root" rev-parse HEAD)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$root" archive --format=tar HEAD | tar -xf - -C "$tmp"
cd "$tmp"

TAURI_TEMPLATE_REVISION="$source_revision" bun run init -- \
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

SOURCE_REVISION="$source_revision" node - <<'NODE'
const fs = require("node:fs");
const state = JSON.parse(fs.readFileSync(".tauri-template.json", "utf8"));
if (state.kind !== "application") throw new Error("template state did not become application state");
if (state.application?.name !== "rebranded-smoke-app") throw new Error("rebrand identity was not recorded");
if (state.provenance?.sourceRevision !== process.env.SOURCE_REVISION) {
  throw new Error(`expected source revision ${process.env.SOURCE_REVISION}, got ${state.provenance?.sourceRevision}`);
}
if (!/^[0-9a-f]{64}$/.test(state.provenance?.sourceFingerprint ?? "")) {
  throw new Error("template source fingerprint is missing or malformed");
}
if (JSON.stringify(state.provenance?.toolchains) !== JSON.stringify({ bun: "1.4.0", rust: "1.98.0" })) {
  throw new Error(`unexpected source toolchains: ${JSON.stringify(state.provenance?.toolchains)}`);
}
if (state.activatedRecipes.length !== 0 || Object.keys(state.recipeConfig).length !== 0) {
  throw new Error("rebranding must preserve an empty recipe state");
}
NODE

bun run template:doctor
bun install --frozen-lockfile
bun run verify:fast
bun run verify:native
