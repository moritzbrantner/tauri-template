# Signed application updates

Use this for applications distributed outside a store or other channel where Tauri's updater is the chosen update mechanism.

Updater configuration is **application identity**, not template identity. Never copy the template's signing private key, public key, release endpoint, repository name, or release metadata into a generated app.

## Install

```bash
bun tauri add updater
bun tauri add process
```

The updater plugin creates/checks/downloads/installs updates. The process plugin is only needed if the frontend should explicitly restart after installation.

## Capability

For the complete updater flow:

```json
{
  "permissions": ["updater:default", "process:allow-restart"]
}
```

Prefer the narrow restart permission instead of `process:default`, which also grants exit.

If an application only checks availability and handles download/install elsewhere, grant the individual updater permissions instead of `updater:default`.

## Tauri configuration

Each application must generate and own its updater key pair. Commit only the public key. Keep the private signing key in the app's release secret store.

Example shape:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "APP-SPECIFIC-PUBLIC-KEY",
      "endpoints": [
        "https://example.invalid/releases/{{target}}/{{arch}}/{{current_version}}"
      ]
    }
  }
}
```

Do not ship the placeholder endpoint. Production updater endpoints should use HTTPS.

## Frontend adapter

Keep updater imports under `src/platform/tauri/updater.ts`. A reasonable UX contract is:

1. stay idle on mount;
2. check on explicit user action or an application-defined non-disruptive policy;
3. show the available version and release information;
4. install only after the chosen policy permits it;
5. restart explicitly after successful installation.

Do not create an always-on update loop inside the template.

## Release validation

Before publishing an updater release:

- verify the tag/version matches `package.json`, Cargo metadata, and Tauri config;
- build installers for the intended target matrix;
- sign updater artifacts using app-owned secrets;
- verify `latest.json` or the custom update response references the produced artifacts;
- exercise update from the previous released version, not only a clean install.

Official references:
- https://v2.tauri.app/plugin/updater/
- https://v2.tauri.app/plugin/process/
