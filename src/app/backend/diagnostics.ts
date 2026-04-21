import { callBackend } from "./errors";
import type { AppInfo, AppPaths, RuntimeInfo } from "./appInfo";
import type { CleanupResult } from "./files";
import type { Job } from "./jobs";

export type SettingsStatus = {
  valid: boolean;
  message?: string | null;
};

export type MigrationStatus = {
  databasePath: string;
  applied: boolean;
  tables: string[];
};

export type FolderWatchEvent = {
  id: string;
  watchPath: string;
  kind: string;
  paths: string[];
  message?: string | null;
  occurredAt: string;
};

export type HealthReport = {
  ok: boolean;
  appInfo: AppInfo;
  runtimeInfo: RuntimeInfo;
  appPaths: AppPaths;
  settings: SettingsStatus;
  database: MigrationStatus;
  recentJobs: Job[];
  recentFolderWatchErrors: FolderWatchEvent[];
};

export type LogFile = {
  path: string;
  sizeBytes: number;
};

export type DiagnosticsBundle = {
  path: string;
  includedFiles: string[];
};

export function healthCheck(): Promise<HealthReport> {
  return callBackend<HealthReport>("health_check");
}

export function getLogFiles(): Promise<LogFile[]> {
  return callBackend<LogFile[]>("get_log_files");
}

export function exportDiagnosticsBundle(): Promise<DiagnosticsBundle> {
  return callBackend<DiagnosticsBundle>("export_diagnostics_bundle");
}

export function clearLogs(): Promise<CleanupResult> {
  return callBackend<CleanupResult>("clear_logs");
}
