import { callBackend } from "./errors";
import type { Job } from "./jobs";

export type Upload = {
  id: string;
  originalPath: string;
  stagedPath: string;
  fileName: string;
  sizeBytes: number;
  status: string;
  jobId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function stageUpload(path: string): Promise<Upload> {
  return callBackend<Upload>("stage_upload", { path });
}

export function processUpload(uploadId: string): Promise<Job> {
  return callBackend<Job>("process_upload", { uploadId });
}

export function cancelUpload(uploadId: string): Promise<boolean> {
  return callBackend<boolean>("cancel_upload", { uploadId });
}

export function getUploadStatus(uploadId: string): Promise<Upload> {
  return callBackend<Upload>("get_upload_status", { uploadId });
}

export function listUploads(): Promise<Upload[]> {
  return callBackend<Upload[]>("list_uploads");
}

export function clearUpload(uploadId: string): Promise<boolean> {
  return callBackend<boolean>("clear_upload", { uploadId });
}
