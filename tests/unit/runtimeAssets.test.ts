import { afterEach, describe, expect, it, vi } from "vitest";
import { getRuntimeKind, isTauriRuntime } from "../../src/app/platform/runtime";
import { toDesktopAssetUrl } from "../../src/app/platform/assets";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

describe("runtime and asset adapters", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  });

  it("detects browser runtime by default", () => {
    expect(getRuntimeKind()).toBe("browser");
    expect(isTauriRuntime()).toBe(false);
  });

  it("detects Tauri runtime when internals exist", () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });

    expect(getRuntimeKind()).toBe("tauri");
    expect(isTauriRuntime()).toBe(true);
  });

  it("returns browser paths unchanged and empty paths as null", async () => {
    await expect(toDesktopAssetUrl("/tmp/image.png")).resolves.toBe("/tmp/image.png");
    await expect(toDesktopAssetUrl("")).resolves.toBeNull();
  });

  it("converts local paths in Tauri runtime", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });

    await expect(toDesktopAssetUrl("/tmp/image.png")).resolves.toBe("asset:///tmp/image.png");
  });
});
