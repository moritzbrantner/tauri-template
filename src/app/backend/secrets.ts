import { callBackend } from "./errors";

export function saveSecret(key: string, value: string): Promise<boolean> {
  return callBackend<boolean>("save_secret", { key, value });
}

export function loadSecret(key: string): Promise<string | null> {
  return callBackend<string | null>("load_secret", { key });
}

export function deleteSecret(key: string): Promise<boolean> {
  return callBackend<boolean>("delete_secret", { key });
}
