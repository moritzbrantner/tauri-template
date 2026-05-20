# tauri-template

Tauri + React + TypeScript desktop scaffold inspired by `moritzbrantner/next-template`.

## What is included

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- Tauri + React + TypeScript desktop scaffold.
- RBAC-ready operator workspace using `@moritzbrantner/ui`.
- Role switching for requester, operator, and admin permissions.
- Intake, access review, approval board, release handoff, and audit trail examples.
- Tauri backend command wrappers and Rust command modules for app info, settings, storage, jobs, uploads, notifications, diagnostics, secrets, files, workspace, folder watch, system dependency checks, and updates.
- Native file dialogs through `@tauri-apps/plugin-dialog`, mounted in the release handoff example while keeping local file paths out of URLs.
- Mounted updater UI for checking, installing, and restarting after signed desktop updates.
- Generic URL query-state helpers for shareable route state without introducing React Router.
- Runtime and asset adapters for browser, Storybook, tests, and Tauri desktop file previews.
- Long-running job/event example with progress, cancel, status, listing, and clear-finished commands.
- Production CSP baseline for Tauri IPC, local assets, inline styles, and localhost development connections.
- Release workflow and signed updater artifact configuration.

## Desktop primitives

Reusable desktop pieces live under `src/app/backend`, `src/app/platform`, `src/app/routing`, `src/app/jobs`, `src/app/dependencies`, and `src/app/updates`.

- Native dialogs: use `pickFile`, `pickFiles`, `pickDirectory`, `saveFileAs`, and `confirmDialog` from `src/app/backend/dialogs.ts`.
- Updates: `UpdateStatusButton` stays idle on mount, checks on demand, installs on explicit click, and calls the existing restart command after installation.
- URL state: `readQueryState` and `writeQueryState` provide small codecs for bookmarkable state. The RBAC view router keeps `/` as overview and `/?view=intake` style URLs for other views.
- Runtime/assets: `getRuntimeKind`, `isTauriRuntime`, and `toDesktopAssetUrl` keep browser tests working while using `convertFileSrc` in Tauri.
- Jobs: `startDemoTask`, `cancelJob`, `jobStatus`, `listJobs`, `clearFinishedJobs`, and `listenToJobProgress` show a cancellable event-driven background task.
- Dependencies: `checkSystemDependencies` returns structured optional `git`, `bun`, and `cargo` availability without failing the whole report when a tool is missing.

Keep shareable UI state in query parameters. Keep local file paths, active job IDs, transient progress, and sensitive values in component or backend state.

## Testing

- `bun run test:unit` runs Vitest unit tests.
- `bun run test:integration` runs Vitest integration tests.
- `bun run test:e2e` builds the app and runs Playwright browser tests.
- `bun playwright` starts the Playwright UI.
- `bun storybook` starts the Storybook UI.
- `bun run test` runs the unit, integration, and e2e suites.
- `bun run test:rust` runs Cargo tests for the Tauri backend. On Linux, this requires the native Tauri/WebKit build dependencies to be installed.
- Browser and Storybook tests should mock Tauri plugin APIs at the wrapper boundary or provide browser-mode fallbacks. The existing tests mock updater, dialog, dependency, and job APIs where they exercise desktop behavior.

## Local setup

```bash
bun install
bun run dev
```

For the full desktop runtime:

```bash
bun run tauri dev
```

Linux Tauri builds require the WebKit/GTK development packages expected by Tauri. If `cargo check` or `tauri dev` fails with missing `glib-2.0`, `cairo`, `pango`, or `gdk-pixbuf`, install the Tauri Linux prerequisites for your distribution.

The package install may require `GH_PACKAGES_TOKEN` for GitHub Packages access to `@moritzbrantner/*` packages. This template also uses local `file:../platform-packages/...` dependencies, so keep that sibling checkout available when installing from a fresh clone.

## Development workflow

Daily frontend work:

```bash
bun run dev
```

Full desktop runtime:

```bash
bun run tauri dev
```

Fast feedback:

```bash
bun run test:unit
```

Static checks and formatting:

```bash
bun run lint
bun run format:check
```

`bun run format` writes Rust formatting changes with `cargo fmt`. There is currently no committed formatter for TypeScript/CSS files.

## Verification

Before handing off larger changes, run:

```bash
bun run verify
```

This runs repo hygiene reporting, Rust formatting check, TypeScript checks, the Vite production build, unit tests, integration tests, Playwright e2e tests, and Rust tests.

Useful focused checks:

```bash
bun run build
bun run test
bun run test:rust
bun run check:repo-hygiene
```

`bun run build` runs TypeScript and the Vite production build. `bun run check:repo-hygiene` reports dirty status, untracked files, upstream/ahead/behind state, ignored generated directories that exist locally, and common local-only ignore coverage.

## Troubleshooting

- If `bun install` cannot resolve private packages, verify `GH_PACKAGES_TOKEN` is exported and has GitHub Packages read access.
- If local `file:../platform-packages/...` dependencies are missing, clone or restore the sibling `platform-packages` workspace.
- If Playwright fails because Chromium is missing, run `bunx playwright install chromium`.
- If Rust or Tauri commands fail on Linux with missing WebKit/GTK libraries, install the Tauri Linux prerequisites for your distribution.

## Security defaults

The production Tauri config enables a CSP instead of leaving `csp` as `null`:

```text
default-src 'self'; img-src 'self' asset: http://asset.localhost data:; style-src 'self' 'unsafe-inline'; connect-src 'self' ipc: http://ipc.localhost ws://127.0.0.1:* http://127.0.0.1:*
```

- `default-src 'self'` keeps the baseline closed to the bundled app.
- `img-src` allows bundled images, Tauri asset protocol URLs, the Tauri asset localhost bridge, and data URLs.
- `style-src 'unsafe-inline'` supports the current UI styling approach.
- `connect-src` allows Tauri IPC plus localhost development server and websocket traffic.

Add remote API origins only when an app actually calls them. Apps that add inline scripts, remote media, analytics, or third-party embeds should extend the CSP intentionally and document the reason. Local file paths are treated as sensitive desktop state: do not put them in route params, logs, or shareable URLs.

## Release Updates

The updater plugin is configured to read signed release metadata from
`https://github.com/moritzbrantner/tauri-template/releases/latest/download/latest.json`.
The active frontend workspace mounts an update button in the navbar actions. It does not auto-download on mount.

This repository has a generated updater public key in `src-tauri/tauri.conf.json`.
The matching private key was generated at `~/.tauri/tauri-template.key` on this
machine and must stay secret. To publish releases from GitHub Actions, add these
repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`: the contents of `~/.tauri/tauri-template.key`.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: only needed if the key has a password.

To publish an update, bump both `package.json` and `src-tauri/tauri.conf.json` to
the new version, keep `src-tauri/Cargo.toml` in sync, commit, and push a tag such
as `v0.2.0`.

```bash
git tag v0.2.0
git push origin v0.2.0
```

The release workflow first verifies the tag matches all three version files, then
runs the frontend build, unit tests, integration tests, Playwright e2e tests, and
Rust tests on Ubuntu before packaging the desktop installers on Linux, macOS, and
Windows. Successful builds are published to GitHub Releases with signed updater
artifacts and `latest.json`.
