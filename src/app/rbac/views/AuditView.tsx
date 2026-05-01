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
  Textarea,
} from "@moritzbrantner/ui";
import type { FormEvent } from "react";
import { AuditEventCard } from "../components/AuditEventCard";
import { Field } from "../components/Field";
import type { AuditEntry } from "../types";

type AuditViewProps = {
  auditFeed: AuditEntry[];
  auditNotice: string;
  description: string;
  noteDraft: string;
  onMarkAllRead: () => void;
  onNoteDraftChange: (value: string) => void;
  onNoteSubmit: (event: FormEvent<HTMLFormElement>) => void;
  unreadAuditCount: number;
};

export function AuditView({
  auditFeed,
  auditNotice,
  description,
  noteDraft,
  onMarkAllRead,
  onNoteDraftChange,
  onNoteSubmit,
  unreadAuditCount,
}: AuditViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">Audit trail</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onNoteSubmit}>
            <Field label="Operator note">
              <Textarea
                placeholder="Write the next follow-up or escalation note"
                value={noteDraft}
                onChange={(event) => onNoteDraftChange(event.currentTarget.value)}
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Button type="submit">Add note</Button>
              <Button onClick={onMarkAllRead} type="button" variant="outline">
                Mark all read
              </Button>
            </div>
            {auditNotice ? (
              <Alert>
                <AlertTitle>Audit action</AlertTitle>
                <AlertDescription>{auditNotice}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Generated events</CardTitle>
          <CardDescription>
            Every major step writes a follow-up entry so downstream roles can read the release trail.
          </CardDescription>
          <CardAction>
            <Badge variant="outline">{unreadAuditCount} unread</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {auditFeed.map((entry) => (
            <AuditEventCard entry={entry} key={entry.id} />
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

