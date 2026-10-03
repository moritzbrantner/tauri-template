import { describe, expect, it } from "vitest";
import { doctor } from "../../scripts/template-doctor.mjs";

describe("template doctor", () => {
  // Runs both in the template and in initialized applications (template:smoke).
  it("accepts the committed template or application state", async () => {
    await expect(doctor()).resolves.toMatchObject({
      kind: expect.stringMatching(/^(?:template|application)$/),
    });
  });
});
