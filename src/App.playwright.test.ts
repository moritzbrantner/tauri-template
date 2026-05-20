import { expect, test } from "@playwright/test";

test("renders the RBAC workspace and approves an operator", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "RBAC-ready operator workspace" }),
  ).toBeVisible();
  await expect(page.getByText("Role context")).toBeVisible();

  await page.getByRole("button", { name: "Open approval board" }).click();

  await expect(page.getByRole("heading", { name: "Approval board" })).toBeVisible();
  await expect(page).toHaveURL("/?view=approvals");

  await page.getByLabel("Search reviewers").fill("Ada");
  await page.getByRole("button", { name: /Review Ada Lovelace/i }).click();
  await page.getByRole("button", { name: "Approve operator" }).click();

  await expect(
    page.getByText("Ada Lovelace was approved as the accountable launch operator."),
  ).toBeVisible();
});

test("locks release handoff for requester role", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Requester" }).click();
  await page.getByRole("button", { name: "Open release handoff" }).click();

  await expect(page).toHaveURL("/?view=handoff");
  await expect(page.getByText("Release handoff is locked")).toBeVisible();
  await expect(
    page.getByText(
      "The current persona cannot load this screen because the server would require artifacts.read.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to overview" })).toBeVisible();
});

test("requires admin role to approve write scopes", async ({ page }) => {
  await page.goto("/?view=access");

  await expect(page.getByRole("heading", { name: "RBAC access plan" })).toBeVisible();

  await page.getByRole("button", { name: "Approve write scopes" }).click();

  await expect(
    page.getByText("Approving write scopes requires an admin role with access.write."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Approve write scopes" }).click();

  await expect(
    page.getByText("Write scopes approved. Mutation endpoints are cleared for execution roles."),
  ).toBeVisible();
});

test("stages a release bundle after a file is selected", async ({ page }) => {
  await page.goto("/?view=handoff");

  await expect(page.getByRole("heading", { name: "Release handoff" })).toBeVisible();

  await page.getByLabel("Add release files").setInputFiles({
    name: "release-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("QA notes"),
  });

  await expect(page.getByText("release-notes.txt")).toBeVisible();

  await page.getByRole("button", { name: "Stage bundle" }).click();

  await expect(
    page.getByText("Release bundle staged with 1 artifacts and ready for delivery."),
  ).toBeVisible();
});

test("adds an audit note", async ({ page }) => {
  await page.goto("/?view=audit");

  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();

  await page.getByLabel("Operator note").fill("Ready for downstream QA.");
  await page.getByRole("button", { name: "Add note" }).click();

  await expect(page.getByText("Operator note added to the audit trail.")).toBeVisible();
  await expect(page.getByText("Ready for downstream QA.")).toBeVisible();
});

test("runs the browser-mocked demo task", async ({ page }) => {
  await page.addInitScript(() => {
    let callbackId = 0;
    const callbacks = new Map<number, (event: unknown) => void>();
    const listeners = new Map<number, string>();
    const listenerHandlers = new Map<number, number>();
    const jobs = new Map<string, Record<string, unknown>>();

    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener(_event: string, eventId: number) {
        listeners.delete(eventId);
        listenerHandlers.delete(eventId);
      },
    };

    window.__TAURI_INTERNALS__ = {
      callbacks,
      convertFileSrc: (path: string) => `asset://${path}`,
      invoke: async (command: string, args?: Record<string, unknown>) => {
        if (command === "plugin:event|listen") {
          const eventId = ++callbackId;
          listeners.set(eventId, String(args?.event));
          listenerHandlers.set(eventId, Number(args?.handler));
          return eventId;
        }

        if (command === "list_jobs") {
          return Array.from(jobs.values());
        }

        if (command === "clear_finished_jobs") {
          let cleared = 0;
          for (const [id, job] of jobs) {
            if (["completed", "failed", "cancelled"].includes(String(job.status))) {
              jobs.delete(id);
              cleared += 1;
            }
          }
          return cleared;
        }

        if (command === "cancel_job") {
          const job = jobs.get(String(args?.jobId));
          if (!job) {
            return false;
          }
          job.status = "cancelled";
          return true;
        }

        if (command === "check_system_dependencies") {
          return {
            dependencies: [
              {
                name: "git",
                required: false,
                available: true,
                version: "git version mocked",
                resolvedPath: "/usr/bin/git",
              },
            ],
          };
        }

        if (command === "start_demo_task") {
          const now = new Date().toISOString();
          const job = {
            id: "job-demo",
            kind: "demo",
            label: String(args?.label),
            status: "running",
            progress: 0,
            createdAt: now,
            updatedAt: now,
          };
          jobs.set(job.id, job);

          window.setTimeout(() => {
            const updatedAt = new Date().toISOString();
            const progress = {
              jobId: job.id,
              label: job.label,
              status: "running",
              progress: 0.5,
              message: "Processing 4/8",
              updatedAt,
            };
            for (const [eventId, eventName] of listeners) {
              if (eventName === "job://progress") {
                const handlerId = listenerHandlers.get(eventId);
                if (!handlerId) {
                  continue;
                }
                callbacks.get(handlerId)?.({
                  event: "job://progress",
                  id: eventId,
                  payload: progress,
                  windowLabel: "main",
                });
              }
            }
          }, 50);

          return job;
        }

        return null;
      },
      transformCallback: (callback: (event: unknown) => void) => {
        const id = ++callbackId;
        callbacks.set(id, callback);
        return id;
      },
      unregisterCallback: (id: number) => {
        callbacks.delete(id);
      },
    };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start task" }).click();

  await expect(page.getByText("Processing 4/8")).toBeVisible();
});

test("changes the color mode setting to dark without changing the routed view", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/?view=audit");

  const colorModeSwitch = page.getByRole("switch", { name: "Color mode" });

  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();
  await expect(colorModeSwitch).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await colorModeSwitch.click();

  await expect(colorModeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page).toHaveURL("/?view=audit");
});

test("changes the color mode setting back to light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const colorModeSwitch = page.getByRole("switch", { name: "Color mode" });

  await expect(colorModeSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await colorModeSwitch.click();

  await expect(colorModeSwitch).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
