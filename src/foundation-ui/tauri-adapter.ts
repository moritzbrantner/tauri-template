import {
  createMemoryFoundationBackend,
  type FoundationBackend,
  type FoundationRuntime,
  type FoundationUploadItem,
} from "./contracts";
import {
  createNotificationsPageData,
  defaultAppSettings,
  getTablePermissionViews,
  normalizeAppSettings,
  type AppSettings as FoundationSettings,
  type NotificationFeedItem,
} from "@moritzbrantner/foundation-contract";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../app/backend/notifications";
import { loadSettings, saveSettings } from "../app/backend/settings";
import { listUploads, type Upload } from "../app/backend/uploads";

export function createTauriFoundationBackend(): FoundationBackend {
  const memoryBackend = createMemoryFoundationBackend({ role: "ADMIN" });

  return {
    ...memoryBackend,
    getNotifications: async () =>
      createNotificationsPageData((await listNotifications()).map(toNotificationFeedItem)),
    markNotificationRead: async (notificationId) => {
      await markNotificationRead(notificationId);
      return createNotificationsPageData((await listNotifications()).map(toNotificationFeedItem));
    },
    markAllNotificationsRead: async () => {
      await markAllNotificationsRead();
      return createNotificationsPageData((await listNotifications()).map(toNotificationFeedItem));
    },
    getSettings: async () => toFoundationSettings(await loadSettings()),
    updateSettings: async (settings) => {
      const current = await loadSettings();
      const nextFoundationSettings = normalizeAppSettings({
        ...toFoundationSettings(current),
        ...settings,
      });
      await saveSettings({
        ...current,
        theme: nextFoundationSettings.reducedMotion ? current.theme : current.theme,
        compactMode: nextFoundationSettings.compactSpacing,
        autoSave: nextFoundationSettings.showHotkeyHints,
      });
      return nextFoundationSettings;
    },
    getDataEntryTables: (role) => getTablePermissionViews(role ?? "ADMIN"),
    getUploads: async () => (await listUploads()).map(toFoundationUploadItem),
    addUploadSample: async () => (await listUploads()).map(toFoundationUploadItem),
  };
}

export function createTauriFoundationRuntime({
  backend = createTauriFoundationBackend(),
  navigate,
}: {
  backend?: FoundationBackend;
  navigate: FoundationRuntime["navigate"];
}): FoundationRuntime {
  return {
    platform: "tauri",
    locale: navigator.language || "en-US",
    labels: {
      appName: "Tauri App",
    },
    backend,
    navigate,
    capabilities: {
      auth: true,
      profile: true,
      people: true,
      notifications: true,
      settings: true,
      reportProblem: true,
      dataEntry: true,
      uploads: true,
    },
  };
}

function toNotificationFeedItem(notification: Awaited<ReturnType<typeof listNotifications>>[number]): NotificationFeedItem {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    href: null,
    status: notification.read ? "read" : "unread",
    createdAt: notification.createdAt,
  };
}

function toFoundationSettings(settings: Awaited<ReturnType<typeof loadSettings>>): FoundationSettings {
  return {
    ...defaultAppSettings,
    compactSpacing: settings.compactMode,
    showHotkeyHints: settings.autoSave,
    reducedMotion: false,
  };
}

function toFoundationUploadItem(upload: Upload): FoundationUploadItem {
  return {
    id: upload.id,
    name: upload.fileName,
    sizeInBytes: upload.sizeBytes,
    source: upload.originalPath,
    status: upload.status === "completed" ? "complete" : upload.status === "failed" ? "failed" : "queued",
  };
}
