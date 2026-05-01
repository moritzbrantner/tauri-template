import { expect, test } from "@playwright/test";

test("requests a password reset link and returns to login", async ({ page }) => {
  await page.goto("/password-forgotten");

  await expect(page.getByRole("heading", { name: "Password forgotten" })).toBeVisible();

  await page.getByLabel("Email").fill("operator@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(
    page.getByText("Password reset link requested for operator@example.com."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to login" })).toHaveAttribute(
    "href",
    "/login",
  );
});
