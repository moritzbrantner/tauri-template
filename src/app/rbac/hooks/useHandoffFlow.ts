import { useState } from "react";
import type { ChangeEvent } from "react";
import { pickFiles } from "../../backend/dialogs";
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

  async function pickNativeFiles() {
    if (!hasPermission("artifacts.write")) {
      setHandoffNotice("Adding release files requires artifacts.write.");
      return;
    }

    try {
      const paths = await pickFiles({
        title: "Choose release artifacts",
        filters: [
          {
            name: "Release artifacts",
            extensions: ["json", "txt", "md", "zip", "dmg", "msi", "AppImage", "png", "jpg", "jpeg"],
          },
        ],
      });

      const nextFiles = paths.map((path) => {
        const pathSegments = path.split(/[\\/]/).filter(Boolean);
        const name = pathSegments[pathSegments.length - 1] ?? path;
        return {
          id: `native-${path}`,
          localPath: path,
          name,
          size: 0,
          type: "local file",
        } satisfies UploadItem;
      });

      if (nextFiles.length === 0) {
        return;
      }

      setQueuedFiles((current) =>
        Array.from(new Map([...current, ...nextFiles].map((file) => [file.id, file])).values()),
      );
      setHandoffNotice("");
    } catch (error) {
      setHandoffNotice(error instanceof Error ? error.message : String(error));
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
    pickNativeFiles,
    queuedFiles,
    setQueuedFiles,
    stageHandoff,
  };
}
