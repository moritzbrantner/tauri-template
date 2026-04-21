import { callBackend } from "./errors";

export type AppInfo = {
  productName: string;
  version: string;
  identifier: string;
};

export type RuntimeInfo = {
  os: string;
  arch: string;
  debug: boolean;
};

export type AppPaths = {
  configDir: string;
  dataDir: string;
  cacheDir: string;
  logDir: string;
};

export function getAppInfo(): Promise<AppInfo> {
  return callBackend<AppInfo>("get_app_info");
}

export function getRuntimeInfo(): Promise<RuntimeInfo> {
  return callBackend<RuntimeInfo>("get_runtime_info");
}

export function getAppPaths(): Promise<AppPaths> {
  return callBackend<AppPaths>("get_app_paths");
}
