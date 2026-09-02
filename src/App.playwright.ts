import { expect, test } from "@playwright/test";

test("renders the self-contained Tauri starter", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Small by default, ready to grow." }),
  ).toBeVisible();
  await expect(page.getByLabel("Native command smoke test")).toHaveValue("World");
  await expect(page.getByText("Ready to build a Tauri 2 app.")).toBeVisible();
});
