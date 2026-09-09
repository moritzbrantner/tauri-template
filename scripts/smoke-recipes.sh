#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$root" archive --format=tar HEAD | tar -xf - -C "$tmp"
cd "$tmp"

bun run init -- \
  --name recipe-smoke-app \
  --identifier com.example.recipe-smoke-app \
  --title "Recipe Smoke App"

snapshot() {
  find . -type f \
    -not -path './node_modules/*' \
    -not -path './src-tauri/target/*' \
    -not -path './dist/*' \
    -not -path './_site/*' \
    -not -path './test-results/*' \
    -not -path './playwright-report/*' \
    -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d' ' -f1
}

mapfile -t recipes < <(
  node -e 'const registry = require("./recipes/registry.json"); for (const recipe of registry.recipes) console.log(recipe.id)'
)

for recipe in "${recipes[@]}"; do
  args=("$recipe")
  if [[ "$recipe" == "folder-watch" ]]; then
    args+=(--scope '$APPDATA/imports/**/*')
  fi

  before_dry_run="$(snapshot)"
  bun run recipe:add -- "${args[@]}" --dry-run >/dev/null
  after_dry_run="$(snapshot)"
  if [[ "$before_dry_run" != "$after_dry_run" ]]; then
    echo "recipe $recipe mutated the application during --dry-run" >&2
    exit 1
  fi

  bun run recipe:add -- "${args[@]}" >/dev/null
  bun run check:capability-budget

  after_first_apply="$(snapshot)"
  bun run recipe:add -- "${args[@]}" >/dev/null
  after_second_apply="$(snapshot)"
  if [[ "$after_first_apply" != "$after_second_apply" ]]; then
    echo "recipe $recipe is not idempotent" >&2
    exit 1
  fi
done

expected_recipes="$(printf '%s\n' "${recipes[@]}" | sort | paste -sd, -)"
actual_recipes="$(
  node -e 'const state = require("./.tauri-template.json"); console.log([...state.activatedRecipes].sort().join(","))'
)"
if [[ "$actual_recipes" != "$expected_recipes" ]]; then
  echo "activated recipe state drifted: expected $expected_recipes, got $actual_recipes" >&2
  exit 1
fi

node - <<'NODE'
const fs = require("node:fs");
const capability = JSON.parse(fs.readFileSync("src-tauri/capabilities/default.json", "utf8"));
const watch = capability.permissions.find(
  (permission) => typeof permission === "object" && permission.identifier === "fs:allow-watch",
);
if (JSON.stringify(watch?.allow) !== JSON.stringify([{ path: "$APPDATA/imports/**/*" }])) {
  throw new Error(`folder-watch scope was not preserved exactly: ${JSON.stringify(watch)}`);
}
NODE

grep -q 'uses: tauri-apps/tauri-action@1deb371b0cd8bd54025b384f1cd735e725c4060f' .github/workflows/release.yml
grep -q 'uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262' .github/workflows/release.yml
grep -q 'uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6' .github/workflows/release.yml
node --check scripts/verify-release-version.mjs

if node scripts/verify-release-version.mjs v0.1.0; then
  echo "release preflight accepted active updater state without app-owned signing/configuration" >&2
  exit 1
fi

bun install --frozen-lockfile
bun run verify:fast
bun run verify:native
