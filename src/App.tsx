import { Badge, PlatformNavbar, StudioTheme } from "@moritzbrantner/ui";
import "./App.css";
import { buildNavigationGroups } from "./app/rbac/components/navigationGroups";
import { RoleControlPanel } from "./app/rbac/components/RoleControlPanel";
import { useRoutedView } from "./app/rbac/hooks/useRoutedView";
import { useThemeMode } from "./app/rbac/hooks/useThemeMode";
import { useWorkspaceFlow } from "./app/rbac/hooks/useWorkspaceFlow";
import { readAuthPageFromPath } from "./app/rbac/routing";
import type { GroupId, ViewId } from "./app/rbac/types";
import { AccessView } from "./app/rbac/views/AccessView";
import { ApprovalsView } from "./app/rbac/views/ApprovalsView";
import { AuditView } from "./app/rbac/views/AuditView";
import { HandoffView } from "./app/rbac/views/HandoffView";
import { IntakeView } from "./app/rbac/views/IntakeView";
import { LockedView } from "./app/rbac/views/LockedView";
import { OverviewView } from "./app/rbac/views/OverviewView";
import { UpdateStatusButton } from "./app/updates/UpdateStatusButton";
import { LoginPage } from "./pages/auth/LoginPage";
import { PasswordForgottenPage } from "./pages/auth/PasswordForgottenPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

function App() {
  const authPage = readAuthPageFromPath();
  const { activeMeta, activeView, navigate, openGroupId, setOpenGroupId } = useRoutedView();
  const { setThemeMode, themeMode } = useThemeMode();
  const flow = useWorkspaceFlow();

  if (authPage === "login") {
    return <LoginPage />;
  }

  if (authPage === "register") {
    return <RegisterPage />;
  }

  if (authPage === "password-forgotten") {
    return <PasswordForgottenPage />;
  }

  const readLocked = !flow.hasPermission(activeMeta.readPermission);
  const navigationGroups = buildNavigationGroups({
    accessProgress: flow.accessProgress,
    approvalCount: flow.approvalCount,
    currentRole: flow.currentRole,
    handoffFileCount: flow.queuedFiles.length,
    intakeProgress: flow.intakeProgress,
    intakeSubmitted: flow.intakeSubmitted,
    unreadAuditCount: flow.unreadAuditCount,
    writeScopesApproved: flow.writeScopesApproved,
  });

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
                <UpdateStatusButton />
                <Badge variant="outline">{activeMeta.eyebrow}</Badge>
                <Badge variant="secondary">{flow.currentRole.label}</Badge>
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
            activeRoleId={flow.roleId}
            availableEndpointCount={flow.availableEndpointCount}
            currentRole={flow.currentRole}
            onRoleChange={flow.setRoleId}
            unreadAuditCount={flow.unreadAuditCount}
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
                accessProgress={flow.accessProgress}
                approvalCount={flow.approvalCount}
                currentRole={flow.currentRole}
                handoffProgress={flow.handoffProgress}
                intakeProgress={flow.intakeProgress}
                onNavigate={navigate}
                unreadAuditCount={flow.unreadAuditCount}
              />
            ) : null}

            {!readLocked && activeView === "intake" ? (
              <IntakeView
                description={activeMeta.description}
                draft={flow.draft}
                intakeNotice={flow.intakeNotice}
                intakeProgress={flow.intakeProgress}
                intakeStep={flow.intakeStep}
                onBack={() => flow.setIntakeStep((current) => Math.max(1, current - 1))}
                onContinue={() => flow.setIntakeStep((current) => Math.min(3, current + 1))}
                onSaveDraft={flow.saveIntakeDraft}
                onSubmitForAccessReview={flow.submitForAccessReview}
                onUpdateDraft={flow.updateDraft}
                submitted={flow.intakeSubmitted}
              />
            ) : null}

            {!readLocked && activeView === "access" ? (
              <AccessView
                accessNotice={flow.accessNotice}
                accessProgress={flow.accessProgress}
                availableEndpointCount={flow.availableEndpointCount}
                currentRole={flow.currentRole}
                description={activeMeta.description}
                hasPermission={flow.hasPermission}
                onApproveWriteScopes={flow.approveWriteScopes}
                onVerifyReadScopes={flow.verifyReadScopes}
                readScopesChecked={flow.readScopesChecked}
                writeScopesApproved={flow.writeScopesApproved}
              />
            ) : null}

            {!readLocked && activeView === "approvals" ? (
              <ApprovalsView
                approvalNotice={flow.approvalNotice}
                approvedEmployeeIds={flow.approvedEmployeeIds}
                description={activeMeta.description}
                filteredEmployees={flow.filteredEmployees}
                onApproveSelectedEmployee={flow.approveSelectedEmployee}
                onReviewQueryChange={flow.setReviewQuery}
                onSelectEmployee={flow.selectEmployee}
                reviewQuery={flow.reviewQuery}
                selectedEmployee={flow.selectedEmployee}
              />
            ) : null}

            {!readLocked && activeView === "handoff" ? (
              <HandoffView
                description={activeMeta.description}
                handoffNotice={flow.handoffNotice}
                handoffProgress={flow.handoffProgress}
                onClearFiles={() => flow.setQueuedFiles([])}
                onFileInput={flow.handleFileInput}
                onNativePick={flow.pickNativeFiles}
                onStageHandoff={flow.stageHandoff}
                queuedFiles={flow.queuedFiles}
              />
            ) : null}

            {!readLocked && activeView === "audit" ? (
              <AuditView
                auditFeed={flow.auditFeed}
                auditNotice={flow.auditNotice}
                description={activeMeta.description}
                noteDraft={flow.noteDraft}
                onMarkAllRead={flow.markAllRead}
                onNoteDraftChange={flow.updateNoteDraft}
                onNoteSubmit={flow.handleNoteSubmit}
                unreadAuditCount={flow.unreadAuditCount}
              />
            ) : null}
          </main>
        </div>
      </div>
    </StudioTheme>
  );
}

export default App;
