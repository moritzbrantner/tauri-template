import { useState } from "react";
import type { FormEvent } from "react";
import { AuthField, AuthPageShell } from "./AuthPageShell";

export function RegisterPage() {
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");

    setNotice(`Registration started for ${name}.`);
  }

  return (
    <AuthPageShell
      description="Create an account before accessing protected release workflows."
      footer={
        <span>
          Already have an account?{" "}
          <a className="font-medium text-primary" href="/login">
            Sign in
          </a>
        </span>
      }
      notice={notice}
      onSubmit={handleSubmit}
      submitLabel="Create account"
      title="Register"
    >
      <AuthField autoComplete="name" label="Name" name="name" />
      <AuthField autoComplete="email" label="Email" name="email" type="email" />
      <AuthField autoComplete="new-password" label="Password" name="password" type="password" />
    </AuthPageShell>
  );
}
