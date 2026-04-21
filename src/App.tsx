<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
=======
import reactLogo from "./assets/react.svg";
import { greet as greetCommand } from "./greet";
import { useEffect, useMemo, useState } from "react";
>>>>>>> 1e5cf3cce47309ac647b3bae55b8ffc2eabff0b9
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

type AppSettings = {
  theme: "system" | Theme;
  accentColor: string;
  autoSave: boolean;
  compactMode: boolean;
  defaultProjectName: string;
};

type Notice = {
  kind: "info" | "success" | "error";
  message: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  accentColor: "#2f6fed",
  autoSave: true,
  compactMode: false,
  defaultProjectName: "Untitled project",
};
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const pageIcons: Record<PageId, Parameters<typeof Icon>[0]["name"]> = {
  home: "home",
  about: "info",
  forms: "form",
  table: "table",
  uploads: "upload",
  communication: "message",
};

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function readSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [locale, setLocale] = usePersistentState<AppLocale>(
    "tauri-template.locale",
    "en",
  );
  const [featureFlags, setFeatureFlags] = usePersistentState<FeatureFlags>(
    "tauri-template.features",
    defaultFeatureFlags,
  );
  const [activePage, setActivePage] = useState<PageId>(() =>
    readPageFromHash(featureFlags),
  );
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);
  const [systemTheme, setSystemTheme] = useState<Theme>(readSystemTheme);
  const [isBusy, setIsBusy] = useState(true);
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    message: "Loading saved settings...",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = messages[locale];

  const navigation = useMemo(() => {
    return [...appManifest.publicNavigation]
      .sort((left, right) => left.order - right.order)
      .filter((item) => {
        const page = pageById.get(item.pageId);
        return page?.featureKey ? featureFlags[page.featureKey] : true;
      });
  }, [featureFlags]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  const theme = settings.theme === "system" ? systemTheme : settings.theme;

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(readSystemTheme());

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (HEX_COLOR_PATTERN.test(settings.accentColor)) {
      document.documentElement.style.setProperty(
        "--primary",
        settings.accentColor,
      );
    }
  }, [settings.accentColor]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const loaded = await invoke<AppSettings>("load_settings");
        setSettings(loaded);
        setSavedSettings(loaded);
        setNotice({ kind: "success", message: "Settings loaded." });
      } catch (error) {
        setNotice({
          kind: "error",
          message: `Could not load settings: ${messageFromError(error)}`,
        });
      } finally {
        setIsBusy(false);
      }
    }

    void loadSettings();
  }, []);

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

      const item = navigation.find(
        (navItem) => navItem.hotkey === event.key.toLowerCase(),
      );
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

  async function saveSettings(nextSettings = settings) {
    setIsBusy(true);
    try {
      const saved = await invoke<AppSettings>("save_settings", {
        settings: nextSettings,
      });
      setSettings(saved);
      setSavedSettings(saved);
      setNotice({ kind: "success", message: "Settings saved." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `Could not save settings: ${messageFromError(error)}`,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function exportSettings() {
    setIsBusy(true);
    try {
      const contents = await invoke<string>("export_settings", { settings });
      const url = URL.createObjectURL(
        new Blob([contents], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "settings.json";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice({ kind: "success", message: "Settings exported." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `Could not export settings: ${messageFromError(error)}`,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function importSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setIsBusy(true);
    try {
      const contents = await file.text();
      const imported = await invoke<AppSettings>("import_settings", {
        contents,
      });
      setSettings(imported);
      setSavedSettings(imported);
      setNotice({ kind: "success", message: "Settings imported and saved." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: `Could not import settings: ${messageFromError(error)}`,
      });
    } finally {
      setIsBusy(false);
    }
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
            const items = navigation.filter(
              (item) => item.category === category,
            );

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
              <select
                onChange={(event) =>
                  setLocale(event.currentTarget.value as AppLocale)
                }
                value={locale}
              >
                <option value="en">{messages.en.app.localeName}</option>
                <option value="de">{messages.de.app.localeName}</option>
              </select>
            </label>

            <div
              className="segmented-control"
              role="group"
              aria-label={t.app.theme}
            >
              <button
                className={theme === "light" ? "active" : ""}
                onClick={() => setSettings({ ...settings, theme: "light" })}
                type="button"
              >
                <Icon name="sun" label={t.app.light} />
              </button>
              <button
                className={theme === "dark" ? "active" : ""}
                onClick={() => setSettings({ ...settings, theme: "dark" })}
                type="button"
              >
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
          <span className={hasUnsavedChanges ? "save-state dirty" : "save-state"}>
            {hasUnsavedChanges ? "Unsaved" : "Saved"}
          </span>
        </div>

        <section className="native-settings" aria-label="Application preferences">
          <div className="settings-grid">
            <label className="field">
              <span>Theme</span>
              <select
                value={settings.theme}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    theme: event.currentTarget.value as AppSettings["theme"],
                  })
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            <label className="field color-field">
              <span>Accent color</span>
              <div>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      accentColor: event.currentTarget.value,
                    })
                  }
                  aria-label="Accent color"
                />
                <input
                  value={settings.accentColor}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      accentColor: event.currentTarget.value,
                    })
                  }
                  aria-label="Accent color hex value"
                />
              </div>
            </label>

            <label className="field">
              <span>Default project name</span>
              <input
                value={settings.defaultProjectName}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultProjectName: event.currentTarget.value,
                  })
                }
              />
            </label>

            <label className="switch-field">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    autoSave: event.currentTarget.checked,
                  })
                }
              />
              <span>
                <strong>Auto save</strong>
                <small>Remember this preference for editor flows.</small>
              </span>
            </label>

            <label className="switch-field">
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    compactMode: event.currentTarget.checked,
                  })
                }
              />
              <span>
                <strong>Compact mode</strong>
                <small>Use tighter spacing in dense screens.</small>
              </span>
            </label>
          </div>

          <input
            ref={fileInputRef}
            className="hidden-file"
            type="file"
            accept="application/json,.json"
            onChange={importSettings}
          />

          <div className="action-bar">
            <button
              type="button"
              className="secondary-action"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              Import
            </button>
            <button
              type="button"
              className="secondary-action"
              onClick={exportSettings}
              disabled={isBusy}
            >
              Export
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={() => saveSettings()}
              disabled={isBusy}
            >
              Save
            </button>
          </div>

          <p className={`notice ${notice.kind}`} role="status">
            {notice.message}
          </p>
        </section>

        {featureFlags["settings.featureFlags"] ? (
          <div className="feature-toggles">
            <p>{t.app.features}</p>
            {appManifest.featureFlags
              .filter((featureKey) => featureKey !== "settings.featureFlags")
              .map((featureKey) => (
                <label key={featureKey}>
                  <input
                    checked={featureFlags[featureKey]}
                    onChange={(event) =>
                      setFeatureFlag(featureKey, event.currentTarget.checked)
                    }
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
  const page = appManifest.publicPages.find(
    (candidate) => candidate.slug === hash,
  );

  if (!page) {
    return "home";
  }

  if (page.featureKey && !featureFlags[page.featureKey]) {
    return "home";
  }

  return page.id;
}

export default App;
