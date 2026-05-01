import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@moritzbrantner/ui";
import { ChecklistItem } from "../components/ChecklistItem";
import type { Permission, ViewId } from "../types";

type LockedViewProps = {
  description: string;
  permission: Permission;
  title: string;
  onNavigate: (viewId: ViewId) => void;
};

export function LockedView({ description, permission, title, onNavigate }: LockedViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">{title} is locked</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <AlertTitle>Missing read role</AlertTitle>
            <AlertDescription>
              The current persona cannot load this screen because the server would require {permission}.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate("overview")}>Return to overview</Button>
            <Button onClick={() => onNavigate("intake")} variant="outline">
              Open intake brief
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Why the lock exists</CardTitle>
          <CardDescription>
            Read access is treated as a server-side privilege, not a frontend assumption.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            description="The UI only renders screens that match the current role's read permissions."
            done
            title="Read gates respected"
          />
          <ChecklistItem
            description="Mutation actions remain deeper in the flow and require their own write permissions."
            done
            title="Write gates stay separate"
          />
        </CardContent>
      </Card>
    </section>
  );
}

