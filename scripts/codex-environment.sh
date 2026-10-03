#!/usr/bin/env bash
set -euo pipefail

mode="${1:-setup}"
if [[ "$mode" != "setup" && "$mode" != "maintenance" ]]; then
  printf 'usage: %s [setup|maintenance]\n' "$0" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
config="$root/.repository-environment.toml"

if [[ ! -f "$config" ]]; then
  printf 'missing environment-v1 config: %s\n' "$config" >&2
  exit 2
fi

run_privileged() {
  if command -v sudo >/dev/null 2>&1; then sudo "$@"; else "$@"; fi
}

desired_bun="$(python3 - "$root/package.json" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
value = json.loads(path.read_text()).get('packageManager', '') if path.is_file() else ''
print(value.split('@', 1)[1] if value.startswith('bun@') else '')
PY
)"
if ! [[ "$desired_bun" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'packageManager must pin an exact Bun version, got %s\n' "$desired_bun" >&2
  exit 2
fi
if ! command -v bun >/dev/null 2>&1 || [[ "$(bun --version)" != "$desired_bun" ]]; then
  printf 'Bun preflight mismatch: expected %s; provision that exact version before setup\n' "$desired_bun" >&2
  exit 1
fi

# Print a TOML value (one line per array item) with Bun's built-in parser so
# setup does not depend on Python 3.11+ tomllib (Ubuntu 22.04 ships 3.10).
toml_values() {
  bun -e '
const [file, key] = process.argv.slice(1);
const fs = require("node:fs");
let value = fs.existsSync(file) ? Bun.TOML.parse(fs.readFileSync(file, "utf8")) : {};
for (const part of key.split(".")) value = value?.[part];
for (const item of Array.isArray(value) ? value : value == null ? [] : [value]) console.log(String(item));
' "$1" "$2"
}

# Capture into variables first so a parser failure aborts under `set -e`
# instead of silently yielding an empty list through process substitution.
read_lines() {
  local -n target="$1"
  local output
  output="$(toml_values "$2" "$3")"
  target=()
  if [[ -n "$output" ]]; then mapfile -t target <<<"$output"; fi
}

if [[ "$mode" == "setup" ]] && command -v apt-get >/dev/null 2>&1; then
  read_lines apt_packages "$config" system.apt
  if (( ${#apt_packages[@]} )); then
    run_privileged apt-get update
    run_privileged apt-get install -y --no-install-recommends "${apt_packages[@]}"
  fi
fi

rust_toolchain="$(toml_values "$root/rust-toolchain.toml" toolchain.channel)"
if ! [[ "$rust_toolchain" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'Rust toolchain must use an exact version, got %s\n' "$rust_toolchain" >&2
  exit 2
fi
if ! command -v rustup >/dev/null 2>&1; then
  printf 'rustup is required before repository setup\n' >&2
  exit 2
fi
rustup toolchain install "$rust_toolchain" --profile minimal
read_lines rust_components "$root/rust-toolchain.toml" toolchain.components
for component in "${rust_components[@]}"; do
  rustup component add --toolchain "$rust_toolchain" "$component"
done

read_lines environment_commands "$config" "$mode.commands"
for command in "${environment_commands[@]}"; do
  (cd "$root" && bash -lc "$command")
done

observed_rust="$(cd "$root" && rustc --version | awk '{print $2}')"
if [[ "$observed_rust" != "$rust_toolchain" ]]; then
  printf 'Rust preflight mismatch: expected %s, got %s\n' "$rust_toolchain" "$observed_rust" >&2
  exit 1
fi
