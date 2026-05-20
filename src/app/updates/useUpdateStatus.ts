import { useCallback, useState } from "react";
import type { BackendError } from "../backend/errors";
import { normalizeBackendError } from "../backend/errors";
import { restartApp } from "../backend/updates";

type DesktopUpdate = {
  version: string;
  date?: string;
  body?: string;
  downloadAndInstall: (
    onEvent?: (event: DownloadEvent) => void,
  ) => Promise<void>;
};

type DownloadEvent =
  | {
      event: "Started";
      data: { contentLength?: number };
    }
  | {
      event: "Progress";
      data: { chunkLength: number };
    }
  | {
      event: "Finished";
    };

export type UpdateUiState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "checking";
      message: string;
    }
  | {
      status: "none";
      currentVersion: string;
      message: string;
    }
  | {
      status: "available";
      update: DesktopUpdate;
      version: string;
      message: string;
    }
  | {
      status: "installing";
      update: DesktopUpdate;
      version: string;
      downloadedBytes: number;
      totalBytes?: number;
      message: string;
    }
  | {
      status: "ready";
      version: string;
      message: string;
    }
  | {
      status: "error";
      error: BackendError;
      message: string;
    };

export function useUpdateStatus() {
  const [state, setState] = useState<UpdateUiState>({
    status: "idle",
    message: "Updates",
  });

  const checkForUpdates = useCallback(async () => {
    setState({ status: "checking", message: "Checking" });

    try {
      const [{ check }, { getVersion }] = await Promise.all([
        import("@tauri-apps/plugin-updater"),
        import("@tauri-apps/api/app"),
      ]);
      const [update, currentVersion] = await Promise.all([check(), getVersion()]);

      if (!update) {
        setState({
          status: "none",
          currentVersion,
          message: `Current ${currentVersion}`,
        });
        return;
      }

      setState({
        status: "available",
        update,
        version: update.version,
        message: `Update ${update.version}`,
      });
    } catch (error) {
      const normalized = normalizeBackendError(error);
      setState({
        status: "error",
        error: normalized,
        message: normalized.message,
      });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (state.status !== "available" && state.status !== "installing") {
      return;
    }

    const { update, version } = state;
    let downloadedBytes = 0;
    let totalBytes: number | undefined;
    setState({
      status: "installing",
      update,
      version,
      downloadedBytes,
      totalBytes,
      message: "Installing",
    });

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
        }

        setState({
          status: "installing",
          update,
          version,
          downloadedBytes,
          totalBytes,
          message: event.event === "Finished" ? "Finishing" : "Installing",
        });
      });

      setState({
        status: "ready",
        version,
        message: "Restart to finish",
      });
    } catch (error) {
      const normalized = normalizeBackendError(error);
      setState({
        status: "error",
        error: normalized,
        message: normalized.message,
      });
    }
  }, [state]);

  const restart = useCallback(async () => {
    try {
      await restartApp();
    } catch (error) {
      const normalized = normalizeBackendError(error);
      setState({
        status: "error",
        error: normalized,
        message: normalized.message,
      });
    }
  }, []);

  return {
    checkForUpdates,
    installUpdate,
    restart,
    state,
  };
}
