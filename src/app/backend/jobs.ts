import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { callBackend } from "./errors";

export const jobEvents = {
  started: "job://started",
  progress: "job://progress",
  completed: "job://completed",
  failed: "job://failed",
  cancelled: "job://cancelled",
} as const;

export type Job = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function startJob(kind: string, payload: unknown): Promise<Job> {
  return callBackend<Job>("start_job", { kind, payload });
}

export function cancelJob(jobId: string): Promise<boolean> {
  return callBackend<boolean>("cancel_job", { jobId });
}

export function jobStatus(jobId: string): Promise<Job> {
  return callBackend<Job>("job_status", { jobId });
}

export function listJobs(): Promise<Job[]> {
  return callBackend<Job[]>("list_jobs");
}

export function clearFinishedJobs(): Promise<number> {
  return callBackend<number>("clear_finished_jobs");
}

export function onJobProgress(handler: (job: Job) => void): Promise<UnlistenFn> {
  return listen<Job>(jobEvents.progress, (event) => handler(event.payload));
}
