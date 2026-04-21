import { invoke } from "@tauri-apps/api/core";

export type BackendError = {
  code: string;
  message: string;
};

function isBackendError(error: unknown): error is BackendError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as BackendError).code === "string" &&
    typeof (error as BackendError).message === "string"
  );
}

export function normalizeBackendError(error: unknown): BackendError {
  if (isBackendError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return { code: "internal_error", message: error.message };
  }

  return { code: "internal_error", message: String(error) };
}

export async function callBackend<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return args === undefined
      ? await invoke<T>(command)
      : await invoke<T>(command, args);
  } catch (error) {
    throw normalizeBackendError(error);
  }
}
