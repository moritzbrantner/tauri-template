export type FoundationRole = "SUPERADMIN" | "ADMIN" | "MANAGER" | "USER";

export type FoundationUploadItem = {
  id: string;
  name: string;
  sizeInBytes: number;
  source: string;
  status: "queued" | "complete" | "failed";
};

export type FoundationBackend = {
  getNotifications?: () => Promise<unknown>;
  markNotificationRead?: (notificationId: string) => Promise<unknown>;
  markAllNotificationsRead?: () => Promise<unknown>;
  getSettings?: () => Promise<unknown>;
  updateSettings?: (settings: Record<string, unknown>) => Promise<unknown>;
  getDataEntryTables?: (role?: FoundationRole) => unknown;
  getUploads?: () => Promise<FoundationUploadItem[]>;
  addUploadSample?: () => Promise<FoundationUploadItem[]>;
};

export type FoundationRuntime = {
  platform: "tauri";
  locale: string;
  labels: {
    appName: string;
  };
  backend: FoundationBackend;
  navigate: (href: string) => void;
  capabilities: {
    auth: boolean;
    profile: boolean;
    people: boolean;
    notifications: boolean;
    settings: boolean;
    reportProblem: boolean;
    dataEntry: boolean;
    uploads: boolean;
  };
};

export function createMemoryFoundationBackend({
  role,
}: {
  role: FoundationRole;
}): FoundationBackend & { role: FoundationRole } {
  return { role };
}
