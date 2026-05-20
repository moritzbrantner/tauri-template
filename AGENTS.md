# Agent Instructions

## Project Purpose

This repository is a Bun-managed Tauri 2 desktop template with a React 19 and Vite frontend, TypeScript tests, Playwright browser coverage, and a Rust backend for native desktop commands. It demonstrates an RBAC-oriented operator workspace, desktop adapters, signed updater wiring, and release packaging through GitHub Actions.

## Project Rules

- Prefer URL-based navigation for application views.
- When state benefits from being shareable, bookmarkable, restorable, or deep-linkable, put it in URL query parameters.
- Keep purely transient or sensitive UI state local instead of encoding it in the URL.
- Use clean code and SOLID principles: keep modules focused on one reason to change, depend on clear contracts, and split files before they become overly long.

## Key Directories

- `src/`: React frontend, UI state, route/query helpers, frontend backend wrappers, stories, and Playwright specs.
- `src/app/backend/`: TypeScript contracts around Tauri commands and plugin APIs. Mock at this boundary in browser, Storybook, and Vitest tests.
- `src/app/rbac/`: RBAC workspace views, view routing, hooks, formatters, catalog data, and UI components.
- `src/app/routing/`: Generic URL query-state helpers. Use this for bookmarkable state.
- `src/app/platform/`: Runtime and asset adapters for browser, tests, Storybook, and Tauri.
- `src-tauri/src/`: Rust Tauri commands and native desktop implementation details.
- `src-tauri/capabilities/` and `src-tauri/tauri.conf.json`: Tauri security, permissions, updater, product, and bundling configuration.
- `tests/unit/` and `tests/integration/`: Vitest suites that run outside the browser e2e flow.
- `.github/workflows/release.yml`: Tag-triggered release verification and Tauri publishing.
- `scripts/`: Small project automation helpers.

## Commands

Use Bun as the package manager. The lockfile is `bun.lock`.

- Install dependencies: `bun install`
- Start web dev server: `bun run dev`
- Start full Tauri desktop dev runtime: `bun run tauri dev`
- Run fastest meaningful tests: `bun run test:unit`
- Run all TypeScript/browser tests: `bun run test`
- Run Rust backend tests: `bun run test:rust`
- Run static TypeScript checks: `bun run lint`
- Format Rust code: `bun run format`
- Check formatting without mutation: `bun run format:check`
- Build frontend production assets: `bun run build`
- Run repo hygiene report: `bun run check:repo-hygiene`
- Run full local confidence check: `bun run verify`
- Open Playwright UI: `bun run playwright`
- Start Storybook: `bun run storybook`

`bun run test:e2e` starts the Vite preview server through Playwright and performs a production frontend build first. On Linux, Tauri/Cargo commands may require the WebKit/GTK development packages documented in `README.md`.

## Release Workflow

There is no local `release` or `publish` package script because publishing is handled by `.github/workflows/release.yml`.

To release, update and commit matching versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, then push a `vX.Y.Z` tag. The workflow validates the tag with `bun run verify:release-version -- "$GITHUB_REF_NAME"` before building and publishing signed Tauri artifacts.

## Do Not Edit Manually

- Do not edit `node_modules/`, `dist/`, `dist-ssr/`, `storybook-static/`, `coverage/`, `playwright-report/`, `test-results/`, `src-tauri/target/`, or `src-tauri/gen/schemas/`.
- Do not hand-edit generated updater or signing artifacts. Keep the private updater key out of the repository.
- Do not commit local secrets, `.env*` files, logs, or machine-specific files.
- Do not remove or ignore lockfiles (`bun.lock`, `src-tauri/Cargo.lock`) unless the project intentionally changes package manager or Rust dependency policy.
- Treat `src-tauri/icons/` as source assets for the app bundle, not disposable generated output.

## Search And Orientation

- Start broad file discovery with `rg --files`.
- Use text search with `rg "pattern" path`.
- Use `git status --short` before editing and again before final reporting.
- Use `bun run check:repo-hygiene` when git status noise or ignored generated directories are relevant.
- Use `semble search --repo . "query"` for semantic code orientation when exact text search is not enough.

## Verification Notes

- Prefer `bun run test:unit` for quick frontend feedback while iterating.
- Use `bun run verify` before handing off larger changes. It runs hygiene reporting, Rust format check, TypeScript checks, frontend build, Vitest/Playwright tests, and Rust tests.
- `bun run test` includes Playwright e2e tests and can be slower than unit/integration tests.
- `bun run test:rust`, `bun run tauri dev`, and release packaging can fail on Linux machines missing Tauri native prerequisites.
- The package install may need `GH_PACKAGES_TOKEN` because `.npmrc` resolves `@moritzbrantner/*` packages from GitHub Packages. Some dependencies are local `file:../platform-packages/...` packages and require that sibling checkout to exist.
