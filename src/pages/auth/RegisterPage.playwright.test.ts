import { expect, test } from "@playwright/test";

test("submits registration details and links back to login", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();

  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password").fill("analysis-engine");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Registration started for Ada Lovelace.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});
