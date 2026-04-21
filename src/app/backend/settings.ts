import { callBackend } from "./errors";

export type AppSettings = {
  theme: "system" | "light" | "dark";
  accentColor: string;
  autoSave: boolean;
  compactMode: boolean;
  defaultProjectName: string;
};

export function loadSettings(): Promise<AppSettings> {
  return callBackend<AppSettings>("load_settings");
}

export function saveSettings(settings: AppSettings): Promise<AppSettings> {
  return callBackend<AppSettings>("save_settings", { settings });
}

export function exportSettings(settings: AppSettings): Promise<string> {
  return callBackend<string>("export_settings", { settings });
}

export function importSettings(contents: string): Promise<AppSettings> {
  return callBackend<AppSettings>("import_settings", { contents });
}

export function resetSettings(): Promise<AppSettings> {
  return callBackend<AppSettings>("reset_settings");
}

export function settingsFilePath(): Promise<string> {
  return callBackend<string>("settings_file_path");
}
