import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@moritzbrantner/ui";
import { useEffect, useState } from "react";
import {
  checkSystemDependencies,
  type SystemDependencyReport,
} from "../backend/dependencies";
import { normalizeBackendError, type BackendError } from "../backend/errors";

export function SystemDependencyCard() {
  const [report, setReport] = useState<SystemDependencyReport | null>(null);
  const [error, setError] = useState<BackendError | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      setReport(await checkSystemDependencies());
    } catch (caught) {
      setError(normalizeBackendError(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <Card className="border border-border/70 bg-card/88">
      <CardHeader>
        <CardTitle aria-level={2} role="heading">System dependencies</CardTitle>
        <CardDescription>Optional local tools detected for desktop workflows.</CardDescription>
        <CardAction>
          <Button disabled={loading} onClick={refresh} type="button" variant="outline">
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <Alert>
            <AlertTitle>Dependency check unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {report?.dependencies.map((dependency) => (
          <div
            className="grid gap-2 rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm"
            key={dependency.name}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{dependency.name}</span>
              <Badge variant={dependency.available ? "secondary" : "outline"}>
                {dependency.available ? "Available" : "Missing"}
              </Badge>
            </div>
            <div className="grid gap-1 text-muted-foreground">
              <span>{dependency.version ?? dependency.message ?? "No version reported"}</span>
              {dependency.resolvedPath ? <span className="truncate">{dependency.resolvedPath}</span> : null}
            </div>
          </div>
        ))}
        {!report && !error ? (
          <span className="text-sm text-muted-foreground">
            {loading ? "Checking dependencies" : "No dependency report loaded"}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
