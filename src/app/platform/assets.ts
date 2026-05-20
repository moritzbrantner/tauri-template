import { isTauriRuntime } from "./runtime";

export async function toDesktopAssetUrl(path: string): Promise<string | null> {
  if (!path.trim()) {
    return null;
  }

  if (!isTauriRuntime()) {
    return path;
  }

  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(path);
}
