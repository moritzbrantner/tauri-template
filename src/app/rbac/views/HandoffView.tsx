import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
} from "@moritzbrantner/ui";
import type { ChangeEvent } from "react";
import { ChecklistItem } from "../components/ChecklistItem";
import { formatBytes } from "../formatters";
import type { UploadItem } from "../types";

type HandoffViewProps = {
  description: string;
  handoffNotice: string;
  handoffProgress: number;
  onClearFiles: () => void;
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onStageHandoff: () => void;
  queuedFiles: UploadItem[];
};

export function HandoffView({
  description,
  handoffNotice,
  handoffProgress,
  onClearFiles,
  onFileInput,
  onStageHandoff,
  queuedFiles,
}: HandoffViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">Release handoff</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Progress value={handoffProgress} />
          <label className="grid gap-3 rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6 text-center">
            <span className="text-sm font-medium">Add release files</span>
            <span className="text-sm text-muted-foreground">
              Upload installers, release metadata, and QA notes after the right write role is active.
            </span>
            <input
              aria-label="Add release files"
              className="sr-only"
              multiple
              onChange={onFileInput}
              type="file"
            />
            <span className="inline-flex justify-center">
              <span className="rounded-full border border-border bg-background px-3 py-1 text-sm">
                Choose files
              </span>
            </span>
          </label>
          <div className="grid gap-3">
            {queuedFiles.length === 0 ? (
              <Alert>
                <AlertTitle>No artifacts staged</AlertTitle>
                <AlertDescription>
                  The bundle remains empty until a role with artifacts.write uploads files.
                </AlertDescription>
              </Alert>
            ) : (
              queuedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm"
                >
                  <div className="grid gap-1">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-muted-foreground">{file.type}</span>
                  </div>
                  <Badge variant="outline">{formatBytes(file.size)}</Badge>
                </div>
              ))
            )}
          </div>
          {handoffNotice ? (
            <Alert>
              <AlertTitle>Handoff state</AlertTitle>
              <AlertDescription>{handoffNotice}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button disabled={queuedFiles.length === 0} onClick={onClearFiles} variant="outline">
            Clear files
          </Button>
          <Button disabled={queuedFiles.length === 0} onClick={onStageHandoff}>
            Stage bundle
          </Button>
        </CardFooter>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Bundle readiness</CardTitle>
          <CardDescription>
            The handoff screen stays explicit about the mutation permissions needed to ship.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            description="At least one artifact is attached to the release record."
            done={queuedFiles.length > 0}
            title="Artifacts added"
          />
          <ChecklistItem
            description="The bundle includes installer files plus supporting context for QA."
            done={queuedFiles.length > 1}
            title="Context attached"
          />
          <ChecklistItem
            description="An operator has explicitly staged the package for downstream delivery."
            done={Boolean(handoffNotice)}
            title="Bundle staged"
          />
        </CardContent>
      </Card>
    </section>
  );
}

