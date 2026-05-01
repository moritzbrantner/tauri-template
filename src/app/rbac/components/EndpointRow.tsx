import { Badge } from "@moritzbrantner/ui";
import type { EndpointSpec } from "../types";

type EndpointRowProps = {
  currentRole: string;
  endpoint: EndpointSpec;
  locked: boolean;
};

export function EndpointRow({ currentRole, endpoint, locked }: EndpointRowProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={endpoint.method === "GET" ? "secondary" : "outline"}>
            {endpoint.method}
          </Badge>
          <code className="rounded-md bg-muted px-2 py-1 text-sm">{endpoint.path}</code>
          <Badge variant="outline">{endpoint.flow}</Badge>
        </div>
        <Badge variant={locked ? "outline" : "secondary"}>
          {locked ? `${currentRole} lacks ${endpoint.permission}` : endpoint.permission}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
    </div>
  );
}

