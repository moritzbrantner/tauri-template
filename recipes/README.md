# Optional capability recipes

The default template stays deliberately small. Recipes are integration guides for capabilities that are useful in many applications but should not be installed or permitted in every application.

`registry.json` is the machine-readable catalogue. A recipe may later be consumed by scaffolding tooling, but the catalogue does not make any recipe part of the default runtime.

## Rules

- Prefer an official Tauri 2 plugin when it already owns the capability.
- Grant the narrowest command permissions and scopes that satisfy the application.
- Keep reusable/domain behavior in `src-tauri/crates/app-core` or another focused crate when it does not need Tauri.
- Keep plugin initialization and command/event translation in the Tauri adapter layer.
- Keep frontend plugin calls behind `src/platform/tauri` adapters.
- Add native/integration coverage for OS- or Tauri-dependent behavior; browser tests are not evidence that a plugin works.
- Never copy app-specific signing keys, updater endpoints, database schemas, filesystem paths, or credentials into the template.

## Initial recipes

- `folder-watch`: use Tauri's filesystem plugin with the `watch` feature and explicit path scopes instead of the old custom `notify` watcher.
- `sqlite-storage`: use Tauri's SQL plugin for generic SQLite access; keep migrations/domain repositories application-specific.
- `background-jobs`: keep scheduling/cancellation state in reusable Rust code and use Tauri events/commands only as the transport boundary.
- `updater`: add signed updates per application, with app-owned signing material and the narrow `process:allow-restart` permission.

Official Tauri 2 documentation is the source of truth for current plugin permissions and platform support. Re-check it when applying a recipe because plugin permission sets can evolve independently of this template.
