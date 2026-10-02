import { describe, expect, it } from "vitest";
import {
  cargoDependencyNames,
  checkTemplateBaseline,
  isNativeFrontendImport,
} from "../../scripts/check-template-baseline.mjs";

describe("template baseline", () => {
  // Initialized applications (template:smoke) skip enforcement; the template enforces it.
  it("accepts the committed baseline", async () => {
    await expect(checkTemplateBaseline()).resolves.toHaveProperty("enforced");
  });

  it("finds normal dependencies in every Cargo table form", () => {
    const manifest = [
      "[package]",
      'name = "app-core"',
      "[dependencies]",
      'serde = "1"',
      "tauri.workspace = true",
      "[dependencies.tokio]",
      'version = "1"',
      "[target.'cfg(windows)'.dependencies]",
      'windows = "0.58"',
      '[target."cfg(unix)".dependencies.libc]',
      'version = "0.2"',
      "[dev-dependencies]",
      'tempfile = "3"',
      "[build-dependencies]",
      'tauri-build = "2"',
    ].join("\n");
    expect(cargoDependencyNames(manifest).sort()).toEqual([
      "libc",
      "serde",
      "tauri",
      "tokio",
      "windows",
    ]);
  });

  it("detects static, side-effect and dynamic Tauri imports", () => {
    expect(isNativeFrontendImport('import { invoke } from "@tauri-apps/api/core";')).toBe(true);
    expect(isNativeFrontendImport('import "@tauri-apps/plugin-fs";')).toBe(true);
    expect(isNativeFrontendImport('const m = await import("@tauri-apps/api/core");')).toBe(true);
    expect(isNativeFrontendImport('export { invoke } from "@tauri-apps/api/core";')).toBe(true);
    expect(isNativeFrontendImport('import { render } from "@testing-library/react";')).toBe(false);
  });
});
