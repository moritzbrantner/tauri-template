import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@moritzbrantner/ui";
import { useEffect, useMemo, useState } from "react";
import {
  cancelJob,
  clearFinishedJobs,
  listenToJobProgress,
  listJobs,
  startDemoTask,
  type Job,
  type JobProgressEvent,
} from "../backend/jobs";
import { normalizeBackendError, type BackendError } from "../backend/errors";

export function DemoTaskPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<BackendError | null>(null);
  const [starting, setStarting] = useState(false);

  const activeJob = useMemo(
    () => jobs.find((job) => job.kind === "demo" && !isFinished(job.status)),
    [jobs],
  );

  async function refreshJobs() {
    try {
      setJobs(await listJobs());
    } catch (caught) {
      setError(normalizeBackendError(caught));
    }
  }

  async function startTask() {
    setStarting(true);
    setError(null);

    try {
      const job = await startDemoTask("Desktop primitive demo", 8);
      setJobs((current) => upsertJob(current, job));
    } catch (caught) {
      setError(normalizeBackendError(caught));
    } finally {
      setStarting(false);
    }
  }

  async function cancelActiveJob() {
    if (!activeJob) {
      return;
    }

    try {
      await cancelJob(activeJob.id);
      await refreshJobs();
    } catch (caught) {
      setError(normalizeBackendError(caught));
    }
  }

  async function clearFinished() {
    try {
      await clearFinishedJobs();
      await refreshJobs();
    } catch (caught) {
      setError(normalizeBackendError(caught));
    }
  }

  useEffect(() => {
    void refreshJobs();
    let unsubscribe: (() => void) | undefined;

    void listenToJobProgress((event) => {
      setJobs((current) => upsertProgressEvent(current, event));
    })
      .then((unlisten) => {
        unsubscribe = unlisten;
      })
      .catch((caught) => {
        setError(normalizeBackendError(caught));
      });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <Card className="border border-border/70 bg-card/88">
      <CardHeader>
        <CardTitle aria-level={2} role="heading">Demo task</CardTitle>
        <CardDescription>Long-running command lifecycle with progress events.</CardDescription>
        <CardAction>
          <Button disabled={starting || Boolean(activeJob)} onClick={startTask} type="button" variant="outline">
            Start task
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <Alert>
            <AlertTitle>Task unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {activeJob ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{activeJob.label ?? activeJob.kind}</span>
              <span className="text-muted-foreground">{activeJob.message ?? activeJob.status}</span>
            </div>
            <Progress value={Math.round(activeJob.progress * 100)} />
            <Button onClick={cancelActiveJob} type="button" variant="outline">
              Cancel
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No active demo task</span>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{jobs.filter((job) => isFinished(job.status)).length} finished</span>
          <Button onClick={clearFinished} type="button" variant="outline">
            Clear finished
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function isFinished(status: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function upsertJob(jobs: Job[], nextJob: Job) {
  return [nextJob, ...jobs.filter((job) => job.id !== nextJob.id)];
}

function upsertProgressEvent(jobs: Job[], event: JobProgressEvent) {
  const existing = jobs.find((job) => job.id === event.jobId);
  const nextJob: Job = {
    createdAt: existing?.createdAt ?? event.updatedAt,
    id: event.jobId,
    kind: existing?.kind ?? "demo",
    label: event.label,
    message: event.message,
    progress: event.progress,
    status: event.status,
    updatedAt: event.updatedAt,
  };

  return upsertJob(jobs, nextJob);
}
