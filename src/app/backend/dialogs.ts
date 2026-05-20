export type FileDialogFilter = {
  name: string;
  extensions: string[];
};

type OpenDialogOptions = {
  title?: string;
  multiple?: boolean;
  directory?: boolean;
  filters?: FileDialogFilter[];
};

type SaveDialogOptions = {
  title?: string;
  defaultPath?: string;
  filters?: FileDialogFilter[];
};

type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: "info" | "warning" | "error";
};

async function loadDialogPlugin() {
  return import("@tauri-apps/plugin-dialog");
}

export async function pickFile(options?: {
  title?: string;
  multiple?: false;
  filters?: FileDialogFilter[];
}): Promise<string | null> {
  const { open } = await loadDialogPlugin();
  const selected = await open({
    title: options?.title,
    multiple: false,
    filters: options?.filters,
  } satisfies OpenDialogOptions);

  return typeof selected === "string" ? selected : null;
}

export async function pickFiles(options?: {
  title?: string;
  filters?: FileDialogFilter[];
}): Promise<string[]> {
  const { open } = await loadDialogPlugin();
  const selected = await open({
    title: options?.title,
    multiple: true,
    filters: options?.filters,
  } satisfies OpenDialogOptions);

  if (Array.isArray(selected)) {
    return selected;
  }

  return typeof selected === "string" ? [selected] : [];
}

export async function pickDirectory(options?: {
  title?: string;
}): Promise<string | null> {
  const { open } = await loadDialogPlugin();
  const selected = await open({
    title: options?.title,
    directory: true,
    multiple: false,
  } satisfies OpenDialogOptions);

  return typeof selected === "string" ? selected : null;
}

export async function saveFileAs(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileDialogFilter[];
}): Promise<string | null> {
  const { save } = await loadDialogPlugin();
  const selected = await save({
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
  } satisfies SaveDialogOptions);

  return typeof selected === "string" ? selected : null;
}

export async function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const { confirm } = await loadDialogPlugin();
  return confirm(options.message, {
    title: options.title,
    kind: options.kind,
    okLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
  });
}
