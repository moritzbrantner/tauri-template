import { FormEvent, useState } from "react";
import { greet } from "./greet";
import "./App.css";

export default function App() {
  const [name, setName] = useState("World");
  const [message, setMessage] = useState("Ready to build a Tauri 2 app.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      setMessage(await greet(name.trim() || "World"));
    } catch {
      setMessage("Native IPC is available when this frontend runs inside Tauri.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="shell">
      <section className="card" aria-labelledby="starter-title">
        <p className="eyebrow">Tauri 2 · React · TypeScript</p>
        <h1 id="starter-title">Small by default, ready to grow.</h1>
        <p className="lede">
          Keep application logic independent from the desktop shell and add native capabilities only when an app needs them.
        </p>

        <form className="greet-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Native command smoke test</label>
          <div className="greet-row">
            <input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={pending}>
              {pending ? "Calling…" : "Call Rust"}
            </button>
          </div>
        </form>

        <output className="status" aria-live="polite">
          {message}
        </output>
      </section>
    </main>
  );
}
