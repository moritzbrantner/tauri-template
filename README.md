# tauri-template

Tauri + React + TypeScript desktop scaffold inspired by `moritzbrantner/next-template`.

## What is included

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Testing

- `bun run test:unit` runs Vitest unit tests.
- `bun run test:integration` runs Vitest integration tests.
- `bun run test:e2e` builds the app and runs Playwright browser tests.
- `bun run test` runs the unit, integration, and e2e suites.
- `bun run test:rust` runs Cargo tests for the Tauri backend. On Linux, this requires the native Tauri/WebKit build dependencies to be installed.
- Manifest-driven app metadata, pages, navigation, hotkeys, and feature flags.
- Localized English/German messages.
- Local settings for theme, language, and feature toggles.
- Example accelerators for forms, mock REST-style tables, uploads, and notifications.
- A Tauri bridge check on the About page using the starter `greet` command.
- Signed self-updates from GitHub Releases through Tauri's updater plugin.

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

## Updates

The app checks
`https://github.com/moritzbrantner/tauri-template/releases/latest/download/latest.json`
on startup. If a newer signed release is available, the right settings rail shows
an install prompt and relaunches after the update is installed.

This repository has a generated updater public key in `src-tauri/tauri.conf.json`.
The matching private key was generated at `~/.tauri/tauri-template.key` on this
machine and must stay secret. To publish releases from GitHub Actions, add these
repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`: the contents of `~/.tauri/tauri-template.key`.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: only needed if the key has a password.

To publish an update, bump both `package.json` and `src-tauri/tauri.conf.json` to
the new version, commit, and push a tag such as `v0.2.0`. The release workflow
builds the installers, signs the updater artifacts, and uploads `latest.json`.
