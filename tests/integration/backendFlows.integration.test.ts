import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppInfo } from "../../src/app/backend/appInfo";
import { onJobProgress } from "../../src/app/backend/jobs";
import {
  listNotifications,
  markNotificationRead,
} from "../../src/app/backend/notifications";
import {
  loadSettings,
  resetSettings,
  saveSettings,
} from "../../src/app/backend/settings";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

describe("backend integration flows", () => {
  const mockedInvoke = vi.mocked(invoke);
  const mockedListen = vi.mocked(listen);
  const settings = {
    theme: "system" as const,
    accentColor: "#2f6fed",
    autoSave: true,
    compactMode: false,
    defaultProjectName: "Untitled project",
  };

  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedListen.mockReset();
  });

  it("loads, saves, and resets settings through backend commands", async () => {
    mockedInvoke
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce({ ...settings, compactMode: true })
      .mockResolvedValueOnce(settings);

    await expect(loadSettings()).resolves.toEqual(settings);
    await expect(saveSettings({ ...settings, compactMode: true })).resolves.toEqual({
      ...settings,
      compactMode: true,
    });
    await expect(resetSettings()).resolves.toEqual(settings);

    expect(mockedInvoke).toHaveBeenNthCalledWith(1, "load_settings");
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, "save_settings", {
      settings: { ...settings, compactMode: true },
    });
    expect(mockedInvoke).toHaveBeenNthCalledWith(3, "reset_settings");
  });

  it("returns app info through the backend wrapper", async () => {
    mockedInvoke.mockResolvedValue({
      productName: "tauri-template",
      version: "0.1.0",
      identifier: "com.moenarch.tauri-template",
    });

    await expect(getAppInfo()).resolves.toMatchObject({
      productName: "tauri-template",
    });
  });

  it("handles job progress events", async () => {
    const job = {
      id: "job-1",
      kind: "import",
      status: "running",
      progress: 0.25,
      createdAt: "now",
      updatedAt: "now",
    };
    mockedListen.mockImplementation(async (_event, handler) => {
      handler({ event: "job://progress", id: 1, payload: job, windowLabel: "main" });
      return vi.fn();
    });
    const handler = vi.fn();

    await onJobProgress(handler);

    expect(handler).toHaveBeenCalledWith(job);
  });

  it("lists notifications and marks one as read", async () => {
    mockedInvoke.mockResolvedValueOnce([
      {
        id: "notification-1",
        title: "Ready",
        body: "Import complete",
        kind: "success",
        read: false,
        createdAt: "now",
        updatedAt: "now",
      },
    ]);
    mockedInvoke.mockResolvedValueOnce(true);

    await expect(listNotifications()).resolves.toHaveLength(1);
    await expect(markNotificationRead("notification-1")).resolves.toBe(true);
  });
});
