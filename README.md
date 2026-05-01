# tauri-template

Tauri + React + TypeScript desktop scaffold inspired by `moritzbrantner/next-template`.

## What is included

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- Tauri + React + TypeScript desktop scaffold.
- RBAC-ready operator workspace using `@moritzbrantner/ui`.
- Role switching for requester, operator, and admin permissions.
- Intake, access review, approval board, release handoff, and audit trail examples.
- Tauri backend command wrappers and Rust command modules for app info, settings, storage, jobs, uploads, notifications, diagnostics, secrets, files, workspace, folder watch, and updates.
- Release workflow and signed updater artifact configuration. The frontend update prompt is not currently mounted in the active workspace.

## Testing

- `bun run test:unit` runs Vitest unit tests.
- `bun run test:integration` runs Vitest integration tests.
- `bun run test:e2e` builds the app and runs Playwright browser tests.
- `bun playwright` starts the Playwright UI.
- `bun storybook` starts the Storybook UI.
- `bun run test` runs the unit, integration, and e2e suites.
- `bun run test:rust` runs Cargo tests for the Tauri backend. On Linux, this requires the native Tauri/WebKit build dependencies to be installed.
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

## Checks

```bash
bun run build
```

This runs TypeScript and the Vite production build.

## Release Updates

The updater plugin is configured to read signed release metadata from
`https://github.com/moritzbrantner/tauri-template/releases/latest/download/latest.json`.
The active frontend workspace does not currently mount an update prompt.

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
