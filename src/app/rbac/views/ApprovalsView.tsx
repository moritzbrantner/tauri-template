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
  Input,
} from "@moritzbrantner/ui";
import { Field } from "../components/Field";
import { formatCurrency } from "../formatters";
import type { Employee } from "../types";

type ApprovalsViewProps = {
  approvalNotice: string;
  approvedEmployeeIds: number[];
  description: string;
  filteredEmployees: Employee[];
  onApproveSelectedEmployee: () => void;
  onReviewQueryChange: (value: string) => void;
  onSelectEmployee: (employee: Employee) => void;
  reviewQuery: string;
  selectedEmployee: Employee | null;
};

export function ApprovalsView({
  approvalNotice,
  approvedEmployeeIds,
  description,
  filteredEmployees,
  onApproveSelectedEmployee,
  onReviewQueryChange,
  onSelectEmployee,
  reviewQuery,
  selectedEmployee,
}: ApprovalsViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">Approval board</CardTitle>
          <CardDescription>{description}</CardDescription>
          <CardAction>
            <Badge variant="outline">{filteredEmployees.length} matches</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Search reviewers">
            <Input
              aria-label="Search reviewers"
              placeholder="Search by name, team, or email"
              value={reviewQuery}
              onChange={(event) => onReviewQueryChange(event.currentTarget.value)}
            />
          </Field>
          <div className="grid gap-3">
            {filteredEmployees.map((employee) => {
              const approved = approvedEmployeeIds.includes(employee.id);
              const selected = employee.id === selectedEmployee?.id;

              return (
                <button
                  key={employee.id}
                  type="button"
                  className="grid gap-1 rounded-xl border border-border/70 bg-background/70 p-4 text-left transition hover:border-primary/40 hover:bg-accent/40"
                  onClick={() => onSelectEmployee(employee)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{employee.team}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {approved ? <Badge>Approved</Badge> : null}
                      {selected ? <Badge variant="secondary">Selected</Badge> : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{employee.email}</span>
                    <span aria-label={`Review ${employee.firstName} ${employee.lastName}`}>
                      Review {employee.firstName} {employee.lastName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Selected reviewer</CardTitle>
          <CardDescription>
            Record who owns the operational approval once the RBAC plan is acceptable.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {selectedEmployee ? (
            <>
              <div className="grid gap-2">
                <p className="text-2xl font-semibold">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedEmployee.team}</Badge>
                  <Badge variant="outline">
                    {selectedEmployee.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">{formatCurrency(selectedEmployee.salary)}</Badge>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>Started {selectedEmployee.startDate}</p>
                <p>Manager ID: {selectedEmployee.managerId ?? "Executive sponsor"}</p>
                <p>Bonus eligible: {selectedEmployee.bonusEligible ? "Yes" : "No"}</p>
              </div>
              <Button onClick={onApproveSelectedEmployee}>Approve operator</Button>
              {approvalNotice ? (
                <Alert>
                  <AlertTitle>Approval status</AlertTitle>
                  <AlertDescription>{approvalNotice}</AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : (
            <Alert>
              <AlertTitle>No reviewer selected</AlertTitle>
              <AlertDescription>Adjust the search to bring a reviewer into view.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

