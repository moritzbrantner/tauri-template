import { callBackend } from "./errors";

export type CreateWorkspaceInput = {
  name: string;
  directory: string;
};

export type Workspace = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type RecentWorkspace = {
  name: string;
  path: string;
  lastOpenedAt: string;
};

export function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  return callBackend<Workspace>("create_workspace", { input });
}

export function openWorkspace(path: string): Promise<Workspace> {
  return callBackend<Workspace>("open_workspace", { path });
}

export function saveWorkspace(workspace: Workspace): Promise<Workspace> {
  return callBackend<Workspace>("save_workspace", { workspace });
}

export function closeWorkspace(): Promise<boolean> {
  return callBackend<boolean>("close_workspace");
}

export function getActiveWorkspace(): Promise<Workspace | null> {
  return callBackend<Workspace | null>("get_active_workspace");
}

export function listRecentWorkspaces(): Promise<RecentWorkspace[]> {
  return callBackend<RecentWorkspace[]>("list_recent_workspaces");
}

export function removeRecentWorkspace(path: string): Promise<boolean> {
  return callBackend<boolean>("remove_recent_workspace", { path });
}
