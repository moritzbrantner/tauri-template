# Cross-platform release signing

Use this recipe when an initialized application is ready to produce Windows, macOS, and Linux bundles through a deliberate GitHub Actions release workflow.

Activate it with:

```bash
bun run recipe:add -- release-signing --dry-run
bun run recipe:add -- release-signing
```

The recipe adds only release infrastructure. It does not add runtime permissions or dependencies, and it never copies credentials, certificate identities, updater endpoints, or product-specific signing policy from the template.

## Release contract

The generated `.github/workflows/release.yml` is manual-only. Supply an exact tag such as `v1.2.3`. Before building, `scripts/verify-release-version.mjs` requires that the tag version exactly match:

- `package.json`;
- the root `src-tauri/Cargo.toml` package;
- `src-tauri/tauri.conf.json`.

The workflow runs the application's fast deterministic gate before distribution and creates/updates a **draft** GitHub release. Publishing the draft remains an explicit application-owner decision.

The Tauri release action is pinned to the immutable commit behind `action-v1.0.0`. Checkout and Bun setup are pinned the same way as the repository's normal validation workflows.

## Updater signing

If the `updater` recipe is active, release preflight fails unless the application has deliberately configured:

- `bundle.createUpdaterArtifacts: true`;
- a non-empty updater public key;
- at least one HTTPS updater endpoint;
- the `TAURI_SIGNING_PRIVATE_KEY` GitHub secret.

`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is passed through when the application's updater key uses one. Only when updater state is complete does the workflow ask `tauri-action` to publish updater signatures and `latest.json`.

## macOS signing

The macOS runner fails closed unless `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` are configured as GitHub secrets. Tauri can infer the signing identity from the certificate. Applications that notarize can additionally provide `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` through the generated workflow.

Certificate identity and notarization policy remain application-owned. Do not commit certificate material.

## Windows signing

The Windows runner fails closed unless `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` are configured as GitHub secrets. The workflow imports the PFX into the ephemeral runner certificate store before Tauri builds.

The application must also configure its own Windows bundle signing values in `src-tauri/tauri.conf.json`:

- `certificateThumbprint`;
- `digestAlgorithm`;
- an HTTPS `timestampUrl`.

The recipe intentionally does not guess these values because they belong to the application's certificate provider and identity. Applications using Azure Artifact Signing or another custom signer should replace the PFX import step and use Tauri's application-owned `signCommand` configuration.

## Linux

Linux bundles are built in the same release matrix but this recipe does not invent a package-signing identity. Distribution-channel-specific RPM/deb/AppImage signing should be added only when the application's actual channel requires it.

## Acceptance

The repository recipe smoke test applies this workflow into a disposable initialized app, checks the generated preflight script syntax, verifies the immutable Tauri action pin, and proves reapplication is byte-stable. The workflow itself remains dormant until an application owner explicitly dispatches a release with configured secrets.
