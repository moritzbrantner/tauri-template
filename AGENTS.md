# AGENTS.md

## Purpose

`tauri-template` is a small, reusable Tauri 2 application foundation. Protect the template boundary: changes should improve projects generated from this repository rather than turn the repository into a specific application.

## Default stack

- Tauri 2
- Rust for native/domain logic
- React + TypeScript for the frontend
- Vite
- Bun

## Architecture rules

- Keep reusable computation independent from Tauri APIs.
- Keep `src-tauri` focused on application composition and platform adapters.
- Keep frontend Tauri calls behind small typed modules; do not scatter `invoke()` or plugin imports through components.
- Add native plugins and capability permissions only for concrete requirements.
- Prefer least-privilege Tauri capabilities.
- Keep local file paths, credentials, secrets, and transient native identifiers out of URLs and logs.
- Do not add mandatory dependencies on sibling repositories or unpublished local packages.
- Optional examples belong in recipes/examples, not in the default runtime.

## Environment

- `package.json#packageManager` is the exact Bun pin.
- `rust-toolchain.toml` is the exact Rust pin.
- `.repository-environment.toml` declares non-native environment requirements such as Linux Tauri packages.
- `scripts/codex-environment.sh` is the stable setup/maintenance entrypoint.
- Run `bash scripts/codex-environment.sh setup` on a fresh environment and `maintenance` after dependency-state changes.
- Do not silently replace exact pins with moving `latest`, `stable`, or major-version aliases.

## Conventions

- `conventions.json`, `conventions.lock.json`, and `.conventions/` are managed policy state.
- Do not hand-edit vendored convention files. Refresh them through `coding-tooling` against an explicit convention-registry revision.
- `.coding-tooling.json` defines repository validation tiers and capability expectations.
- Keep test execution kinds explicit in filenames; Vitest unit tests use `.unit.test.*`, while Playwright uses its own non-Vitest suffix.

## Validation

Use the narrowest useful tier while iterating:

```bash
bun run verify:fast
bun run verify:native
bun run verify
```

Before treating a template-level change as complete, also validate a clean copied instance:

```bash
bun run template:smoke
```

Browser Playwright coverage is not evidence that native Tauri/OS behavior works. Add an explicit native integration test when a change depends on windows, plugins, filesystem permissions, platform APIs, or packaging.

## Dependency policy

- Keep Bun and Rust toolchains pinned by repository-native files.
- Keep `bun.lock` and `src-tauri/Cargo.lock` committed.
- Use locked installs/checks in automation.
- Use Oxfmt/Oxlint for frontend formatting/linting and Cargo fmt/Clippy for Rust.
- Let the shared Renovate policy update dependency pins rather than adding ad-hoc updater configuration.

## Template discipline

Before adding a feature to the default template, ask whether nearly every derived application needs it. If not, prefer an opt-in recipe or a focused reusable crate/package.
