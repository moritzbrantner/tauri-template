import { useState } from "react";
import type { FormEvent } from "react";
import { initialAuditFeed } from "../catalog";
import { formatTime } from "../formatters";
import type { AuditEntry, Permission } from "../types";

type PermissionCheck = (permission: Permission) => boolean;

export function useAuditTrail(hasPermission: PermissionCheck) {
  const [auditFeed, setAuditFeed] = useState<AuditEntry[]>(initialAuditFeed);
  const [noteDraft, setNoteDraft] = useState("");
  const [auditNotice, setAuditNotice] = useState("");

  const unreadAuditCount = auditFeed.filter((entry) => entry.unread).length;

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

    enqueueAudit("Audit", "Operator note", text, false);
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

  function updateNoteDraft(value: string) {
    setNoteDraft(value);
    setAuditNotice("");
  }

  return {
    auditFeed,
    auditNotice,
    enqueueAudit,
    handleNoteSubmit,
    markAllRead,
    noteDraft,
    unreadAuditCount,
    updateNoteDraft,
  };
}

