import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { appManifest } from "../app/manifest";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";

type AboutPageProps = {
  t: Messages;
};

export function AboutPage({ t }: AboutPageProps) {
  const [bridgeMessage, setBridgeMessage] = useState<string>(t.app.browserPreview);
  const [isChecking, setIsChecking] = useState(false);

  async function checkBridge() {
    setIsChecking(true);
    try {
      const message = await invoke<string>("greet", {
        name: appManifest.displayName,
      });
      setBridgeMessage(message);
    } catch {
      setBridgeMessage(t.app.browserPreview);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="section-heading">
        <p className="eyebrow">{t.about.metadata}</p>
        <h1>{t.about.title}</h1>
        <p>{t.about.description}</p>
      </div>

      <div className="metadata-grid">
        <div className="metadata-row">
          <span>{t.about.platform}</span>
          <strong>{appManifest.platform}</strong>
        </div>
        <div className="metadata-row">
          <span>{t.about.runtime}</span>
          <strong>{appManifest.deployment.runtime}</strong>
        </div>
        <div className="metadata-row">
          <span>{t.about.package}</span>
          <strong>{appManifest.packageName}</strong>
        </div>
        <div className="metadata-row">
          <span>{t.about.cadence}</span>
          <strong>{appManifest.releaseCadence}</strong>
        </div>
      </div>

      <article className="bridge-panel">
        <div>
          <h2>{t.about.bridge}</h2>
          <p>{bridgeMessage}</p>
        </div>
        <button className="secondary-action" disabled={isChecking} onClick={checkBridge} type="button">
          <Icon name="refresh" />
          {t.about.bridgeAction}
        </button>
      </article>
    </section>
  );
}
