import { expect, test } from "@playwright/test";

test("renders the RBAC workspace and approves an operator", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "RBAC-ready operator workspace" }),
  ).toBeVisible();
  await expect(page.getByText("Role context")).toBeVisible();

  await page.getByRole("button", { name: "Open approval board" }).click();

  await expect(page.getByRole("heading", { name: "Approval board" })).toBeVisible();

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

  await expect(page.getByText("Release handoff is locked")).toBeVisible();
  await expect(
    page.getByText(
      "The current persona cannot load this screen because the server would require artifacts.read.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to overview" })).toBeVisible();
});

test("requires admin role to approve write scopes", async ({ page }) => {
  await page.goto("/#access");

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
  await page.goto("/#handoff");

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
  await page.goto("/#audit");

  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();

  await page.getByLabel("Operator note").fill("Ready for downstream QA.");
  await page.getByRole("button", { name: "Add note" }).click();

  await expect(page.getByText("Operator note added to the audit trail.")).toBeVisible();
  await expect(page.getByText("Ready for downstream QA.")).toBeVisible();
});
