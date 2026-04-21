import { FormEvent, useMemo, useState } from "react";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";

type FormsPageProps = {
  t: Messages;
};

type ProfileForm = {
  displayName: string;
  email: string;
  team: string;
  salary: string;
  remote: boolean;
};

const initialForm: ProfileForm = {
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  team: "Platform",
  salary: "128000",
  remote: true,
};

export function FormsPage({ t }: FormsPageProps) {
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [savedMessage, setSavedMessage] = useState("");
  const errors = useMemo(() => validateForm(form, t), [form, t]);
  const hasErrors = Object.keys(errors).length > 0;

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasErrors) {
      return;
    }

    setSavedMessage(t.forms.saved);
  }

  return (
    <section className="content-stack">
      <div className="section-heading">
        <p className="eyebrow">Workspace</p>
        <h1>{t.forms.title}</h1>
        <p>{t.forms.description}</p>
      </div>

      <form className="workspace-form" onSubmit={handleSubmit}>
        <label>
          <span>Display name</span>
          <input
            onChange={(event) => updateField("displayName", event.currentTarget.value)}
            value={form.displayName}
          />
          {errors.displayName ? <small>{errors.displayName}</small> : null}
        </label>

        <label>
          <span>Email</span>
          <input
            onChange={(event) => updateField("email", event.currentTarget.value)}
            type="email"
            value={form.email}
          />
          {errors.email ? <small>{errors.email}</small> : null}
        </label>

        <label>
          <span>Team</span>
          <select onChange={(event) => updateField("team", event.currentTarget.value)} value={form.team}>
            <option>Platform</option>
            <option>Product</option>
            <option>Data</option>
            <option>Design</option>
            <option>Support</option>
          </select>
        </label>

        <label>
          <span>Salary</span>
          <input
            min="0"
            onChange={(event) => updateField("salary", event.currentTarget.value)}
            type="number"
            value={form.salary}
          />
          {errors.salary ? <small>{errors.salary}</small> : null}
        </label>

        <label className="toggle-row">
          <input
            checked={form.remote}
            onChange={(event) => updateField("remote", event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Remote eligible</span>
        </label>

        <div className="form-footer">
          <button className="primary-action" disabled={hasErrors} type="submit">
            <Icon name="check" />
            {t.forms.save}
          </button>
          <button
            className="secondary-action"
            onClick={() => {
              setForm(initialForm);
              setSavedMessage("");
            }}
            type="button"
          >
            <Icon name="refresh" />
            {t.forms.reset}
          </button>
          {savedMessage ? <p className="status-text">{savedMessage}</p> : null}
        </div>
      </form>
    </section>
  );
}

function validateForm(form: ProfileForm, t: Messages) {
  const errors: Partial<Record<keyof ProfileForm, string>> = {};

  if (!form.displayName.trim()) {
    errors.displayName = t.forms.required;
  }

  if (!form.email.trim()) {
    errors.email = t.forms.required;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = t.forms.emailInvalid;
  }

  if (!form.salary.trim() || Number(form.salary) < 0) {
    errors.salary = t.forms.salaryInvalid;
  }

  return errors;
}
