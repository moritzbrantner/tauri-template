# tauri-template

A deliberately small Tauri 2 + React + TypeScript starting point for desktop-first applications.

The template keeps the default application self-contained. It does not require sibling repositories, private packages, application-specific domains, updater credentials, or broad native permissions.

## Baseline

- Tauri 2 native shell
- React 19 + TypeScript + Vite
- exact Bun and Rust toolchain pins
- Oxfmt + Oxlint, including type-aware TypeScript checks
- one typed frontend-to-Rust command as an IPC smoke test
- Vitest unit tests
- Playwright browser-shell smoke test
- Cargo fmt, Clippy, check, test, and build validation
- vendored coding-agent convention snapshot
- Renovate policy inherited from the shared repository landscape

## Initialize a new app

Clone/use the template, then initialize its identity once:

```bash
bun run init -- \
  --name media-workbench \
  --identifier com.example.media-workbench \
  --title "Media Workbench"
```

`--name` is the lowercase package/binary slug. `--identifier` is the application bundle identifier in reverse-domain notation. `--title` is optional and defaults to a title derived from the slug.

Initialization updates the JavaScript package and lock identity, Cargo package/library and lock identity, the Rust binary-to-library entry point, Tauri product/window/bundle identity, the HTML title, validation component selection, and the project-facing README/agent wording. A second initialization is rejected unless `--force` is supplied for an intentional rebrand.

The template smoke test initializes a disposable `smoke-app` before verification so frozen/locked checks continuously prove the initialized state is usable.

## Architecture

Keep three layers distinct:

1. **Application/domain logic** stays framework-independent whenever practical. `src-tauri/crates/app-core` is the starter seam for reusable pure Rust code and has no Tauri dependency.
2. **Tauri adapters** stay thin. `src-tauri/src` composes the application and translates commands/events/plugins into calls on reusable logic.
3. **React UI** talks to native behavior through typed modules under `src/platform/tauri`, not by scattering `invoke()` calls through components.

The starter `greet` flow intentionally crosses all three layers: React calls `src/platform/tauri/greet.ts`, the Tauri command delegates immediately, and `app-core` owns the framework-independent behavior. New reusable Rust packages should depend on domain concerns rather than on Tauri whenever possible.

The default template intentionally contains only one command. Storage, filesystem access, folder watching, secrets, updater support, background jobs, notifications, tray integration, sidecars, and similar features should be added as explicit capabilities when an application needs them.

## Environment setup

The repository owns exact Bun and Rust pins. On a prepared machine, provision the declared repository environment with:

```bash
bash scripts/codex-environment.sh setup
```

For an existing environment after dependency changes:

```bash
bash scripts/codex-environment.sh maintenance
```

The environment contract is declared in `.repository-environment.toml`. On Linux it includes the WebKit/GTK development packages needed by Tauri. Both setup modes use locked JavaScript and Cargo dependency resolution.

For frontend-only work after setup:

```bash
bun run dev
```

For the desktop runtime:

```bash
bun run tauri dev
```

## Verification

Fast portable checks:

```bash
bun run verify:fast
```

Native checks:

```bash
bun run verify:native
```

Full repository verification:

```bash
bun run verify
```

Fresh-template verification copies the committed repository into a disposable directory, initializes it with a non-template identity, and validates the copy independently:

```bash
bun run template:smoke
```

`test:e2e` exercises the browser-rendered shell. It does not claim to exercise Tauri windows or OS integration. Native integration behavior belongs in a separate native validation tier.

## GitHub Pages example portfolio

GitHub Pages publishes a manifest-driven portfolio of browser-rendered previews from `portfolio/examples.json`. Build it locally with:

```bash
bun run pages:build
```

The builder installs every preview from its committed Bun lockfile, builds it with a repository-relative base path, and emits `_site/` without changing native ownership boundaries. Pages is intentionally a browser-shell surface: native commands, operating-system capabilities, and application/domain truth remain in Tauri and Rust. Examples must fail clearly when a native runtime is required rather than replacing native behavior with JavaScript.

The `GitHub Pages` workflow validates the complete portfolio on pull requests and deploys `_site/` from `main` through the GitHub Pages artifact flow. New examples become publishable by adding repository-local source metadata to `portfolio/examples.json`.

## Repository policy

`conventions.json`, `conventions.lock.json`, and `.conventions/` are the committed convention contract for coding agents and CI. Update them through `coding-tooling`; do not hand-edit the vendored snapshot. `.coding-tooling.json` declares the deterministic validation tiers used by the shared repository foundation.

## Adding a native capability

When adding a Tauri plugin or custom native feature:

1. add only the required Rust and JavaScript dependencies;
2. initialize it in the Tauri adapter layer;
3. grant only the permissions required by the windows or webviews that use it;
4. expose a typed frontend adapter;
5. keep reusable/domain computation below that adapter when practical;
6. test portable logic without requiring a window where possible;
7. add native integration coverage when behavior depends on the OS or Tauri runtime.

Do not turn optional application features back into default template baggage.

## Scope

This repository is the reusable application foundation. It is not the place for a sample business product. Feature-rich examples from the older template remain available in Git history and can be extracted into opt-in recipes when they prove broadly useful.
