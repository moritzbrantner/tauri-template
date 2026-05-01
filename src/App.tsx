import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  PlatformNavbar,
  Progress,
  StudioTheme,
  Textarea,
  type PlatformNavbarGroup,
  type ThemeMode,
} from "@moritzbrantner/ui";
import "./App.css";
import { employees } from "./data/employees";

type ViewId =
  | "overview"
  | "intake"
  | "access"
  | "approvals"
  | "handoff"
  | "audit";

type GroupId = "discover" | "delivery";

type Permission =
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

type RoleId = "requester" | "operator" | "admin";

type WorkspaceDraft = {
  workspaceName: string;
  sponsorEmail: string;
  productSurface: string;
  launchWindow: string;
  objective: string;
  readBundle: string;
  writeBundle: string;
};

type UploadItem = {
  id: string;
  name: string;
  size: number;
  type: string;
};

type AuditEntry = {
  id: number;
  title: string;
  body: string;
  unread: boolean;
  timestamp: string;
  surface: string;
};

type EndpointSpec = {
  id: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  permission: Permission;
  flow: string;
  summary: string;
};

type ViewMeta = {
  label: string;
  groupId: GroupId;
  eyebrow: string;
  description: string;
  readPermission: Permission;
};

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

const roleCatalog: Record<
  RoleId,
  {
    label: string;
    eyebrow: string;
    description: string;
    permissions: Permission[];
  }
