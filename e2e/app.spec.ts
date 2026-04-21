import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as Window & {
      __TAURI_INTERNALS__?: Record<string, unknown>;
    };

    browserWindow.__TAURI_INTERNALS__ = {
      ...browserWindow.__TAURI_INTERNALS__,
      invoke: async (cmd: string, args?: { name?: string }) => {
        if (cmd === "greet") {
          return `Hello, ${args?.name ?? ""}! You've been greeted from Rust!`;
        }

        throw new Error(`Unhandled IPC command: ${cmd}`);
      },
    };
  });
});

test("greets a user through the main form", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Welcome to Tauri + React" }),
  ).toBeVisible();

  await page.getByPlaceholder("Enter a name...").fill("Ada");
  await page.getByRole("button", { name: "Greet" }).click();

  await expect(
    page.getByText("Hello, Ada! You've been greeted from Rust!"),
  ).toBeVisible();
});
