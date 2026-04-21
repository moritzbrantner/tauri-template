import type { Messages } from "../app/messages";
import type { PageId } from "../app/manifest";
import { Icon } from "../components/Icon";
import * as styles from "../styles";

type HomePageProps = {
  t: Messages;
  navigate: (pageId: PageId) => void;
};

const sections = [
  {
    key: "foundation",
    accent: "green",
    icon: "settings",
  },
  {
    key: "interaction",
    accent: "amber",
    icon: "message",
  },
  {
    key: "delivery",
    accent: "rose",
    icon: "upload",
  },
] as const;

const featureAccentClasses = {
  amber: "bg-[#fff0c7] text-[#8a5b00] dark:bg-[#453616] dark:text-[#f0bd59]",
  green:
    "bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]",
  rose: "bg-[#fde2e5] text-[#9c3d4c] dark:bg-[#4a2229] dark:text-[#f08c9a]",
} as const;

export function HomePage({ t, navigate }: HomePageProps) {
  return (
    <section className={styles.pageGridClass}>
      <div className={styles.cx(styles.panelClass, "p-6 md:p-12")}>
        <p className={styles.eyebrowClass}>{t.home.eyebrow}</p>
        <h1 className={styles.pageTitleClass}>{t.home.title}</h1>
        <p className={styles.mutedCopyClass}>{t.home.description}</p>
        <div className={styles.cx(styles.actionRowClass, "mt-4")}>
          <button
            className={styles.primaryActionClass}
            onClick={() => navigate("forms")}
            type="button"
          >
            <Icon name="form" />
            {t.home.primary}
          </button>
          <button
            className={styles.secondaryActionClass}
            onClick={() => navigate("table")}
            type="button"
          >
            <Icon name="table" />
            {t.home.secondary}
          </button>
        </div>
      </div>

      <div className={styles.featureGridClass}>
        {sections.map((section) => (
          <article className={styles.featureCardClass} key={section.key}>
            <div
              className={styles.cx(
                styles.featureIconBaseClass,
                featureAccentClasses[section.accent],
              )}
            >
              <Icon name={section.icon} />
            </div>
            <h2>{t.home[`${section.key}Title`]}</h2>
            <p className={styles.mutedCopyClass}>
              {t.home[`${section.key}Description`]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
