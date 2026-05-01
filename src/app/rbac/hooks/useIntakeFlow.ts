import { useState } from "react";
import { initialDraft } from "../catalog";
import type { Permission, WorkspaceDraft } from "../types";

type PermissionCheck = (permission: Permission) => boolean;
type AuditWriter = (surface: string, title: string, body: string, unread?: boolean) => void;

export function useIntakeFlow(hasPermission: PermissionCheck, enqueueAudit: AuditWriter) {
  const [draft, setDraft] = useState<WorkspaceDraft>(initialDraft);
  const [intakeStep, setIntakeStep] = useState(1);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [intakeNotice, setIntakeNotice] = useState("");

  const completionScore = Object.values(draft).filter((value) => value.trim().length > 0).length;
  const intakeProgress = intakeSubmitted
    ? 100
    : Math.min(92, Math.round((completionScore / Object.keys(draft).length) * 75) + intakeStep * 5);

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

  return {
    draft,
    intakeNotice,
    intakeProgress,
    intakeStep,
    intakeSubmitted,
    saveIntakeDraft,
    setIntakeStep,
    submitForAccessReview,
    updateDraft,
  };
}

