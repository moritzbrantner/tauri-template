import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@moritzbrantner/ui";
import { SystemDependencyCard } from "../../dependencies/SystemDependencyCard";
import { DemoTaskPanel } from "../../jobs/DemoTaskPanel";
import { MetricCard } from "../components/MetricCard";
import { SnapshotRow } from "../components/SnapshotRow";
import type { RoleSpec, ViewId } from "../types";

type OverviewViewProps = {
  accessProgress: number;
  approvalCount: number;
  currentRole: RoleSpec;
  handoffProgress: number;
  intakeProgress: number;
  onNavigate: (viewId: ViewId) => void;
  unreadAuditCount: number;
};

export function OverviewView({
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
      <DemoTaskPanel />
      <SystemDependencyCard />
    </section>
  );
}
