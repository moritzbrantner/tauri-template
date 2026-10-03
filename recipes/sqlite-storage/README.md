# SQLite storage

Use this when an application needs a local relational database and SQL is a better fit than a small settings file.

The old template embedded an application-specific `rusqlite` schema. Do not make that schema part of the generic starter. Tauri 2's official SQL plugin provides the reusable transport and connection lifecycle; each app should own its migrations and repositories.

## Install

```bash
bun tauri add sql
```

Enable SQLite in the Rust dependency:

```toml
[dependencies]
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

Initialize the plugin in the Tauri adapter layer:

```rust
.plugin(tauri_plugin_sql::Builder::default().build())
```

Install the frontend binding if the automatic add command did not already do so:

```bash
bun add @tauri-apps/plugin-sql@^2
```

## Capability

Start read-only where possible:

```json
{
  "permissions": ["sql:default"]
}
```

`sql:default` permits loading/closing connections and selecting data. Add `sql:allow-execute` only when the frontend genuinely needs writes:

```json
{
  "permissions": ["sql:default", "sql:allow-execute"]
}
```

For applications with a richer domain layer, prefer keeping writes behind Rust/domain commands rather than granting generic frontend SQL execution just because it is convenient.

## Migrations and domain access

Keep migrations next to the application domain that owns them. Migrations should have stable version numbers and be safe under the plugin's transactional migration behavior. Put reusable queries/repositories below the Tauri boundary when they encode business rules.

A frontend adapter such as `src/platform/tauri/database.ts` should own connection names and plugin-specific imports so React components do not know how storage is implemented.

## Tests

- Test migrations against a temporary SQLite database.
- Test repository/domain behavior independently of Tauri when possible.
- Native-test plugin connection setup and permissions.
- Test upgrades from at least the previous shipped migration version before releases.

Official reference: https://v2.tauri.app/plugin/sql/
