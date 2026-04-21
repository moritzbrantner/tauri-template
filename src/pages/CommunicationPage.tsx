import { FormEvent, useState } from "react";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";

type CommunicationPageProps = {
  t: Messages;
};

type Message = {
  id: number;
  text: string;
  read: boolean;
  queuedAt: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    text: "New desktop release candidate is ready for review.",
    read: false,
    queuedAt: "09:15",
  },
  {
    id: 2,
    text: "Background sync completed without conflicts.",
    read: true,
    queuedAt: "10:40",
  },
];

export function CommunicationPage({ t }: CommunicationPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      {
        id: Date.now(),
        text,
        read: false,
        queuedAt: new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      },
      ...current,
    ]);
    setDraft("");
  }

  return (
    <section className="content-stack communication-page">
      <div className="section-heading">
        <p className="eyebrow">Workspace</p>
        <h1>{t.communication.title}</h1>
        <p>{t.communication.description}</p>
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <label>
          <span>{t.communication.compose}</span>
          <textarea
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder={t.communication.messagePlaceholder}
            value={draft}
          />
        </label>
        <button className="primary-action" type="submit">
          <Icon name="send" />
          {t.communication.send}
        </button>
      </form>

      <div className="message-panel">
        <div className="list-heading">
          <h2>{t.communication.inbox}</h2>
          <button
            className="secondary-action"
            onClick={() => setMessages((current) => current.map((message) => ({ ...message, read: true })))}
            type="button"
          >
            {t.communication.markAll}
          </button>
        </div>
        <ul className="message-list">
          {messages.map((message) => (
            <li className={message.read ? "is-read" : ""} key={message.id}>
              <span>{message.text}</span>
              <small>
                {t.communication.queued} {message.queuedAt}
              </small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
