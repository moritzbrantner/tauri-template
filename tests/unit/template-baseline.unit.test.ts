import { describe, expect, it } from "vitest";
import { checkTemplateBaseline } from "../../scripts/check-template-baseline.mjs";

describe("template baseline", () => {
  it("enforces the declared minimal template baseline", async () => {
    await expect(checkTemplateBaseline()).resolves.toMatchObject({ enforced: true });
  });
});
