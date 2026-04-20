# tauri-template

Tauri + React + TypeScript desktop scaffold inspired by `moritzbrantner/next-template`.

## What is included

- Manifest-driven app metadata, pages, navigation, hotkeys, and feature flags.
- Localized English/German messages.
- Local settings for theme, language, and feature toggles.
- Example accelerators for forms, mock REST-style tables, uploads, and notifications.
- A Tauri bridge check on the About page using the starter `greet` command.

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
