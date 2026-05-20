import { Badge, Button } from "@moritzbrantner/ui";
import { useUpdateStatus } from "./useUpdateStatus";

export function UpdateStatusButton() {
  const { checkForUpdates, installUpdate, restart, state } = useUpdateStatus();

  if (state.status === "available") {
    return (
      <Button onClick={installUpdate} type="button" variant="outline">
        Install {state.version}
      </Button>
    );
  }

  if (state.status === "ready") {
    return (
      <Button onClick={restart} type="button" variant="outline">
        Restart
      </Button>
    );
  }

  if (state.status === "installing") {
    return <Badge variant="outline">{formatInstallProgress(state.downloadedBytes, state.totalBytes)}</Badge>;
  }

  if (state.status === "none") {
    return <Badge variant="secondary">{state.message}</Badge>;
  }

  if (state.status === "error") {
    return <Badge variant="outline">Update error</Badge>;
  }

  return (
    <Button disabled={state.status === "checking"} onClick={checkForUpdates} type="button" variant="outline">
      {state.status === "checking" ? "Checking" : "Check for updates"}
    </Button>
  );
}

function formatInstallProgress(downloadedBytes: number, totalBytes?: number) {
  if (!totalBytes) {
    return "Installing";
  }

  return `${Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))}%`;
}
