import { describe, expect, it } from "vitest";
import {
  assertDefaultCapability,
  assertNoInlineCapabilities,
  assertPermissionBodies,
  checkCapabilityBudget,
} from "../../scripts/check-capability-budget.mjs";

const zeroPermissionCapability = { identifier: "default", windows: ["main"], permissions: [] };

describe("default capability budget", () => {
  it("keeps the committed default capability within the activated recipe budget", async () => {
    await expect(checkCapabilityBudget()).resolves.toBeUndefined();
  });

  it("rejects undeclared permissions, extra windows and remote origins", () => {
    expect(() => assertDefaultCapability(zeroPermissionCapability)).not.toThrow();
    expect(() =>
      assertDefaultCapability({ ...zeroPermissionCapability, permissions: ["core:default"] }),
    ).toThrow(/must match activated recipe declarations/);
    expect(() =>
      assertDefaultCapability({ ...zeroPermissionCapability, windows: ["main", "other"] }),
    ).toThrow(/only the "main" window/);
    expect(() =>
      assertDefaultCapability({ ...zeroPermissionCapability, remote: { urls: ["https://x"] } }),
    ).toThrow(/remote origins/);
  });

  it("accepts exactly the permissions declared by activated recipes", () => {
    expect(() =>
      assertDefaultCapability({ ...zeroPermissionCapability, permissions: ["dialog:default"] }, [
        "dialog:default",
      ]),
    ).not.toThrow();
  });

  it("rejects inline capabilities declared in tauri.conf.json", () => {
    expect(() => assertNoInlineCapabilities({ app: {} })).not.toThrow();
    expect(() =>
      assertNoInlineCapabilities({ app: { security: { capabilities: ["default"] } } }),
    ).not.toThrow();
    expect(() =>
      assertNoInlineCapabilities({
        app: { security: { capabilities: [{ identifier: "x", permissions: ["core:default"] }] } },
      }),
    ).toThrow(/may only reference the "default" capability file/);
  });

  it("requires scoped permissions to match the recorded recipe scope", () => {
    const scoped = new Map([
      ["fs:allow-watch", { identifier: "fs:allow-watch", allow: [{ path: "$APPDATA/imports" }] }],
    ]);
    const capability = (watch: unknown) => ({
      ...zeroPermissionCapability,
      permissions: ["fs:allow-unwatch", watch],
    });
    expect(() =>
      assertPermissionBodies(
        capability({ allow: [{ path: "$APPDATA/imports" }], identifier: "fs:allow-watch" }),
        scoped,
      ),
    ).not.toThrow();
    expect(() =>
      assertPermissionBodies(
        capability({ identifier: "fs:allow-watch", allow: [{ path: "$HOME/**/*" }] }),
        scoped,
      ),
    ).toThrow(/must match the recorded recipe scope/);
    expect(() =>
      assertPermissionBodies(
        {
          ...zeroPermissionCapability,
          permissions: [{ identifier: "fs:allow-unwatch", allow: [{ path: "$HOME" }] }],
        },
        new Map(),
      ),
    ).toThrow(/must not carry its own scope/);
  });
});
