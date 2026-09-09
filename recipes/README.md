# Optional capability recipes

The default template stays deliberately small. Recipes are explicit application transformations for capabilities that are useful in many applications but should not be installed or permitted in every application.

`registry.json` is the machine-readable catalogue and transformation contract. Initialize an application before activating a recipe.

Preview a change without writing anything:

```bash
bun run recipe:add -- sqlite-storage --dry-run
```

Apply it:

```bash
bun run recipe:add -- sqlite-storage
```

Recipes that require a filesystem scope fail closed until the scope is explicit:

```bash
bun run recipe:add -- folder-watch --scope '$APPDATA/imports/**/*' --dry-run
bun run recipe:add -- folder-watch --scope '$APPDATA/imports/**/*'
```

Activation records the recipe and its deterministic configuration in `.tauri-template.json`. Reapplying the same recipe with the same configuration is a no-op. A conflicting existing dependency, permission scope, generated file, or recipe configuration is not overwritten automatically.

The transformation engine prepares source changes first, updates lockfiles through the native Bun/Cargo resolvers, verifies frozen/locked resolution and the capability budget, runs recipe-owned validation commands, and rolls the activation back if resolution or validation fails.

## Rules

- Prefer an official Tauri 2 plugin when it already owns the capability.
- Grant the narrowest command permissions and scopes that satisfy the application.
- Keep reusable/domain behavior in `src-tauri/crates/app-core` or another focused crate when it does not need Tauri.
- Keep plugin initialization and command/event translation in the Tauri adapter layer.
- Keep frontend plugin calls behind `src/platform/tauri` adapters.
- Add native/integration coverage for OS- or Tauri-dependent behavior; browser tests are not evidence that a plugin works.
- Never copy app-specific signing keys, updater endpoints, database schemas, filesystem paths, or credentials into the template.
- Treat recipe source seams as ownership guidance, not permission to overwrite application-owned code.

## Initial recipes

- `folder-watch`: use Tauri's filesystem plugin with the `watch` feature and an explicit path scope instead of the old custom `notify` watcher.
- `sqlite-storage`: use Tauri's SQL plugin for generic SQLite access; activation grants read-oriented `sql:default` only, while migrations/domain repositories and broader write authority remain application-specific.
- `background-jobs`: install a pure Rust lifecycle scaffold with monotonic progress and idempotent cancellation; Tauri command/event and frontend adapters remain application-owned seams.
- `updater`: add signed-update runtime dependencies and the narrow `process:allow-restart` permission, while signing material, endpoints, release policy, and UX remain application-owned.
- `release-signing`: add a manual cross-platform draft-release workflow and exact tag/version preflight. It consumes only application-owned GitHub secrets and signing configuration; it does not add runtime dependencies or permissions.

`updater` and `release-signing` are intentionally separate. An application may ship signed installers without implementing in-app updates, and enabling the updater does not automatically create a release pipeline. When both are active, release preflight requires the app-owned updater key/configuration before updater metadata can be published.

`bun run recipes:smoke` initializes a disposable application, dry-runs and applies every registered recipe, verifies second application is byte-stable, verifies declared capability state, exercises recipe-owned validation, and runs the frozen/locked frontend and Rust validation tiers.

Official Tauri 2 documentation remains the source of truth for plugin permission, signing, and platform semantics. Dependency/action versions are explicit in the recipe sources and should be updated through normal dependency/tooling review rather than silently resolved during activation.
