import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@moritzbrantner/ui";
import { roleCatalog } from "../catalog";
import type { RoleId, RoleSpec } from "../types";

type RoleControlPanelProps = {
  activeRoleId: RoleId;
  availableEndpointCount: number;
  currentRole: RoleSpec;
  onRoleChange: (roleId: RoleId) => void;
  unreadAuditCount: number;
};

export function RoleControlPanel({
  activeRoleId,
  availableEndpointCount,
  currentRole,
  onRoleChange,
  unreadAuditCount,
}: RoleControlPanelProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Role context</CardTitle>
          <CardDescription>
            Every read and write action in the flow assumes the server enforces RBAC. Switch roles to inspect the screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            {(Object.keys(roleCatalog) as RoleId[]).map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                aria-label={roleCatalog[roleOption].label}
                aria-pressed={activeRoleId === roleOption}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  activeRoleId === roleOption
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-background/70 hover:border-primary/40 hover:bg-accent/40"
                }`}
                onClick={() => onRoleChange(roleOption)}
              >
                <p className="font-medium">{roleCatalog[roleOption].label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roleCatalog[roleOption].eyebrow}
                </p>
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{currentRole.label}</Badge>
              <Badge variant="outline">{availableEndpointCount} API surfaces visible</Badge>
              <Badge variant="outline">{unreadAuditCount} unread events</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{currentRole.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Active permissions</CardTitle>
          <CardDescription>
            Reads and writes are both explicit. Missing scopes should block the corresponding UI state.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currentRole.permissions.map((permission) => (
            <Badge key={permission} variant="outline">
              {permission}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