> = {
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

const endpointCatalog: EndpointSpec[] = [
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

const viewMeta: Record<ViewId, ViewMeta> = {
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

const initialDraft: WorkspaceDraft = {
  workspaceName: "Atlas Launch Console",
  sponsorEmail: "ada@example.com",
  productSurface: "Desktop release workspace",
  launchWindow: "2026-05-07 09:00 CET",
  objective: "Coordinate release readiness, operator assignment, RBAC checks, and final handoff.",
  readBundle: "workspace.read, access.read, approvals.read",
  writeBundle: "workspace.write, approvals.write, artifacts.write",
};

const initialAuditFeed: AuditEntry[] = [
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

const iconPaths = {
  overview: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  intake: "M7 4h10l3 3v13H7zM9 12h6M9 16h4M16 4v4h4",
  access: "M6 7h12M6 12h12M6 17h7m7-11-2 2 2 2m0-4-2 2 2 2",
  approvals: "M4 6h16v12H4zM4 10h16M10 6v12",
  handoff: "M12 15V4m0 0 4 4m-4-4-4 4M5 15v4h14v-4",
  audit: "M4 5h16v11H8l-4 4z",
  shield: "M12 3l7 3v5c0 4.6-2.9 8.9-7 10-4.1-1.1-7-5.4-7-10V6z",
  check: "m5 12 4 4L19 6",
  spark: "M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3Z",
  lock: "M8 11V8a4 4 0 1 1 8 0v3m-9 0h10v9H7z",
} as const;

function App() {
  const [activeView, setActiveView] = useState<ViewId>(() => readViewFromHash());
  const [openGroupId, setOpenGroupId] = useState<GroupId | null>(
    () => viewMeta[readViewFromHash()].groupId,
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readInitialTheme());
  const [roleId, setRoleId] = useState<RoleId>("operator");
  const [draft, setDraft] = useState<WorkspaceDraft>(initialDraft);
  const [intakeStep, setIntakeStep] = useState(1);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState("");
  const [readScopesChecked, setReadScopesChecked] = useState(false);
  const [writeScopesApproved, setWriteScopesApproved] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const deferredReviewQuery = useDeferredValue(reviewQuery);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    employees[0]?.id ?? null,
  );
  const [approvedEmployeeIds, setApprovedEmployeeIds] = useState<number[]>([]);
  const [approvalNotice, setApprovalNotice] = useState("");
  const [queuedFiles, setQueuedFiles] = useState<UploadItem[]>([]);
  const [handoffNotice, setHandoffNotice] = useState("");
  const [auditFeed, setAuditFeed] = useState<AuditEntry[]>(initialAuditFeed);
  const [noteDraft, setNoteDraft] = useState("");
  const [auditNotice, setAuditNotice] = useState("");

  useEffect(() => {
    function handleHashChange() {
      const nextView = readViewFromHash();
      setActiveView(nextView);
      setOpenGroupId(viewMeta[nextView].groupId);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  const currentRole = roleCatalog[roleId];
  const currentPermissions = useMemo(
    () => new Set<Permission>(currentRole.permissions),
    [currentRole.permissions],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = deferredReviewQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${employee.firstName} ${employee.lastName} ${employee.team} ${employee.email}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [deferredReviewQuery]);

  useEffect(() => {
    if (filteredEmployees.length === 0) {
      setSelectedEmployeeId(null);
      return;
    }

    if (!filteredEmployees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  const selectedEmployee =
    filteredEmployees.find((employee) => employee.id === selectedEmployeeId) ??
    employees.find((employee) => employee.id === selectedEmployeeId) ??
    null;

  const activeMeta = viewMeta[activeView];
  const unreadAuditCount = auditFeed.filter((entry) => entry.unread).length;
  const availableEndpointCount = endpointCatalog.filter((endpoint) =>
    currentPermissions.has(endpoint.permission),
  ).length;
  const approvalCount = approvedEmployeeIds.length;
  const completionScore = Object.values(draft).filter((value) => value.trim().length > 0).length;
  const intakeProgress = intakeSubmitted
    ? 100
    : Math.min(92, Math.round((completionScore / Object.keys(draft).length) * 75) + intakeStep * 5);
  const accessProgress = (readScopesChecked ? 45 : 10) + (writeScopesApproved ? 55 : 0);
  const handoffProgress =
    queuedFiles.length === 0 ? 8 : Math.min(100, 30 + queuedFiles.length * 18 + (handoffNotice ? 22 : 0));

  const navigationGroups: PlatformNavbarGroup[] = [
    {
      id: "discover",
      label: "Discover",
      eyebrow: "Status",
      description: "Flow summary and operational follow-up.",
      icon: <NavIcon name="overview" />,
      items: [
        {
          id: "overview",
          label: viewMeta.overview.label,
          href: "#overview",
          description: viewMeta.overview.description,
          icon: <NavIcon name="overview" />,
          badge: <Badge variant="secondary">{currentRole.label}</Badge>,
        },
        {
          id: "audit",
          label: viewMeta.audit.label,
          href: "#audit",
          description: viewMeta.audit.description,
          icon: <NavIcon name="audit" />,
          badge:
            unreadAuditCount > 0 ? (
              <Badge>{unreadAuditCount} unread</Badge>
            ) : (
              <Badge variant="outline">Clear</Badge>
            ),
        },
      ],
    },
    {
      id: "delivery",
      label: "Delivery",
      eyebrow: "Execution",
      description: "Role-aware screens for intake, access, approvals, and handoff.",
      icon: <NavIcon name="shield" />,
      items: [
        {
          id: "intake",
          label: viewMeta.intake.label,
          href: "#intake",
          description: viewMeta.intake.description,
          icon: <NavIcon name="intake" />,
          badge: <Badge variant={intakeSubmitted ? "secondary" : "outline"}>{intakeProgress}%</Badge>,
        },
        {
          id: "access",
          label: viewMeta.access.label,
          href: "#access",
          description: viewMeta.access.description,
          icon: <NavIcon name="access" />,
          badge:
            writeScopesApproved ? (
              <Badge>Ready</Badge>
            ) : (
              <Badge variant="outline">{accessProgress}%</Badge>
            ),
        },
        {
          id: "approvals",
          label: viewMeta.approvals.label,
          href: "#approvals",
          description: viewMeta.approvals.description,
          icon: <NavIcon name="approvals" />,
          badge:
            approvalCount > 0 ? (
              <Badge>{approvalCount} approved</Badge>
            ) : (
              <Badge variant="outline">Queue</Badge>
            ),
        },
        {
          id: "handoff",
          label: viewMeta.handoff.label,
          href: "#handoff",
          description: viewMeta.handoff.description,
          icon: <NavIcon name="handoff" />,
          badge:
            queuedFiles.length > 0 ? (
              <Badge>{queuedFiles.length} files</Badge>
            ) : (
              <Badge variant="outline">Waiting</Badge>
            ),
        },
      ],
    },
  ];

  function navigate(viewId: ViewId) {
    setOpenGroupId(viewMeta[viewId].groupId);
    window.location.hash = viewId === "overview" ? "" : viewId;
    startTransition(() => setActiveView(viewId));
  }

  function hasPermission(permission: Permission) {
    return currentPermissions.has(permission);
  }

  function enqueueAudit(surface: string, title: string, body: string, unread = true) {
    setAuditFeed((current) => [
      {
        id: Date.now(),
        title,
        body,
        unread,
        timestamp: formatTime(new Date()),
        surface,
      },
      ...current,
    ]);
  }

  function updateDraft<K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setIntakeNotice("");
  }

  function saveIntakeDraft() {
    if (!hasPermission("workspace.write")) {
      setIntakeNotice("The current role can read the request, but cannot write draft changes.");
      return;
    }

    setIntakeNotice(`Draft for ${draft.workspaceName} saved and ready for submission.`);
    enqueueAudit(
      "Intake",
      "Draft saved",
      `${draft.workspaceName} was updated with the latest owners, role bundles, and launch objective.`,
      false,
    );
  }

  function submitForAccessReview() {
    if (!hasPermission("workspace.write")) {
      setIntakeNotice("Submitting the workspace brief requires workspace.write.");
      return;
    }

    setIntakeSubmitted(true);
    setIntakeNotice(`${draft.workspaceName} was sent forward for RBAC access review.`);
    enqueueAudit(
      "Intake",
      "Request submitted",
      `${draft.workspaceName} moved into access planning with ${draft.readBundle} and ${draft.writeBundle}.`,
    );
  }

  function verifyReadScopes() {
    if (!hasPermission("access.read")) {
      setAccessNotice("Reading policy bundles requires access.read.");
      return;
    }

    setReadScopesChecked(true);
    setAccessNotice("Read scopes verified against the API inventory.");
    enqueueAudit(
      "Access",
      "Read scopes verified",
      "Each GET surface in the flow has an explicit read role attached before the UI accesses it.",
      false,
    );
  }

  function approveWriteScopes() {
    if (!hasPermission("access.write")) {
      setAccessNotice("Approving write scopes requires an admin role with access.write.");
      return;
    }

    setWriteScopesApproved(true);
    setAccessNotice("Write scopes approved. Mutation endpoints are cleared for execution roles.");
    enqueueAudit(
      "Access",
      "Write scopes approved",
      "PATCH and POST endpoints were explicitly approved under the admin role before the flow proceeds.",
    );
  }

  function approveSelectedEmployee() {
    if (!hasPermission("approvals.write")) {
      setApprovalNotice("Approving an operator requires approvals.write.");
      return;
    }

    if (!selectedEmployee) {
      return;
    }

    setApprovedEmployeeIds((current) =>
      current.includes(selectedEmployee.id) ? current : [...current, selectedEmployee.id],
    );
    setApprovalNotice(
      `${selectedEmployee.firstName} ${selectedEmployee.lastName} was approved as the accountable launch operator.`,
    );
    enqueueAudit(
      "Approvals",
      "Operator approved",
      `${selectedEmployee.firstName} ${selectedEmployee.lastName} is now attached to the release decision record.`,
    );
  }

  function addQueuedFiles(fileList: FileList) {
    if (!hasPermission("artifacts.write")) {
      setHandoffNotice("Adding release files requires artifacts.write.");
      return;
    }

    const nextFiles = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    }));

    setQueuedFiles((current) =>
      Array.from(new Map([...current, ...nextFiles].map((file) => [file.id, file])).values()),
    );
    setHandoffNotice("");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) {
      addQueuedFiles(event.currentTarget.files);
    }
  }

  function stageHandoff() {
    if (!hasPermission("artifacts.write")) {
      setHandoffNotice("Staging the release package requires artifacts.write.");
      return;
    }

    if (queuedFiles.length === 0) {
      return;
    }

    setHandoffNotice(`Release bundle staged with ${queuedFiles.length} artifacts and ready for delivery.`);
    enqueueAudit(
      "Handoff",
      "Release bundle staged",
      `${queuedFiles.length} artifacts were queued for QA and downstream package delivery.`,
    );
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteDraft.trim();

    if (!text) {
      return;
    }

    if (!hasPermission("audit.write")) {
      setAuditNotice("Publishing a follow-up note requires audit.write.");
      return;
    }

    setAuditFeed((current) => [
      {
        id: Date.now(),
        title: "Operator note",
        body: text,
        unread: false,
        timestamp: formatTime(new Date()),
        surface: "Audit",
      },
      ...current,
    ]);
    setNoteDraft("");
    setAuditNotice("Operator note added to the audit trail.");
  }

  function markAllRead() {
    if (!hasPermission("audit.write")) {
      setAuditNotice("Marking events as read requires audit.write.");
      return;
    }

    setAuditFeed((current) => current.map((entry) => ({ ...entry, unread: false })));
    setAuditNotice("Audit feed cleared for the current operator.");
  }

  const readLocked = !hasPermission(activeMeta.readPermission);

  return (
    <StudioTheme className="min-h-screen">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(18,94,73,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(219,161,64,0.18),transparent_28%),linear-gradient(180deg,rgba(252,250,243,0.98),rgba(244,240,229,1))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(14,95,74,0.24),transparent_32%),radial-gradient(circle_at_top_right,rgba(194,142,39,0.22),transparent_24%),linear-gradient(180deg,rgba(12,17,15,0.98),rgba(9,12,11,1))]">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 md:px-6">
          <PlatformNavbar
            brand={
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                  Gatehouse
                </span>
                <span className="text-base font-semibold">RBAC-ready Tauri operator workspace</span>
              </div>
            }
            groups={navigationGroups}
            actions={
              <div className="hidden items-center gap-2 lg:flex">
                <Badge variant="outline">{activeMeta.eyebrow}</Badge>
                <Badge variant="secondary">{currentRole.label}</Badge>
              </div>
            }
            variant="desktop"
            activeItemId={activeView}
            activeGroupId={activeMeta.groupId}
            openGroupId={openGroupId}
            onOpenGroupChange={(groupId) => setOpenGroupId(groupId as GroupId | null)}
            onNavigate={(item) => navigate(item.id as ViewId)}
            themeModeSwitch={{
              mode: themeMode,
              onModeChange: setThemeMode,
            }}
          />

          <RoleControlPanel
            activeRoleId={roleId}
            availableEndpointCount={availableEndpointCount}
            currentRole={currentRole}
            onRoleChange={setRoleId}
            unreadAuditCount={unreadAuditCount}
          />

          <main className="grid flex-1 gap-6">
            {readLocked ? (
              <LockedView
                description={activeMeta.description}
                permission={activeMeta.readPermission}
                title={activeMeta.label}
                onNavigate={navigate}
              />
            ) : null}

            {!readLocked && activeView === "overview" ? (
              <OverviewView
                accessProgress={accessProgress}
                approvalCount={approvalCount}
                currentRole={currentRole}
                handoffProgress={handoffProgress}
                intakeProgress={intakeProgress}
                onNavigate={navigate}
                unreadAuditCount={unreadAuditCount}
              />
            ) : null}

            {!readLocked && activeView === "intake" ? (
              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle aria-level={1} role="heading">Workspace intake brief</CardTitle>
                    <CardDescription>{viewMeta.intake.description}</CardDescription>
                    <CardAction>
                      <Badge variant="outline">Step {intakeStep} of 3</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    <Progress value={intakeProgress} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Workspace name">
                        <Input
                          value={draft.workspaceName}
                          onChange={(event) =>
                            updateDraft("workspaceName", event.currentTarget.value)
                          }
                        />
                      </Field>
                      <Field label="Sponsor email">
                        <Input
                          type="email"
                          value={draft.sponsorEmail}
                          onChange={(event) =>
                            updateDraft("sponsorEmail", event.currentTarget.value)
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Product surface">
                        <Input
                          value={draft.productSurface}
                          onChange={(event) =>
                            updateDraft("productSurface", event.currentTarget.value)
                          }
                        />
                      </Field>
                      <Field label="Launch window">
                        <Input
                          value={draft.launchWindow}
                          onChange={(event) =>
                            updateDraft("launchWindow", event.currentTarget.value)
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Operational objective">
                      <Textarea
                        value={draft.objective}
                        onChange={(event) => updateDraft("objective", event.currentTarget.value)}
                      />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Requested read bundle">
                        <Input
                          value={draft.readBundle}
                          onChange={(event) => updateDraft("readBundle", event.currentTarget.value)}
                        />
                      </Field>
                      <Field label="Requested write bundle">
                        <Input
                          value={draft.writeBundle}
                          onChange={(event) => updateDraft("writeBundle", event.currentTarget.value)}
                        />
                      </Field>
                    </div>
                    {intakeNotice ? (
                      <Alert>
                        <AlertTitle>Intake status</AlertTitle>
                        <AlertDescription>{intakeNotice}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <div className="flex gap-2">
                      <Button
                        disabled={intakeStep === 1}
                        onClick={() => setIntakeStep((current) => Math.max(1, current - 1))}
                        variant="outline"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={intakeStep === 3}
                        onClick={() => setIntakeStep((current) => Math.min(3, current + 1))}
                        variant="outline"
                      >
                        Continue
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveIntakeDraft} variant="outline">
                        Save draft
                      </Button>
                      <Button onClick={submitForAccessReview}>Submit for access review</Button>
                    </div>
                  </CardFooter>
                </Card>

                <Card className="border border-border/70 bg-card/88">
                  <CardHeader>
                    <CardTitle aria-level={2} role="heading">Flow checks</CardTitle>
                    <CardDescription>
                      Intake only moves forward after the owner, objective, and requested roles are explicit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <ChecklistItem
                      description="A named workspace and accountable sponsor exist before any server call."
                      done={intakeStep > 1 || intakeSubmitted}
                      title="Identity captured"
                    />
                    <ChecklistItem
                      description="The objective and launch timing are concrete enough to scope read access."
                      done={intakeStep > 2 || intakeSubmitted}
                      title="Context defined"
                    />
                    <ChecklistItem
                      description="Requested read and write bundles are written down before RBAC review."
                      done={intakeSubmitted}
                      title="Bundle submitted"
                    />
                  </CardContent>
                </Card>
              </section>
            ) : null}

            {!readLocked && activeView === "access" ? (
              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle aria-level={1} role="heading">RBAC access plan</CardTitle>
                    <CardDescription>{viewMeta.access.description}</CardDescription>
                    <CardAction>
                      <Badge variant="outline">{availableEndpointCount} endpoints visible</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <Progress value={accessProgress} />
                    <div className="grid gap-3">
                      {endpointCatalog.map((endpoint) => (
                        <EndpointRow
                          key={endpoint.id}
                          currentRole={currentRole.label}
                          endpoint={endpoint}
                          locked={!hasPermission(endpoint.permission)}
                        />
                      ))}
                    </div>
                    {accessNotice ? (
                      <Alert>
                        <AlertTitle>Access planning</AlertTitle>
                        <AlertDescription>{accessNotice}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <Button onClick={verifyReadScopes} variant="outline">
                      Verify read scopes
                    </Button>
                    <Button onClick={approveWriteScopes}>Approve write scopes</Button>
                  </CardFooter>
                </Card>

                <Card className="border border-border/70 bg-card/88">
                  <CardHeader>
                    <CardTitle aria-level={2} role="heading">Policy outcome</CardTitle>
                    <CardDescription>
                      Read access and write access are treated separately so the flow cannot mutate prematurely.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <ChecklistItem
                      description="Every GET endpoint has an explicit role gate before the client tries to load it."
                      done={readScopesChecked}
                      title="Read surfaces mapped"
                    />
                    <ChecklistItem
                      description="POST and PATCH endpoints remain locked until an admin approves the write bundle."
                      done={writeScopesApproved}
                      title="Write scopes approved"
                    />
                    <ChecklistItem
                      description="The requested role bundle now matches the server contract for this release flow."
                      done={readScopesChecked && writeScopesApproved}
                      title="Flow can proceed"
                    />
                  </CardContent>
                </Card>
              </section>
            ) : null}

            {!readLocked && activeView === "approvals" ? (
              <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="border border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle aria-level={1} role="heading">Approval board</CardTitle>
                    <CardDescription>{viewMeta.approvals.description}</CardDescription>
                    <CardAction>
                      <Badge variant="outline">{filteredEmployees.length} matches</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <Field label="Search reviewers">
                      <Input
                        aria-label="Search reviewers"
                        placeholder="Search by name, team, or email"
                        value={reviewQuery}
                        onChange={(event) => setReviewQuery(event.currentTarget.value)}
                      />
                    </Field>
                    <div className="grid gap-3">
                      {filteredEmployees.map((employee) => {
                        const approved = approvedEmployeeIds.includes(employee.id);
                        const selected = employee.id === selectedEmployeeId;

                        return (
                          <button
                            key={employee.id}
                            type="button"
                            className="grid gap-1 rounded-xl border border-border/70 bg-background/70 p-4 text-left transition hover:border-primary/40 hover:bg-accent/40"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              setApprovalNotice("");
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {employee.firstName} {employee.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">{employee.team}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {approved ? <Badge>Approved</Badge> : null}
                                {selected ? <Badge variant="secondary">Selected</Badge> : null}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                              <span>{employee.email}</span>
                              <span aria-label={`Review ${employee.firstName} ${employee.lastName}`}>
                                Review {employee.firstName} {employee.lastName}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/88">
                  <CardHeader>
                    <CardTitle aria-level={2} role="heading">Selected reviewer</CardTitle>
                    <CardDescription>
                      Record who owns the operational approval once the RBAC plan is acceptable.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {selectedEmployee ? (
                      <>
                        <div className="grid gap-2">
                          <p className="text-2xl font-semibold">
                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{selectedEmployee.team}</Badge>
                            <Badge variant="outline">
                              {selectedEmployee.active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {formatCurrency(selectedEmployee.salary)}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          <p>Started {selectedEmployee.startDate}</p>
                          <p>Manager ID: {selectedEmployee.managerId ?? "Executive sponsor"}</p>
                          <p>
                            Bonus eligible: {selectedEmployee.bonusEligible ? "Yes" : "No"}
                          </p>
                        </div>
                        <Button onClick={approveSelectedEmployee}>Approve operator</Button>
                        {approvalNotice ? (
                          <Alert>
                            <AlertTitle>Approval status</AlertTitle>
                            <AlertDescription>{approvalNotice}</AlertDescription>
                          </Alert>
                        ) : null}
                      </>
                    ) : (
                      <Alert>
                        <AlertTitle>No reviewer selected</AlertTitle>
                        <AlertDescription>Adjust the search to bring a reviewer into view.</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : null}

            {!readLocked && activeView === "handoff" ? (
              <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="border border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle aria-level={1} role="heading">Release handoff</CardTitle>
                    <CardDescription>{viewMeta.handoff.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    <Progress value={handoffProgress} />
                    <label className="grid gap-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6 text-center">
                      <span className="text-sm font-medium">Add release files</span>
                      <span className="text-sm text-muted-foreground">
                        Upload installers, release metadata, and QA notes after the right write role is active.
                      </span>
                      <input
                        aria-label="Add release files"
                        className="sr-only"
                        multiple
                        onChange={handleFileInput}
                        type="file"
                      />
                      <span className="inline-flex justify-center">
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-sm">
                          Choose files
                        </span>
                      </span>
                    </label>
                    <div className="grid gap-3">
                      {queuedFiles.length === 0 ? (
                        <Alert>
                          <AlertTitle>No artifacts staged</AlertTitle>
                          <AlertDescription>
                            The bundle remains empty until a role with artifacts.write uploads files.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        queuedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm"
                          >
                            <div className="grid gap-1">
                              <span className="font-medium">{file.name}</span>
                              <span className="text-muted-foreground">{file.type}</span>
                            </div>
                            <Badge variant="outline">{formatBytes(file.size)}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                    {handoffNotice ? (
                      <Alert>
                        <AlertTitle>Handoff state</AlertTitle>
                        <AlertDescription>{handoffNotice}</AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <Button
                      disabled={queuedFiles.length === 0}
                      onClick={() => setQueuedFiles([])}
                      variant="outline"
                    >
                      Clear files
                    </Button>
                    <Button disabled={queuedFiles.length === 0} onClick={stageHandoff}>
                      Stage bundle
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border border-border/70 bg-card/88">
                  <CardHeader>
                    <CardTitle aria-level={2} role="heading">Bundle readiness</CardTitle>
                    <CardDescription>
                      The handoff screen stays explicit about the mutation permissions needed to ship.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <ChecklistItem
                      description="At least one artifact is attached to the release record."
                      done={queuedFiles.length > 0}
                      title="Artifacts added"
                    />
                    <ChecklistItem
                      description="The bundle includes installer files plus supporting context for QA."
                      done={queuedFiles.length > 1}
                      title="Context attached"
                    />
                    <ChecklistItem
                      description="An operator has explicitly staged the package for downstream delivery."
                      done={Boolean(handoffNotice)}
                      title="Bundle staged"
                    />
                  </CardContent>
                </Card>
              </section>
            ) : null}

            {!readLocked && activeView === "audit" ? (
              <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="border border-border/70 bg-card/95">
                  <CardHeader>
                    <CardTitle aria-level={1} role="heading">Audit trail</CardTitle>
                    <CardDescription>{viewMeta.audit.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="grid gap-4" onSubmit={handleNoteSubmit}>
                      <Field label="Operator note">
                        <Textarea
                          placeholder="Write the next follow-up or escalation note"
                          value={noteDraft}
                          onChange={(event) => {
                            setNoteDraft(event.currentTarget.value);
                            setAuditNotice("");
                          }}
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-3">
                        <Button type="submit">Add note</Button>
                        <Button onClick={markAllRead} type="button" variant="outline">
                          Mark all read
                        </Button>
                      </div>
                      {auditNotice ? (
                        <Alert>
                          <AlertTitle>Audit action</AlertTitle>
                          <AlertDescription>{auditNotice}</AlertDescription>
                        </Alert>
                      ) : null}
                    </form>
                  </CardContent>
                </Card>

                <Card className="border border-border/70 bg-card/88">
                  <CardHeader>
                    <CardTitle aria-level={2} role="heading">Generated events</CardTitle>
                    <CardDescription>
                      Every major step writes a follow-up entry so downstream roles can read the release trail.
                    </CardDescription>
                    <CardAction>
                      <Badge variant="outline">{unreadAuditCount} unread</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {auditFeed.map((entry) => (
                      <AuditEventCard entry={entry} key={entry.id} />
                    ))}
                  </CardContent>
                </Card>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </StudioTheme>
  );
}

type RoleControlPanelProps = {
  activeRoleId: RoleId;
  availableEndpointCount: number;
  currentRole: (typeof roleCatalog)[RoleId];
  onRoleChange: (roleId: RoleId) => void;
  unreadAuditCount: number;
};

function RoleControlPanel({
  activeRoleId,
  availableEndpointCount,
  currentRole,
  onRoleChange,
  unreadAuditCount,
}: RoleControlPanelProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Role context</CardTitle>
          <CardDescription>
            Every read and write action in the flow assumes the server enforces RBAC. Switch roles to inspect the screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            {(
              Object.keys(roleCatalog) as RoleId[]
            ).map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                aria-label={roleCatalog[roleOption].label}
                aria-pressed={activeRoleId === roleOption}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  activeRoleId === roleOption
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-background/70 hover:border-primary/40 hover:bg-accent/40"
                }`}
                onClick={() => onRoleChange(roleOption)}
              >
                <p className="font-medium">{roleCatalog[roleOption].label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roleCatalog[roleOption].eyebrow}
                </p>
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{currentRole.label}</Badge>
              <Badge variant="outline">{availableEndpointCount} API surfaces visible</Badge>
              <Badge variant="outline">{unreadAuditCount} unread events</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{currentRole.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Active permissions</CardTitle>
          <CardDescription>
            Reads and writes are both explicit. Missing scopes should block the corresponding UI state.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currentRole.permissions.map((permission) => (
            <Badge key={permission} variant="outline">
              {permission}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

type OverviewViewProps = {
  accessProgress: number;
  approvalCount: number;
  currentRole: (typeof roleCatalog)[RoleId];
  handoffProgress: number;
  intakeProgress: number;
  onNavigate: (viewId: ViewId) => void;
  unreadAuditCount: number;
};

function OverviewView({
  accessProgress,
  approvalCount,
  currentRole,
  handoffProgress,
  intakeProgress,
  onNavigate,
  unreadAuditCount,
}: OverviewViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} className="text-3xl" role="heading">
            RBAC-ready operator workspace
          </CardTitle>
          <CardDescription>
            Screens and user flows are organized around the permission contract first: intake, access review,
            approvals, bundle staging, and audit follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Intake" meta="Brief completion" value={`${intakeProgress}%`} />
            <MetricCard label="Access" meta="Policy readiness" value={`${accessProgress}%`} />
            <MetricCard label="Approvals" meta="Assigned operators" value={String(approvalCount)} />
            <MetricCard label="Audit" meta="Unread events" value={String(unreadAuditCount)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button onClick={() => onNavigate("intake")}>Open intake brief</Button>
            <Button onClick={() => onNavigate("access")} variant="outline">
              Open access plan
            </Button>
            <Button onClick={() => onNavigate("approvals")} variant="outline">
              Open approval board
            </Button>
            <Button onClick={() => onNavigate("handoff")} variant="outline">
              Open release handoff
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Flow snapshot</CardTitle>
          <CardDescription>
            {currentRole.label} is the current lens. The flow below reflects what that role can actually do.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SnapshotRow label="Workspace brief captured" value={`${intakeProgress}%`} />
          <SnapshotRow label="RBAC policy readiness" value={`${accessProgress}%`} />
          <SnapshotRow label="Approved operators" value={String(approvalCount)} />
          <SnapshotRow label="Bundle staging" value={`${handoffProgress}%`} />
          <SnapshotRow label="Unread audit events" value={String(unreadAuditCount)} />
        </CardContent>
      </Card>
    </section>
  );
}

type LockedViewProps = {
  description: string;
  permission: Permission;
  title: string;
  onNavigate: (viewId: ViewId) => void;
};

function LockedView({ description, permission, title, onNavigate }: LockedViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">{title} is locked</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <AlertTitle>Missing read role</AlertTitle>
            <AlertDescription>
              The current persona cannot load this screen because the server would require {permission}.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate("overview")}>Return to overview</Button>
            <Button onClick={() => onNavigate("intake")} variant="outline">
              Open intake brief
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Why the lock exists</CardTitle>
          <CardDescription>
            Read access is treated as a server-side privilege, not a frontend assumption.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            description="The UI only renders screens that match the current role's read permissions."
            done
            title="Read gates respected"
          />
          <ChecklistItem
            description="Mutation actions remain deeper in the flow and require their own write permissions."
            done
            title="Write gates stay separate"
          />
        </CardContent>
      </Card>
    </section>
  );
}

type EndpointRowProps = {
  currentRole: string;
  endpoint: EndpointSpec;
  locked: boolean;
};

function EndpointRow({ currentRole, endpoint, locked }: EndpointRowProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={endpoint.method === "GET" ? "secondary" : "outline"}>
            {endpoint.method}
          </Badge>
          <code className="rounded-md bg-muted px-2 py-1 text-sm">{endpoint.path}</code>
          <Badge variant="outline">{endpoint.flow}</Badge>
        </div>
        <Badge variant={locked ? "outline" : "secondary"}>
          {locked ? `${currentRole} lacks ${endpoint.permission}` : endpoint.permission}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
    </div>
  );
}

type AuditEventCardProps = {
  entry: AuditEntry;
};

function AuditEventCard({ entry }: AuditEventCardProps) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{entry.title}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{entry.surface}</Badge>
          {entry.unread ? <Badge>Unread</Badge> : <Badge variant="secondary">Read</Badge>}
          <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{entry.body}</p>
    </div>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

type ChecklistItemProps = {
  done: boolean;
  title: string;
  description: string;
};

function ChecklistItem({ done, title, description }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <span className="mt-0.5 text-primary">
        <NavIcon name={done ? "check" : "spark"} />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  meta: string;
};

function MetricCard({ label, value, meta }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}

type SnapshotRowProps = {
  label: string;
  value: string;
};

function SnapshotRow({ label, value }: SnapshotRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

type NavIconName = keyof typeof iconPaths;

function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

function readViewFromHash(): ViewId {
  const slug = window.location.hash.replace(/^#/, "");

  switch (slug) {
    case "intake":
    case "access":
    case "approvals":
    case "handoff":
    case "audit":
      return slug;
    default:
      return "overview";
  }
}

function readInitialTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default App;
