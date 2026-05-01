import { Badge, type PlatformNavbarGroup } from "@moritzbrantner/ui";
import { createViewUrl } from "../routing";
import { viewMeta } from "../catalog";
import type { RoleSpec } from "../types";
import { NavIcon } from "./NavIcon";

type NavigationGroupOptions = {
  accessProgress: number;
  approvalCount: number;
  currentRole: RoleSpec;
  handoffFileCount: number;
  intakeProgress: number;
  intakeSubmitted: boolean;
  unreadAuditCount: number;
  writeScopesApproved: boolean;
};

export function buildNavigationGroups({
  accessProgress,
  approvalCount,
  currentRole,
  handoffFileCount,
  intakeProgress,
  intakeSubmitted,
  unreadAuditCount,
  writeScopesApproved,
}: NavigationGroupOptions): PlatformNavbarGroup[] {
  return [
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
          href: createViewUrl("overview"),
          description: viewMeta.overview.description,
          icon: <NavIcon name="overview" />,
          badge: <Badge variant="secondary">{currentRole.label}</Badge>,
        },
        {
          id: "audit",
          label: viewMeta.audit.label,
          href: createViewUrl("audit"),
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
          href: createViewUrl("intake"),
          description: viewMeta.intake.description,
          icon: <NavIcon name="intake" />,
          badge: <Badge variant={intakeSubmitted ? "secondary" : "outline"}>{intakeProgress}%</Badge>,
        },
        {
          id: "access",
          label: viewMeta.access.label,
          href: createViewUrl("access"),
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
          href: createViewUrl("approvals"),
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
          href: createViewUrl("handoff"),
          description: viewMeta.handoff.description,
          icon: <NavIcon name="handoff" />,
          badge:
            handoffFileCount > 0 ? (
              <Badge>{handoffFileCount} files</Badge>
            ) : (
              <Badge variant="outline">Waiting</Badge>
            ),
        },
      ],
    },
  ];
}

