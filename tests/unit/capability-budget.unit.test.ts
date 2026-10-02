import { describe, expect, it } from "vitest";
import {
  assertDefaultCapability,
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
});
