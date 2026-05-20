import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSystemDependencies } from "../../src/app/backend/dependencies";
import {
  confirmDialog,
  pickDirectory,
  pickFile,
  pickFiles,
  saveFileAs,
} from "../../src/app/backend/dialogs";
import { getAppInfo } from "../../src/app/backend/appInfo";
import { normalizeBackendError } from "../../src/app/backend/errors";
import {
  listenToJobProgress,
  onJobProgress,
  startDemoTask,
  startJob,
} from "../../src/app/backend/jobs";
import {
  listNotifications,
  markNotificationRead,
} from "../../src/app/backend/notifications";
import {
  loadSettings,
  resetSettings,
  saveSettings,
  type AppSettings,
} from "../../src/app/backend/settings";
import { createWorkspace } from "../../src/app/backend/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  confirm: vi.fn(),
  open: vi.fn(),
  save: vi.fn(),
}));

import { confirm, open, save } from "@tauri-apps/plugin-dialog";

describe("backend wrappers", () => {
  const mockedInvoke = vi.mocked(invoke);
  const mockedListen = vi.mocked(listen);
  const mockedOpen = vi.mocked(open);
  const mockedSave = vi.mocked(save);
  const mockedConfirm = vi.mocked(confirm);
  const settings: AppSettings = {
    theme: "system",
    accentColor: "#2f6fed",
    autoSave: true,
    compactMode: false,
    defaultProjectName: "Untitled project",
  };

  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedListen.mockReset();
    mockedOpen.mockReset();
    mockedSave.mockReset();
    mockedConfirm.mockReset();
  });

  it("uses the expected app info command name", async () => {
    mockedInvoke.mockResolvedValue({
      productName: "tauri-template",
      version: "0.1.0",
      identifier: "com.moenarch.tauri-template",
    });

    await getAppInfo();

    expect(mockedInvoke).toHaveBeenCalledWith("get_app_info");
  });

  it("serializes settings load, save, and reset arguments correctly", async () => {
    mockedInvoke.mockResolvedValue(settings);

    await loadSettings();
    await saveSettings(settings);
    await resetSettings();

    expect(mockedInvoke).toHaveBeenNthCalledWith(1, "load_settings");
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, "save_settings", {
      settings,
    });
    expect(mockedInvoke).toHaveBeenNthCalledWith(3, "reset_settings");
  });

  it("serializes workspace creation arguments correctly", async () => {
    mockedInvoke.mockResolvedValue({
      id: "workspace-1",
      name: "Demo",
      path: "/tmp/demo",
      createdAt: "now",
      updatedAt: "now",
    });

    await createWorkspace({ name: "Demo", directory: "/tmp/demo" });

    expect(mockedInvoke).toHaveBeenCalledWith("create_workspace", {
      input: { name: "Demo", directory: "/tmp/demo" },
    });
  });

  it("normalizes unknown errors consistently", () => {
    expect(normalizeBackendError(new Error("Boom"))).toEqual({
      code: "internal_error",
      message: "Boom",
    });
    expect(
      normalizeBackendError({ code: "validation_error", message: "Bad" }),
    ).toEqual({ code: "validation_error", message: "Bad" });
  });

  it("serializes job start arguments and wires progress events", async () => {
    const job = {
      id: "job-1",
      kind: "demo",
      status: "running",
      progress: 0.5,
      createdAt: "now",
      updatedAt: "now",
    };
    mockedInvoke.mockResolvedValue(job);
    mockedListen.mockImplementation(async (_event, handler) => {
      handler({ event: "job://progress", id: 1, payload: job, windowLabel: "main" });
      return vi.fn();
    });
    const handler = vi.fn();

    await startJob("demo", { ok: true });
    await onJobProgress(handler);

    expect(mockedInvoke).toHaveBeenCalledWith("start_job", {
      kind: "demo",
      payload: { ok: true },
    });
    expect(mockedListen).toHaveBeenCalledWith(
      "job://progress",
      expect.any(Function),
    );
    expect(handler).toHaveBeenCalledWith(job);
  });

  it("serializes demo task starts and normalized progress events", async () => {
    const progress = {
      jobId: "job-2",
      label: "Demo",
      status: "running" as const,
      progress: 0.5,
      message: "Processing 1/2",
      updatedAt: "now",
    };
    mockedInvoke.mockResolvedValue({
      id: "job-2",
      kind: "demo",
      label: "Demo",
      status: "running",
      progress: 0,
      createdAt: "now",
      updatedAt: "now",
    });
    mockedListen.mockImplementation(async (_event, handler) => {
      handler({ event: "job://progress", id: 1, payload: progress, windowLabel: "main" });
      return vi.fn();
    });
    const handler = vi.fn();

    await startDemoTask("Demo", 3);
    await listenToJobProgress(handler);

    expect(mockedInvoke).toHaveBeenCalledWith("start_demo_task", {
      label: "Demo",
      steps: 3,
    });
    expect(handler).toHaveBeenCalledWith(progress);
  });

  it("wraps native file dialogs through the Tauri dialog plugin", async () => {
    mockedOpen
      .mockResolvedValueOnce("/tmp/a.txt")
      .mockResolvedValueOnce(["/tmp/a.txt", "/tmp/b.txt"])
      .mockResolvedValueOnce("/tmp");
    mockedSave.mockResolvedValue("/tmp/out.txt");
    mockedConfirm.mockResolvedValue(true);

    await expect(pickFile({ title: "Pick" })).resolves.toBe("/tmp/a.txt");
    await expect(pickFiles()).resolves.toEqual(["/tmp/a.txt", "/tmp/b.txt"]);
    await expect(pickDirectory()).resolves.toBe("/tmp");
    await expect(saveFileAs({ defaultPath: "/tmp/out.txt" })).resolves.toBe("/tmp/out.txt");
    await expect(confirmDialog({ title: "Confirm", message: "Proceed?" })).resolves.toBe(true);

    expect(mockedOpen).toHaveBeenNthCalledWith(1, {
      title: "Pick",
      multiple: false,
      filters: undefined,
    });
    expect(mockedOpen).toHaveBeenNthCalledWith(3, {
      title: undefined,
      directory: true,
      multiple: false,
    });
  });

  it("checks system dependencies through the backend command", async () => {
    mockedInvoke.mockResolvedValue({ dependencies: [] });

    await checkSystemDependencies();

    expect(mockedInvoke).toHaveBeenCalledWith("check_system_dependencies");
  });

  it("supports notification list and mark-read flow", async () => {
    mockedInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(true);

    await listNotifications();
    await markNotificationRead("note-1");

    expect(mockedInvoke).toHaveBeenNthCalledWith(1, "list_notifications");
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, "mark_notification_read", {
      id: "note-1",
    });
  });
});
