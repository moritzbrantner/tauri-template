import type { employees } from "../../data/employees";

export type ViewId =
  | "overview"
  | "intake"
  | "access"
  | "approvals"
  | "handoff"
  | "audit";

export type AuthPageId = "login" | "register" | "password-forgotten";

export type GroupId = "discover" | "delivery";

export type Permission =
  | "workspace.read"
  | "workspace.write"
  | "access.read"
  | "access.write"
  | "approvals.read"
  | "approvals.write"
  | "artifacts.read"
  | "artifacts.write"
  | "audit.read"
  | "audit.write";

export type RoleId = "requester" | "operator" | "admin";

export type WorkspaceDraft = {
  workspaceName: string;
  sponsorEmail: string;
  productSurface: string;
  launchWindow: string;
  objective: string;
  readBundle: string;
  writeBundle: string;
};

export type UploadItem = {
  id: string;
  localPath?: string;
  name: string;
  size: number;
  type: string;
};

export type AuditEntry = {
  id: number;
  title: string;
  body: string;
  unread: boolean;
  timestamp: string;
  surface: string;
};

export type EndpointSpec = {
  id: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  permission: Permission;
  flow: string;
  summary: string;
};

export type ViewMeta = {
  label: string;
  groupId: GroupId;
  eyebrow: string;
  description: string;
  readPermission: Permission;
};

export type RoleSpec = {
  label: string;
  eyebrow: string;
  description: string;
  permissions: Permission[];
};

export type Employee = (typeof employees)[number];
