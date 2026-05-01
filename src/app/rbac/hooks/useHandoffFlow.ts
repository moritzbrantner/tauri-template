import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Permission, UploadItem } from "../types";

type PermissionCheck = (permission: Permission) => boolean;
type AuditWriter = (surface: string, title: string, body: string, unread?: boolean) => void;

export function useHandoffFlow(hasPermission: PermissionCheck, enqueueAudit: AuditWriter) {
  const [queuedFiles, setQueuedFiles] = useState<UploadItem[]>([]);
  const [handoffNotice, setHandoffNotice] = useState("");
  const handoffProgress =
    queuedFiles.length === 0
      ? 8
      : Math.min(100, 30 + queuedFiles.length * 18 + (handoffNotice ? 22 : 0));

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

  return {
    handleFileInput,
    handoffNotice,
    handoffProgress,
    queuedFiles,
    setQueuedFiles,
    stageHandoff,
  };
}

