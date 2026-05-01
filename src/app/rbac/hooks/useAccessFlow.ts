import { useState } from "react";
import type { Permission } from "../types";

type PermissionCheck = (permission: Permission) => boolean;
type AuditWriter = (surface: string, title: string, body: string, unread?: boolean) => void;

export function useAccessFlow(hasPermission: PermissionCheck, enqueueAudit: AuditWriter) {
  const [readScopesChecked, setReadScopesChecked] = useState(false);
  const [writeScopesApproved, setWriteScopesApproved] = useState(false);
  const [accessNotice, setAccessNotice] = useState("");
  const accessProgress = (readScopesChecked ? 45 : 10) + (writeScopesApproved ? 55 : 0);

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

  return {
    accessNotice,
    accessProgress,
    approveWriteScopes,
    readScopesChecked,
    verifyReadScopes,
    writeScopesApproved,
  };
}

