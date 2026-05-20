export type RuntimeKind = "browser" | "tauri";

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export function getRuntimeKind(): RuntimeKind {
  if (typeof window !== "undefined" && (window as TauriWindow).__TAURI_INTERNALS__) {
    return "tauri";
  }

  return "browser";
}

export function isTauriRuntime(): boolean {
  return getRuntimeKind() === "tauri";
}
