import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { appManifest } from "../app/manifest";
import type { Messages } from "../app/messages";
import { Icon } from "../components/Icon";
import * as styles from "../styles";

type AboutPageProps = {
  t: Messages;
};

export function AboutPage({ t }: AboutPageProps) {
  const [bridgeMessage, setBridgeMessage] = useState<string>(t.app.browserPreview);
  const [isChecking, setIsChecking] = useState(false);
  const metadataRows = [
    [t.about.platform, appManifest.platform],
    [t.about.runtime, appManifest.deployment.runtime],
    [t.about.package, appManifest.packageName],
    [t.about.cadence, appManifest.releaseCadence],
  ];

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
    <section className={styles.contentStackClass}>
      <div className={styles.sectionHeadingClass}>
        <p className={styles.eyebrowClass}>{t.about.metadata}</p>
        <h1 className={styles.pageTitleClass}>{t.about.title}</h1>
        <p className={styles.mutedCopyClass}>{t.about.description}</p>
      </div>

      <div className={styles.metadataGridClass}>
        {metadataRows.map(([label, value], index) => (
          <div
            className={styles.cx(
              styles.metadataRowClass,
              index >= metadataRows.length - 2 &&
                "min-[821px]:border-b-0",
              index === metadataRows.length - 1 && "max-[820px]:border-b-0",
            )}
            key={label}
          >
            <span className="text-[#647067] dark:text-[#a9b5ad]">
              {label}
            </span>
            <strong className="break-words text-right">{value}</strong>
          </div>
        ))}
      </div>

      <article className={styles.bridgePanelClass}>
        <div>
          <h2 className="mb-2 text-lg font-bold">{t.about.bridge}</h2>
          <p className={styles.mutedCopyClass}>{bridgeMessage}</p>
        </div>
        <button
          className={styles.secondaryActionClass}
          disabled={isChecking}
          onClick={checkBridge}
          type="button"
        >
          <Icon name="refresh" />
          {t.about.bridgeAction}
        </button>
      </article>
    </section>
  );
}
