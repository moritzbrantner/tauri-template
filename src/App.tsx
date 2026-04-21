import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
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
import * as styles from "./styles";

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

type UpdatePhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "error";

type DownloadProgress = {
  downloaded: number;
  contentLength: number;
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

function formatMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/{{(\w+)}}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
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
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>("idle");
  const [updateMessage, setUpdateMessage] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    downloaded: 0,
    contentLength: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableUpdateRef = useRef<Update | null>(null);
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
  const isUpdateBusy =
    updatePhase === "checking" ||
    updatePhase === "downloading" ||
    updatePhase === "installing" ||
    updatePhase === "ready";
  const updateProgressPercent = downloadProgress.contentLength
    ? Math.min(
        100,
        Math.round(
          (downloadProgress.downloaded / downloadProgress.contentLength) * 100,
        ),
      )
    : 0;

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

  useEffect(() => {
    void checkForUpdates(false);

    return () => {
      void availableUpdateRef.current?.close().catch(() => undefined);
    };
  }, []);

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

  function storeAvailableUpdate(update: Update | null) {
    const currentUpdate = availableUpdateRef.current;
    if (currentUpdate && currentUpdate !== update) {
      void currentUpdate.close().catch(() => undefined);
    }

    availableUpdateRef.current = update;
    setAvailableUpdate(update);
  }

  function handleDownloadEvent(event: DownloadEvent) {
    switch (event.event) {
      case "Started":
        setDownloadProgress({
          downloaded: 0,
          contentLength: event.data.contentLength ?? 0,
        });
        setUpdateMessage(t.app.updateDownloading);
        break;
      case "Progress":
        setDownloadProgress((current) => ({
          ...current,
          downloaded: current.downloaded + event.data.chunkLength,
        }));
        break;
      case "Finished":
        setDownloadProgress((current) => ({
          ...current,
          downloaded: current.contentLength,
        }));
        setUpdatePhase("installing");
        setUpdateMessage(t.app.updateInstalling);
        break;
    }
  }

  async function checkForUpdates(reportUnavailable = true) {
    if (!isTauri()) {
      if (reportUnavailable) {
        setUpdatePhase("idle");
        setUpdateMessage(t.app.updatesDesktopOnly);
      }
      return;
    }

    storeAvailableUpdate(null);
    setDownloadProgress({ downloaded: 0, contentLength: 0 });
    setUpdatePhase("checking");
    setUpdateMessage(t.app.checkingUpdates);

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check({ timeout: 30000 });

      if (!update) {
        setUpdatePhase("idle");
        setUpdateMessage(reportUnavailable ? t.app.upToDate : "");
        return;
      }

      storeAvailableUpdate(update);
      setUpdatePhase("available");
      setUpdateMessage(
        formatMessage(t.app.updateAvailable, { version: update.version }),
      );
    } catch (error) {
      setUpdatePhase(reportUnavailable ? "error" : "idle");
      setUpdateMessage(
        reportUnavailable
          ? formatMessage(t.app.updateCheckFailed, {
              message: messageFromError(error),
            })
          : "",
      );
    }
  }

  async function installAvailableUpdate() {
    if (!availableUpdate || isUpdateBusy) {
      return;
    }

    setUpdatePhase("downloading");
    setUpdateMessage(t.app.updateDownloading);
    setDownloadProgress({ downloaded: 0, contentLength: 0 });

    try {
      await availableUpdate.downloadAndInstall(handleDownloadEvent);
      availableUpdateRef.current = null;
      setAvailableUpdate(null);
      setUpdatePhase("ready");
      setUpdateMessage(t.app.updateReady);

      try {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch {
        setUpdateMessage(t.app.updateRestartFailed);
      }
    } catch (error) {
      setUpdatePhase("error");
      setUpdateMessage(
        formatMessage(t.app.updateInstallFailed, {
          message: messageFromError(error),
        }),
      );
    }
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
  const accentColor = HEX_COLOR_PATTERN.test(settings.accentColor)
    ? settings.accentColor
    : DEFAULT_SETTINGS.accentColor;

  return (
    <div
      className={styles.appShellClass}
      style={{ "--primary": accentColor } as CSSProperties}
    >
      <aside className={styles.sidebarClass}>
        <div className={styles.brandBlockClass}>
          <div className={styles.brandMarkClass}>TT</div>
          <div>
            <strong>{appManifest.displayName}</strong>
            <span className="block text-sm text-[#647067] uppercase dark:text-[#a9b5ad]">
              {appManifest.platform}
            </span>
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
              <div className={styles.navGroupClass} key={category}>
                <p className={styles.navGroupLabelClass}>{t.app[category]}</p>
                {items.map((item) => (
                  <button
                    className={styles.cx(
                      styles.navButtonClass,
                      item.pageId === activePage &&
                        styles.navButtonActiveClass,
                    )}
                    key={item.pageId}
                    onClick={() => navigate(item.pageId)}
                    type="button"
                  >
                    <Icon name={pageIcons[item.pageId]} />
                    <span>{t.pages[item.pageId]}</span>
                    <kbd className={styles.kbdClass}>
                      Alt {item.hotkey.toUpperCase()}
                    </kbd>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        <header className={styles.topbarClass}>
          <div>
            <span className={styles.topbarMetaClass}>
              {appManifest.defaultLocaleMetadata.title}
            </span>
            <strong className={styles.topbarTitleClass}>
              {t.pages[activePage]}
            </strong>
          </div>

          <div className={styles.topbarControlsClass}>
            <label className={styles.selectLabelClass}>
              <span className={styles.topbarMetaClass}>{t.app.language}</span>
              <select
                className={styles.compactSelectClass}
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
              className={styles.segmentedControlClass}
              role="group"
              aria-label={t.app.theme}
            >
              <button
                className={styles.cx(
                  styles.segmentedButtonClass,
                  theme === "light" && styles.segmentedButtonActiveClass,
                )}
                onClick={() => setSettings({ ...settings, theme: "light" })}
                type="button"
              >
                <Icon name="sun" label={t.app.light} />
              </button>
              <button
                className={styles.cx(
                  styles.segmentedButtonClass,
                  theme === "dark" && styles.segmentedButtonActiveClass,
                )}
                onClick={() => setSettings({ ...settings, theme: "dark" })}
                type="button"
              >
                <Icon name="moon" label={t.app.dark} />
              </button>
            </div>
          </div>
        </header>

        <div className={styles.pageSurfaceClass}>{ActivePage}</div>
      </main>

      <aside className={styles.settingsRailClass} aria-label={t.app.settings}>
        <div className={styles.settingsHeadingClass}>
          <Icon name="settings" />
          <strong>{t.app.settings}</strong>
          <span
            className={styles.cx(
              styles.saveStateClass,
              hasUnsavedChanges && styles.saveStateDirtyClass,
            )}
          >
            {hasUnsavedChanges ? "Unsaved" : "Saved"}
          </span>
        </div>

        <section
          className={styles.nativeSettingsClass}
          aria-label="Application preferences"
        >
          <div className={styles.settingsGridClass}>
            <label className={styles.fieldLabelClass}>
              <span className={styles.fieldTextClass}>Theme</span>
              <select
                className={styles.controlClass}
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

            <label className={styles.fieldLabelClass}>
              <span className={styles.fieldTextClass}>Accent color</span>
              <div className={styles.colorFieldGridClass}>
                <input
                  className={styles.colorInputClass}
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
                  className={styles.controlClass}
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

            <label className={styles.fieldLabelClass}>
              <span className={styles.fieldTextClass}>Default project name</span>
              <input
                className={styles.controlClass}
                value={settings.defaultProjectName}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultProjectName: event.currentTarget.value,
                  })
                }
              />
            </label>

            <label className={styles.switchFieldClass}>
              <input
                className={styles.checkboxClass}
                type="checkbox"
                checked={settings.autoSave}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    autoSave: event.currentTarget.checked,
                  })
                }
              />
              <span className={styles.switchTextClass}>
                <strong className={styles.fieldTextClass}>Auto save</strong>
                <small className={styles.switchHelpClass}>
                  Remember this preference for editor flows.
                </small>
              </span>
            </label>

            <label className={styles.switchFieldClass}>
              <input
                className={styles.checkboxClass}
                type="checkbox"
                checked={settings.compactMode}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    compactMode: event.currentTarget.checked,
                  })
                }
              />
              <span className={styles.switchTextClass}>
                <strong className={styles.fieldTextClass}>Compact mode</strong>
                <small className={styles.switchHelpClass}>
                  Use tighter spacing in dense screens.
                </small>
              </span>
            </label>
          </div>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={importSettings}
          />

          <div className={styles.actionBarClass}>
            <button
              type="button"
              className={styles.cx(styles.secondaryActionClass, "px-2.5")}
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              Import
            </button>
            <button
              type="button"
              className={styles.cx(styles.secondaryActionClass, "px-2.5")}
              onClick={exportSettings}
              disabled={isBusy}
            >
              Export
            </button>
            <button
              type="button"
              className={styles.cx(styles.primaryActionClass, "px-2.5")}
              onClick={() => saveSettings()}
              disabled={isBusy}
            >
              Save
            </button>
          </div>

          <p
            className={styles.cx(
              styles.noticeClass,
              notice.kind === "success" && styles.noticeSuccessClass,
              notice.kind === "error" && styles.noticeErrorClass,
            )}
            role="status"
          >
            {notice.message}
          </p>
        </section>

        <section className={styles.updatePanelClass} aria-label={t.app.updates}>
          <div className={styles.updateHeadingClass}>
            <Icon name="refresh" />
            <strong>{t.app.updates}</strong>
          </div>

          {updateMessage ? (
            <p
              className={styles.cx(
                styles.updateMessageClass,
                updatePhase === "ready" && styles.noticeSuccessClass,
                updatePhase === "error" && styles.noticeErrorClass,
              )}
              role="status"
            >
              {updateMessage}
            </p>
          ) : null}

          {availableUpdate?.body && updatePhase === "available" ? (
            <p className={styles.updateNotesClass}>{availableUpdate.body}</p>
          ) : null}

          {updatePhase === "downloading" && downloadProgress.contentLength > 0 ? (
            <div
              className={styles.updateProgressTrackClass}
              aria-label={t.app.updateDownloading}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={updateProgressPercent}
            >
              <span
                className={styles.updateProgressBarClass}
                style={{ width: `${updateProgressPercent}%` }}
              />
            </div>
          ) : null}

          <div className={styles.updateActionsClass}>
            <button
              type="button"
              className={styles.cx(styles.secondaryActionClass, "px-2.5")}
              onClick={() => checkForUpdates(true)}
              disabled={isUpdateBusy}
            >
              <Icon name="refresh" />
              {t.app.checkUpdates}
            </button>
            {availableUpdate && updatePhase === "available" ? (
              <button
                type="button"
                className={styles.cx(styles.primaryActionClass, "px-2.5")}
                onClick={installAvailableUpdate}
                disabled={isUpdateBusy}
              >
                <Icon name="check" />
                {t.app.installUpdate}
              </button>
            ) : null}
          </div>
        </section>

        {featureFlags["settings.featureFlags"] ? (
          <div className={styles.featureTogglesClass}>
            <p
              className={styles.cx(
                styles.mutedUpperLabelClass,
                "max-[1120px]:col-span-full max-[820px]:col-auto",
              )}
            >
              {t.app.features}
            </p>
            {appManifest.featureFlags
              .filter((featureKey) => featureKey !== "settings.featureFlags")
              .map((featureKey) => (
                <label className={styles.featureToggleLabelClass} key={featureKey}>
                  <input
                    className={styles.checkboxClass}
                    checked={featureFlags[featureKey]}
                    onChange={(event) =>
                      setFeatureFlag(featureKey, event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span className={styles.featureToggleTextClass}>
                    {featureKey}
                  </span>
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
