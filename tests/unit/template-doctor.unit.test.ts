import { describe, expect, it } from "vitest";
import { doctor } from "../../scripts/template-doctor.mjs";

describe("template doctor", () => {
  it("accepts the committed template state", async () => {
    await expect(doctor()).resolves.toMatchObject({ kind: "template", recipes: [] });
  });
});
