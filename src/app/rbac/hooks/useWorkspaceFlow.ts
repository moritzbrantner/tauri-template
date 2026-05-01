import { useMemo, useState } from "react";
import { endpointCatalog, roleCatalog } from "../catalog";
import type { Permission, RoleId } from "../types";
import { useAccessFlow } from "./useAccessFlow";
import { useApprovalsFlow } from "./useApprovalsFlow";
import { useAuditTrail } from "./useAuditTrail";
import { useHandoffFlow } from "./useHandoffFlow";
import { useIntakeFlow } from "./useIntakeFlow";

export function useWorkspaceFlow() {
  const [roleId, setRoleId] = useState<RoleId>("operator");
  const currentRole = roleCatalog[roleId];
  const currentPermissions = useMemo(
    () => new Set<Permission>(currentRole.permissions),
    [currentRole.permissions],
  );

  function hasPermission(permission: Permission) {
    return currentPermissions.has(permission);
  }

  const audit = useAuditTrail(hasPermission);
  const intake = useIntakeFlow(hasPermission, audit.enqueueAudit);
  const access = useAccessFlow(hasPermission, audit.enqueueAudit);
  const approvals = useApprovalsFlow(hasPermission, audit.enqueueAudit);
  const handoff = useHandoffFlow(hasPermission, audit.enqueueAudit);
  const availableEndpointCount = endpointCatalog.filter((endpoint) =>
    hasPermission(endpoint.permission),
  ).length;

  return {
    ...access,
    ...approvals,
    ...audit,
    ...handoff,
    ...intake,
    availableEndpointCount,
    currentRole,
    hasPermission,
    roleId,
    setRoleId,
  };
}

