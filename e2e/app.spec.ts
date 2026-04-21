import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as Window & {
      __TAURI_INTERNALS__?: Record<string, unknown>;
    };
    const settings = {
      theme: "system",
      accentColor: "#2f6fed",
      autoSave: true,
      compactMode: false,
      defaultProjectName: "Untitled project",
    };

    browserWindow.__TAURI_INTERNALS__ = {
      ...browserWindow.__TAURI_INTERNALS__,
      invoke: async (cmd: string, args?: { name?: string; settings?: unknown }) => {
        if (cmd === "load_settings") {
          return settings;
        }

        if (cmd === "save_settings") {
          return args?.settings ?? settings;
        }

        if (cmd === "greet") {
          return `Hello, ${args?.name ?? ""}! You've been greeted from Rust!`;
        }

        throw new Error(`Unhandled IPC command: ${cmd}`);
      },
    };
  });
});

test("renders the shell and navigates to the forms example", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Manifest-driven Tauri starter for local-first product work.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Open form example/ }).click();

  await expect(
    page.getByRole("heading", { name: "Employee profile form" }),
  ).toBeVisible();
});
