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
import { useEffect, useState } from "react";
import { toDesktopAssetUrl } from "../../platform/assets";
import { ChecklistItem } from "../components/ChecklistItem";
import { formatBytes } from "../formatters";
import type { UploadItem } from "../types";

type HandoffViewProps = {
  description: string;
  handoffNotice: string;
  handoffProgress: number;
  onClearFiles: () => void;
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onNativePick: () => void;
  onStageHandoff: () => void;
  queuedFiles: UploadItem[];
};

export function HandoffView({
  description,
  handoffNotice,
  handoffProgress,
  onClearFiles,
  onFileInput,
  onNativePick,
  onStageHandoff,
  queuedFiles,
}: HandoffViewProps) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function resolvePreviews() {
      const entries = await Promise.all(
        queuedFiles
          .filter((file) => file.localPath && isPreviewableImage(file))
          .map(async (file) => [file.id, await toDesktopAssetUrl(file.localPath ?? "")] as const),
      );

      if (!active) {
        return;
      }

      setPreviewUrls(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
        ),
      );
    }

    void resolvePreviews();
    return () => {
      active = false;
    };
  }, [queuedFiles]);

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
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onNativePick} type="button" variant="outline">
              Open native picker
            </Button>
          </div>
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
                  <div className="flex min-w-0 items-center gap-3">
                    {previewUrls[file.id] ? (
                      <img
                        alt=""
                        className="h-10 w-10 rounded-md border border-border object-cover"
                        src={previewUrls[file.id]}
                      />
                    ) : null}
                    <div className="grid min-w-0 gap-1">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-muted-foreground">
                        {file.type}
                        {file.localPath ? " from native picker" : ""}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {file.size > 0 ? formatBytes(file.size) : "Local"}
                  </Badge>
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

function isPreviewableImage(file: UploadItem) {
  return (
    file.type.startsWith("image/") ||
    /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name)
  );
}
