import { useState } from "react";
import type { FormEvent } from "react";
import { AuthField, AuthPageShell } from "./AuthPageShell";

export function PasswordForgottenPage() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    setNotice(`Password reset link requested for ${email}.`);
  }

  return (
    <AuthPageShell
      description="Request a reset link for the email tied to your account."
      footer={
        <span>
          Remembered it?{" "}
          <a className="font-medium text-primary" href="/login">
            Return to login
          </a>
        </span>
      }
      notice={notice}
      onSubmit={handleSubmit}
      submitLabel="Send reset link"
      title="Password forgotten"
    >
      <AuthField autoComplete="email" label="Email" name="email" type="email" />
    </AuthPageShell>
  );
}
