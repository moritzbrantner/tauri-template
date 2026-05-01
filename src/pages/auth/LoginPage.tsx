import { useState } from "react";
import type { FormEvent } from "react";
import { AuthField, AuthPageShell } from "./AuthPageShell";

export function LoginPage() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    setNotice(`Sign in requested for ${email}.`);
  }

  return (
    <AuthPageShell
      description="Sign in to continue to the operator workspace."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a className="font-medium text-primary" href="/register">
            Create account
          </a>
          <a className="font-medium text-primary" href="/password-forgotten">
            Forgot password?
          </a>
        </div>
      }
      notice={notice}
      onSubmit={handleSubmit}
      submitLabel="Sign in"
      title="Login"
    >
      <AuthField autoComplete="email" label="Email" name="email" type="email" />
      <AuthField
        autoComplete="current-password"
        label="Password"
        name="password"
        type="password"
      />
    </AuthPageShell>
  );
}
