import { callBackend } from "./errors";
import type { FolderWatchEvent } from "./diagnostics";

export type FolderWatchOptions = {
  path: string;
  filters?: string[];
  recursive?: boolean;
};

export type FolderWatchStatus = {
  path: string;
  filters: string[];
  recursive: boolean;
};

export function startFolderWatch(
  options: FolderWatchOptions,
): Promise<FolderWatchStatus> {
  return callBackend<FolderWatchStatus>("start_folder_watch", { options });
}

export function stopFolderWatch(): Promise<boolean> {
  return callBackend<boolean>("stop_folder_watch");
}

export function folderWatchStatus(): Promise<FolderWatchStatus | null> {
  return callBackend<FolderWatchStatus | null>("folder_watch_status");
}

export function listFolderWatchEvents(
  limit?: number,
): Promise<FolderWatchEvent[]> {
  return callBackend<FolderWatchEvent[]>("list_folder_watch_events", { limit });
}

export function clearFolderWatchEvents(): Promise<number> {
  return callBackend<number>("clear_folder_watch_events");
}
