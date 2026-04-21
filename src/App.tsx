import reactLogo from "./assets/react.svg";
import { greet as greetCommand } from "./greet";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { messages } from "./app/messages";
import {
  appManifest,
  defaultFeatureFlags,
  pageById,
  type AppLocale,
  type FeatureFlags,
  type PageId,
} from "./app/manifest";
import { usePersistentState } from "./app/storage";
import { Icon } from "./components/Icon";
import { AboutPage } from "./pages/AboutPage";
import { CommunicationPage } from "./pages/CommunicationPage";
import { FormsPage } from "./pages/FormsPage";
import { HomePage } from "./pages/HomePage";
import { TablePage } from "./pages/TablePage";
import { UploadsPage } from "./pages/UploadsPage";

type Theme = "light" | "dark";

const pageIcons: Record<PageId, Parameters<typeof Icon>[0]["name"]> = {
  home: "home",
  about: "info",
  forms: "form",
  table: "table",
  uploads: "upload",
  communication: "message",
};

function App() {
  const [locale, setLocale] = usePersistentState<AppLocale>("tauri-template.locale", "en");
  const [theme, setTheme] = usePersistentState<Theme>("tauri-template.theme", "light");
  const [featureFlags, setFeatureFlags] = usePersistentState<FeatureFlags>(
    "tauri-template.features",
    defaultFeatureFlags,
  );
  const [activePage, setActivePage] = useState<PageId>(() => readPageFromHash(featureFlags));
  const t = messages[locale];

  const navigation = useMemo(() => {
    return [...appManifest.publicNavigation]
      .sort((left, right) => left.order - right.order)
      .filter((item) => {
        const page = pageById.get(item.pageId);
        return page?.featureKey ? featureFlags[page.featureKey] : true;
      });
  }, [featureFlags]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const nextFlags = { ...defaultFeatureFlags, ...featureFlags };
    if (JSON.stringify(nextFlags) !== JSON.stringify(featureFlags)) {
      setFeatureFlags(nextFlags);
    }
  }, [featureFlags, setFeatureFlags]);

  useEffect(() => {
    function handleHashChange() {
      setActivePage(readPageFromHash(featureFlags));
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [featureFlags]);

  useEffect(() => {
    const page = pageById.get(activePage);
    if (page?.featureKey && !featureFlags[page.featureKey]) {
      navigate("home");
    }
  }, [activePage, featureFlags]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const item = navigation.find((navItem) => navItem.hotkey === event.key.toLowerCase());
      if (item) {
        event.preventDefault();
        navigate(item.pageId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigation]);

  function navigate(pageId: PageId) {
    const page = pageById.get(pageId);
    if (!page) {
      return;
    }

    window.location.hash = page.slug ? `/${page.slug}` : "/";
    setActivePage(pageId);
  }

  function setFeatureFlag(featureKey: keyof FeatureFlags, enabled: boolean) {
    setFeatureFlags((current) => ({ ...current, [featureKey]: enabled }));
  }

  const ActivePage = renderPage(activePage, t, navigate);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">TT</div>
          <div>
            <strong>{appManifest.displayName}</strong>
            <span>{appManifest.platform}</span>
          </div>
        </div>

        <nav aria-label={t.app.navigation}>
          {(["discover", "workspace"] as const).map((category) => {
            const items = navigation.filter((item) => item.category === category);

            if (items.length === 0) {
              return null;
            }

            return (
              <div className="nav-group" key={category}>
                <p>{t.app[category]}</p>
                {items.map((item) => (
                  <button
                    className={item.pageId === activePage ? "active" : ""}
                    key={item.pageId}
                    onClick={() => navigate(item.pageId)}
                    type="button"
                  >
                    <Icon name={pageIcons[item.pageId]} />
                    <span>{t.pages[item.pageId]}</span>
                    <kbd>Alt {item.hotkey.toUpperCase()}</kbd>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="main-surface">
        <header className="topbar">
          <div>
            <span>{appManifest.defaultLocaleMetadata.title}</span>
            <strong>{t.pages[activePage]}</strong>
          </div>

          <div className="topbar-controls">
            <label className="select-control">
              <span>{t.app.language}</span>
              <select onChange={(event) => setLocale(event.currentTarget.value as AppLocale)} value={locale}>
                <option value="en">{messages.en.app.localeName}</option>
                <option value="de">{messages.de.app.localeName}</option>
              </select>
            </label>

            <div className="segmented-control" role="group" aria-label={t.app.theme}>
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} type="button">
                <Icon name="sun" label={t.app.light} />
              </button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} type="button">
                <Icon name="moon" label={t.app.dark} />
              </button>
            </div>
          </div>
        </header>

        <div className="page-surface">{ActivePage}</div>
      </main>

      <aside className="settings-rail" aria-label={t.app.settings}>
        <div className="settings-heading">
          <Icon name="settings" />
          <strong>{t.app.settings}</strong>
        </div>
        {featureFlags["settings.featureFlags"] ? (
          <div className="feature-toggles">
            <p>{t.app.features}</p>
            {appManifest.featureFlags
              .filter((featureKey) => featureKey !== "settings.featureFlags")
              .map((featureKey) => (
                <label key={featureKey}>
                  <input
                    checked={featureFlags[featureKey]}
                    onChange={(event) => setFeatureFlag(featureKey, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span>{featureKey}</span>
                </label>
              ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function renderPage(
  activePage: PageId,
  t: (typeof messages)[AppLocale],
  navigate: (pageId: PageId) => void,
) {
  switch (activePage) {
    case "about":
      return <AboutPage t={t} />;
    case "forms":
      return <FormsPage t={t} />;
    case "table":
      return <TablePage t={t} />;
    case "uploads":
      return <UploadsPage t={t} />;
    case "communication":
      return <CommunicationPage t={t} />;
    case "home":
    default:
      return <HomePage navigate={navigate} t={t} />;
  }
}

function readPageFromHash(featureFlags: FeatureFlags): PageId {
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const page = appManifest.publicPages.find((candidate) => candidate.slug === hash);

  if (!page) {
    return "home";
  }

  if (page.featureKey && !featureFlags[page.featureKey]) {
    return "home";
  }

  return page.id;
}

export default App;
