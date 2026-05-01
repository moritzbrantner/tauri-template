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
  Input,
  Progress,
  Textarea,
} from "@moritzbrantner/ui";
import { ChecklistItem } from "../components/ChecklistItem";
import { Field } from "../components/Field";
import type { WorkspaceDraft } from "../types";

type IntakeViewProps = {
  description: string;
  draft: WorkspaceDraft;
  intakeNotice: string;
  intakeProgress: number;
  intakeStep: number;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  onSubmitForAccessReview: () => void;
  onUpdateDraft: <K extends keyof WorkspaceDraft>(key: K, value: WorkspaceDraft[K]) => void;
  submitted: boolean;
};

export function IntakeView({
  description,
  draft,
  intakeNotice,
  intakeProgress,
  intakeStep,
  onBack,
  onContinue,
  onSaveDraft,
  onSubmitForAccessReview,
  onUpdateDraft,
  submitted,
}: IntakeViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle aria-level={1} role="heading">Workspace intake brief</CardTitle>
          <CardDescription>{description}</CardDescription>
          <CardAction>
            <Badge variant="outline">Step {intakeStep} of 3</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Progress value={intakeProgress} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Workspace name">
              <Input
                value={draft.workspaceName}
                onChange={(event) => onUpdateDraft("workspaceName", event.currentTarget.value)}
              />
            </Field>
            <Field label="Sponsor email">
              <Input
                type="email"
                value={draft.sponsorEmail}
                onChange={(event) => onUpdateDraft("sponsorEmail", event.currentTarget.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product surface">
              <Input
                value={draft.productSurface}
                onChange={(event) => onUpdateDraft("productSurface", event.currentTarget.value)}
              />
            </Field>
            <Field label="Launch window">
              <Input
                value={draft.launchWindow}
                onChange={(event) => onUpdateDraft("launchWindow", event.currentTarget.value)}
              />
            </Field>
          </div>
          <Field label="Operational objective">
            <Textarea
              value={draft.objective}
              onChange={(event) => onUpdateDraft("objective", event.currentTarget.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Requested read bundle">
              <Input
                value={draft.readBundle}
                onChange={(event) => onUpdateDraft("readBundle", event.currentTarget.value)}
              />
            </Field>
            <Field label="Requested write bundle">
              <Input
                value={draft.writeBundle}
                onChange={(event) => onUpdateDraft("writeBundle", event.currentTarget.value)}
              />
            </Field>
          </div>
          {intakeNotice ? (
            <Alert>
              <AlertTitle>Intake status</AlertTitle>
              <AlertDescription>{intakeNotice}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <div className="flex gap-2">
            <Button disabled={intakeStep === 1} onClick={onBack} variant="outline">
              Back
            </Button>
            <Button disabled={intakeStep === 3} onClick={onContinue} variant="outline">
              Continue
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onSaveDraft} variant="outline">
              Save draft
            </Button>
            <Button onClick={onSubmitForAccessReview}>Submit for access review</Button>
          </div>
        </CardFooter>
      </Card>

      <Card className="border border-border/70 bg-card/88">
        <CardHeader>
          <CardTitle aria-level={2} role="heading">Flow checks</CardTitle>
          <CardDescription>
            Intake only moves forward after the owner, objective, and requested roles are explicit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ChecklistItem
            description="A named workspace and accountable sponsor exist before any server call."
            done={intakeStep > 1 || submitted}
            title="Identity captured"
          />
          <ChecklistItem
            description="The objective and launch timing are concrete enough to scope read access."
            done={intakeStep > 2 || submitted}
            title="Context defined"
          />
          <ChecklistItem
            description="Requested read and write bundles are written down before RBAC review."
            done={submitted}
            title="Bundle submitted"
          />
        </CardContent>
      </Card>
    </section>
  );
}

