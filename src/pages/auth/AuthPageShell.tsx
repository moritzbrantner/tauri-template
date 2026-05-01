import type { FormEvent, ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  StudioTheme,
} from "@moritzbrantner/ui";

type AuthPageShellProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  notice: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  title: string;
};

export function AuthPageShell({
  children,
  description,
  footer,
  notice,
  onSubmit,
  submitLabel,
  title,
}: AuthPageShellProps) {
  return (
    <StudioTheme className="min-h-screen">
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(252,250,243,0.98),rgba(244,240,229,1))] px-4 py-8 text-foreground dark:bg-[linear-gradient(180deg,rgba(12,17,15,0.98),rgba(9,12,11,1))]">
        <Card className="w-full max-w-md border border-border/70 bg-card/95">
          <CardHeader>
            <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Gatehouse
            </p>
            <CardTitle aria-level={1} role="heading">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="grid gap-4">
              {children}
              {notice ? (
                <Alert>
                  <AlertTitle>Auth status</AlertTitle>
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="grid gap-4">
              <Button className="w-full" type="submit">
                {submitLabel}
              </Button>
              <div className="text-sm text-muted-foreground">{footer}</div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </StudioTheme>
  );
}

type AuthFieldProps = {
  autoComplete: string;
  label: string;
  name: string;
  type?: string;
};

export function AuthField({ autoComplete, label, name, type = "text" }: AuthFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <Input autoComplete={autoComplete} name={name} required type={type} />
    </label>
  );
}
