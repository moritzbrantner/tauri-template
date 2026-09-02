# Scoped folder watching

Use this when an application needs to react to changes in user-selected or application-owned directories.

Do **not** restore the old default `notify`/`globset` watcher. Tauri 2's official filesystem plugin now provides `watch`/`watchImmediate`; the native crate only needs its `watch` feature enabled.

## Install

```bash
bun tauri add fs
```

Ensure the Rust dependency enables the feature:

```toml
[dependencies]
tauri-plugin-fs = { version = "2", features = ["watch"] }
```

## Capability

Watching is permission- and scope-gated. Grant only watch/unwatch plus paths the application actually needs. For an app-owned import directory, for example:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "folder-watch",
  "windows": ["main"],
  "permissions": [
    {
      "identifier": "fs:allow-watch",
      "allow": [{ "path": "$APPDATA/imports/**/*" }]
    },
    "fs:allow-unwatch"
  ]
}
```

For arbitrary user-selected directories, derive the runtime scope deliberately rather than granting `$HOME/**/*` as a convenience default.

## Frontend adapter

Put plugin calls behind a module such as `src/platform/tauri/folder-watch.ts`. That module should own:

- translating app-specific options to `watch()` options;
- returning an unsubscribe/cleanup handle;
- normalizing raw filesystem events into domain-neutral events;
- ensuring watchers are stopped on component/service teardown.

By default directory watching is not recursive; opt into recursion only for use cases that need it.

## Tests

- Unit-test event normalization without Tauri.
- Native/integration-test actual filesystem observation with a temporary directory.
- Include teardown/cancellation tests so a restarted watcher does not leak the previous watch.
- Test the exact configured scope; a forbidden path should fail.

Official reference: https://v2.tauri.app/plugin/file-system/
