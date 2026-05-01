import { expect, test } from "@playwright/test";

test("submits login credentials and links to auth recovery", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

  await page.getByLabel("Email").fill("operator@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Sign in requested for operator@example.com.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    "/password-forgotten",
  );
});
