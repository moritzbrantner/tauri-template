import { Badge } from "@moritzbrantner/ui";
import type { AuditEntry } from "../types";

type AuditEventCardProps = {
  entry: AuditEntry;
};

export function AuditEventCard({ entry }: AuditEventCardProps) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{entry.title}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{entry.surface}</Badge>
          {entry.unread ? <Badge>Unread</Badge> : <Badge variant="secondary">Read</Badge>}
          <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{entry.body}</p>
    </div>
  );
}

