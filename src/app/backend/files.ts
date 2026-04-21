import { callBackend } from "./errors";

export type FileValidation = {
  path: string;
  exists: boolean;
  isFile: boolean;
  sizeBytes: number;
};

export type StoredFile = {
  originalPath: string;
  storedPath: string;
  fileName: string;
  sizeBytes: number;
};

export type FileHash = {
  path: string;
  algorithm: "sha256";
  hash: string;
};

export type CleanupResult = {
  removedFiles: number;
  removedBytes: number;
};

export function validateFile(path: string): Promise<FileValidation> {
  return callBackend<FileValidation>("validate_file", { path });
}

export function readTextFile(path: string): Promise<string> {
  return callBackend<string>("read_text_file", { path });
}

export function writeTextFile(
  path: string,
  contents: string,
): Promise<boolean> {
  return callBackend<boolean>("write_text_file", { path, contents });
}

export function copyFileToAppData(
  path: string,
  subdir?: string,
): Promise<StoredFile> {
  return callBackend<StoredFile>("copy_file_to_app_data", { path, subdir });
}

export function calculateFileHash(path: string): Promise<FileHash> {
  return callBackend<FileHash>("calculate_file_hash", { path });
}

export function cleanupTempFiles(): Promise<CleanupResult> {
  return callBackend<CleanupResult>("cleanup_temp_files");
}
