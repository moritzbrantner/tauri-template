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
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
} from "@moritzbrantner/ui";
import { endpointCatalog } from "../catalog";
import { ChecklistItem } from "../components/ChecklistItem";
import { EndpointRow } from "../components/EndpointRow";
import type { Permission, RoleSpec } from "../types";

type AccessViewProps = {
  accessNotice: string;
  accessProgress: number;
  availableEndpointCount: number;
  currentRole: RoleSpec;
  description: string;
  hasPermission: (permission: Permission) => boolean;
  onApproveWriteScopes: () => void;
  onVerifyReadScopes: () => void;
  readScopesChecked: boolean;
  writeScopesApproved: boolean;
};

export function AccessView({
  accessNotice,
  accessProgress,
  availableEndpointCount,
  currentRole,
  description,
  hasPermission,
  onApproveWriteScopes,
  onVerifyReadScopes,
  readScopesChecked,
  writeScopesApproved,
}: AccessViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">RBAC access plan</CardTitle>
          <CardDescription>{description}</CardDescription>
          <CardAction>
            <Badge variant="outline">{availableEndpointCount} endpoints visible</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Progress value={accessProgress} />
          <div className="grid gap-3">
            {endpointCatalog.map((endpoint) => (
              <EndpointRow
                key={endpoint.id}
                currentRole={currentRole.label}
                endpoint={endpoint}
                locked={!hasPermission(endpoint.permission)}
              />
            ))}
          </div>
          {accessNotice ? (
            <Alert>
              <AlertTitle>Access planning</AlertTitle>
              <AlertDescription>{accessNotice}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button onClick={onVerifyReadScopes} variant="outline">
            Verify read scopes
          </Button>
          <Button onClick={onApproveWriteScopes}>Approve write scopes</Button>
        </CardFooter>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Policy outcome</CardTitle>
          <CardDescription>
            Read access and write access are treated separately so the flow cannot mutate prematurely.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            description="Every GET endpoint has an explicit role gate before the client tries to load it."
            done={readScopesChecked}
            title="Read surfaces mapped"
          />
          <ChecklistItem
            description="POST and PATCH endpoints remain locked until an admin approves the write bundle."
            done={writeScopesApproved}
            title="Write scopes approved"
          />
          <ChecklistItem
            description="The requested role bundle now matches the server contract for this release flow."
            done={readScopesChecked && writeScopesApproved}
            title="Flow can proceed"
          />
        </CardContent>
      </Card>
    </section>
  );
}

