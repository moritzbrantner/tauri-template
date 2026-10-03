# tauri-template

A deliberately small Tauri 2 + React + TypeScript starting point for desktop-first applications.

The template keeps the default application self-contained. It does not require sibling repositories, private packages, application-specific domains, updater credentials, or broad native permissions.

## Baseline

- Tauri 2 native shell
- React 19 + TypeScript + Vite
- Bun package management
- one typed frontend-to-Rust command as an IPC smoke test
- Vitest unit tests
- Playwright browser-shell smoke test
- Cargo tests for native code
- Renovate policy inherited from the shared repository landscape

## Architecture

Keep three layers distinct:

1. **Application/domain logic** should be framework-independent whenever practical. Prefer pure Rust crates for reusable native computation and plain TypeScript modules for portable frontend logic.
2. **Tauri adapters** should stay thin: commands, events, plugin setup, capability declarations, and OS integration belong at this boundary.
3. **React UI** talks to native behavior through small typed adapter modules such as `src/greet.ts`, not by scattering `invoke()` calls through components.

The default template intentionally contains only one command. Storage, filesystem access, folder watching, secrets, updater support, background jobs, notifications, tray integration, sidecars, and similar features should be added as explicit capabilities when an application needs them.

## Setup

```bash
bun install --frozen-lockfile
bun run tauri dev
```

For frontend-only work:

```bash
bun run dev
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

`test:e2e` exercises the browser-rendered shell. It does not claim to exercise Tauri windows or OS integration. Native integration behavior belongs in a separate native validation tier.

## Adding a native capability

When adding a Tauri plugin or custom native feature:

1. add only the required Rust and JavaScript dependencies;
2. initialize it in the Tauri adapter layer;
3. grant only the permissions required by the windows or webviews that use it;
4. expose a typed frontend adapter;
5. test portable logic without requiring a window where possible;
6. add native integration coverage when behavior depends on the OS or Tauri runtime.

Do not turn optional application features back into default template baggage.

## Scope

This repository is the reusable application foundation. It is not the place for a sample business product. Feature-rich examples from the older template remain available in Git history and can be extracted into opt-in recipes when they prove broadly useful.
