import { describe, expect, it, vi } from "vitest";

import { createTauriFoundationBackend, createTauriFoundationRuntime } from "../../src/foundation-ui/tauri-adapter";

vi.mock("../../src/app/backend/notifications", () => ({
  listNotifications: vi.fn(async () => [
    {
      id: "notif-1",
      title: "Queued",
      body: "Notification body",
      kind: "demo",
      read: false,
      createdAt: "2026-04-21T08:00:00.000Z",
      updatedAt: "2026-04-21T08:00:00.000Z",
    },
  ]),
  markNotificationRead: vi.fn(async () => true),
  markAllNotificationsRead: vi.fn(async () => 1),
}));

vi.mock("../../src/app/backend/settings", () => ({
  loadSettings: vi.fn(async () => ({
    theme: "system",
    accentColor: "#0f172a",
    autoSave: true,
    compactMode: false,
    defaultProjectName: "Project",
  })),
  saveSettings: vi.fn(async (settings) => settings),
}));

vi.mock("../../src/app/backend/uploads", () => ({
  listUploads: vi.fn(async () => [
    {
      id: "upload-1",
      originalPath: "/tmp/report.pdf",
      stagedPath: "/app/report.pdf",
      fileName: "report.pdf",
      sizeBytes: 2048,
      status: "queued",
      jobId: null,
      createdAt: "2026-04-21T08:00:00.000Z",
      updatedAt: "2026-04-21T08:00:00.000Z",
    },
  ]),
}));

describe("Tauri foundation UI adapter", () => {
  it("maps Tauri backend wrappers to the shared backend interface", async () => {
    const backend = createTauriFoundationBackend();

    await expect(backend.getNotifications?.()).resolves.toMatchObject({
      unreadCount: 1,
      items: [{ id: "notif-1", status: "unread" }],
    });
    await expect(backend.getSettings?.()).resolves.toMatchObject({
      compactSpacing: false,
      showHotkeyHints: true,
    });
    await expect(backend.getUploads?.()).resolves.toMatchObject([
      { id: "upload-1", name: "report.pdf", sizeInBytes: 2048 },
    ]);
  });

  it("creates a Tauri runtime without assuming React DOM pages are mounted", () => {
    const runtime = createTauriFoundationRuntime({
      backend: createTauriFoundationBackend(),
      navigate: vi.fn(),
    });

    expect(runtime.platform).toBe("tauri");
    expect(runtime.capabilities?.uploads).toBe(true);
  });
});
