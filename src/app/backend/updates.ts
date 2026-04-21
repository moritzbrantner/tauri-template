import { callBackend } from "./errors";

export type UpdateStatus = {
  available?: boolean | null;
  currentVersion: string;
  message: string;
};

export function checkUpdateStatus(): Promise<UpdateStatus> {
  return callBackend<UpdateStatus>("check_update_status");
}

export function restartApp(): Promise<void> {
  return callBackend<void>("restart_app");
}
