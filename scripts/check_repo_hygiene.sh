#!/usr/bin/env bash
set -u

cd "$(dirname "$0")/.."

section() {
  printf '\n%s\n' "$1"
}

section "Git status"
status="$(git status --short --untracked-files=normal)"
if [ -n "$status" ]; then
  printf '%s\n' "$status"
else
  printf 'clean\n'
fi

section "Untracked files"
untracked="$(git ls-files --others --exclude-standard)"
if [ -n "$untracked" ]; then
  printf '%s\n' "$untracked"
else
  printf 'none\n'
fi

section "Upstream"
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$upstream" ]; then
  printf 'missing upstream for %s\n' "$(git branch --show-current 2>/dev/null || printf 'current branch')"
else
  printf '%s\n' "$upstream"
  counts="$(git rev-list --left-right --count "$upstream"...HEAD 2>/dev/null || true)"
  if [ -n "$counts" ]; then
    behind="${counts%%[[:space:]]*}"
    ahead="${counts##*[[:space:]]}"
    printf 'behind %s, ahead %s\n' "$behind" "$ahead"
  fi
fi

section "Tracked generated directories"
generated_dirs=(
  "node_modules"
  "dist"
  "dist-ssr"
  "build"
  "coverage"
  "storybook-static"
  "playwright-report"
  "test-results"
  "target"
  "src-tauri/target"
  "src-tauri/gen/schemas"
  ".vite"
  ".turbo"
  ".cache"
)

tracked_generated=0
for dir in "${generated_dirs[@]}"; do
  if git ls-files --error-unmatch "$dir" >/dev/null 2>&1 || git ls-files "$dir/" | grep -q .; then
    printf 'tracked: %s\n' "$dir"
    tracked_generated=1
  fi
done
if [ "$tracked_generated" -eq 0 ]; then
  printf 'none\n'
fi

section "Ignored generated directories present locally"
ignored_present=0
for dir in "${generated_dirs[@]}"; do
  if [ -e "$dir" ] && git check-ignore -q "$dir"; then
    printf 'ignored: %s\n' "$dir"
    ignored_present=1
  fi
done
if [ "$ignored_present" -eq 0 ]; then
  printf 'none\n'
fi

section "Local-only ignore coverage"
local_paths=(
  ".env"
  ".env.local"
  ".env.development.local"
  ".env.test.local"
  ".env.production.local"
  "debug.log"
  "vite.local"
)

missing_ignores=0
for path in "${local_paths[@]}"; do
  if ! git check-ignore -q "$path"; then
    printf 'not ignored: %s\n' "$path"
    missing_ignores=1
  fi
done
if [ "$missing_ignores" -eq 0 ]; then
  printf 'covered\n'
fi
