import type { Messages } from "../app/messages";
import type { PageId } from "../app/manifest";
import { Icon } from "../components/Icon";

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

export function HomePage({ t, navigate }: HomePageProps) {
  return (
    <section className="page-grid">
      <div className="hero-panel">
        <p className="eyebrow">{t.home.eyebrow}</p>
        <h1>{t.home.title}</h1>
        <p className="hero-copy">{t.home.description}</p>
        <div className="action-row">
          <button className="primary-action" onClick={() => navigate("forms")} type="button">
            <Icon name="form" />
            {t.home.primary}
          </button>
          <button className="secondary-action" onClick={() => navigate("table")} type="button">
            <Icon name="table" />
            {t.home.secondary}
          </button>
        </div>
      </div>

      <div className="feature-grid">
        {sections.map((section) => (
          <article className={`feature-card accent-${section.accent}`} key={section.key}>
            <div className="feature-icon">
              <Icon name={section.icon} />
            </div>
            <h2>{t.home[`${section.key}Title`]}</h2>
            <p>{t.home[`${section.key}Description`]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
