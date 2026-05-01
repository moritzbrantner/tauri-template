import type {
  AuditEntry,
  EndpointSpec,
  Permission,
  RoleId,
  RoleSpec,
  ViewId,
  ViewMeta,
  WorkspaceDraft,
} from "./types";

const allPermissions: Permission[] = [
  "workspace.read",
  "workspace.write",
  "access.read",
  "access.write",
  "approvals.read",
  "approvals.write",
  "artifacts.read",
  "artifacts.write",
  "audit.read",
  "audit.write",
];

export const roleCatalog: Record<RoleId, RoleSpec> = {
  requester: {
    label: "Requester",
    eyebrow: "Intake only",
    description:
      "Can prepare the workspace brief and review the RBAC plan, but cannot approve scopes or ship bundles.",
    permissions: ["workspace.read", "workspace.write", "access.read"],
  },
  operator: {
    label: "Operator",
    eyebrow: "Delivery",
    description:
      "Can move the request through approvals, handoff, and follow-up, but RBAC policy changes stay locked.",
    permissions: [
      "workspace.read",
      "workspace.write",
      "access.read",
      "approvals.read",
      "approvals.write",
      "artifacts.read",
      "artifacts.write",
      "audit.read",
      "audit.write",
    ],
  },
  admin: {
    label: "Admin",
    eyebrow: "Full control",
    description:
      "Can read and write across every step, including role bundles, endpoint approvals, and operational follow-up.",
    permissions: allPermissions,
  },
};

export const endpointCatalog: EndpointSpec[] = [
  {
    id: "workspace-read",
    method: "GET",
    path: "/api/workspaces/:id",
    permission: "workspace.read",
    flow: "Intake",
    summary: "Load the draft, ownership, and launch context.",
  },
  {
    id: "workspace-write",
    method: "POST",
    path: "/api/workspaces",
    permission: "workspace.write",
    flow: "Intake",
    summary: "Create or update the workspace request before review.",
  },
  {
    id: "access-read",
    method: "GET",
    path: "/api/access-policies/:id",
    permission: "access.read",
    flow: "Access",
    summary: "Inspect read and write policy bundles for the request.",
  },
  {
    id: "access-write",
    method: "PATCH",
    path: "/api/access-policies/:id",
    permission: "access.write",
    flow: "Access",
    summary: "Approve elevated write scopes before automation runs.",
  },
  {
    id: "approvals-read",
    method: "GET",
    path: "/api/reviewers",
    permission: "approvals.read",
    flow: "Approvals",
    summary: "Load the reviewer roster for the release owner decision.",
  },
  {
    id: "approvals-write",
    method: "POST",
    path: "/api/approvals",
    permission: "approvals.write",
    flow: "Approvals",
    summary: "Record approval decisions and the accountable operator.",
  },
  {
    id: "artifacts-write",
    method: "POST",
    path: "/api/releases/:id/files",
    permission: "artifacts.write",
    flow: "Handoff",
    summary: "Upload installers, notes, and release metadata into the bundle.",
  },
  {
    id: "audit-write",
    method: "POST",
    path: "/api/audit-notes",
    permission: "audit.write",
    flow: "Audit",
    summary: "Publish follow-up notes for the release timeline.",
  },
];

export const viewMeta: Record<ViewId, ViewMeta> = {
  overview: {
    label: "Overview",
    groupId: "discover",
    eyebrow: "Flow map",
    description: "A role-aware map of the release flow and the API permissions behind it.",
    readPermission: "workspace.read",
  },
  intake: {
    label: "Intake brief",
    groupId: "delivery",
    eyebrow: "Flow 01",
    description: "Capture the workspace request, owners, and intended role bundle.",
    readPermission: "workspace.read",
  },
  access: {
    label: "Access plan",
    groupId: "delivery",
    eyebrow: "Flow 02",
    description: "Review API surfaces and approve read and write scopes under RBAC.",
    readPermission: "access.read",
  },
  approvals: {
    label: "Approval board",
    groupId: "delivery",
    eyebrow: "Flow 03",
    description: "Select the accountable operator and record launch approval.",
    readPermission: "approvals.read",
  },
  handoff: {
    label: "Release handoff",
    groupId: "delivery",
    eyebrow: "Flow 04",
    description: "Stage artifacts and prepare the package bundle for delivery.",
    readPermission: "artifacts.read",
  },
  audit: {
    label: "Audit trail",
    groupId: "discover",
    eyebrow: "Flow 05",
    description: "Track generated events and send follow-up notes after each action.",
    readPermission: "audit.read",
  },
};

export const initialDraft: WorkspaceDraft = {
  workspaceName: "Atlas Launch Console",
  sponsorEmail: "ada@example.com",
  productSurface: "Desktop release workspace",
  launchWindow: "2026-05-07 09:00 CET",
  objective: "Coordinate release readiness, operator assignment, RBAC checks, and final handoff.",
  readBundle: "workspace.read, access.read, approvals.read",
  writeBundle: "workspace.write, approvals.write, artifacts.write",
};

export const initialAuditFeed: AuditEntry[] = [
  {
    id: 1,
    title: "Request imported",
    body: "Atlas Launch Console was pulled into the workspace queue and marked ready for intake review.",
    unread: true,
    timestamp: "08:42",
    surface: "Intake",
  },
  {
    id: 2,
    title: "RBAC baseline attached",
    body: "Server endpoints were annotated with explicit read and write scopes before UI work began.",
    unread: false,
    timestamp: "09:05",
    surface: "Access",
  },
];

