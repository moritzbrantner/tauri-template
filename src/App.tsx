import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type AppSettings = {
  theme: "system" | "light" | "dark";
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

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);
  const [isBusy, setIsBusy] = useState(true);
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    message: "Loading saved settings...",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

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

  return (
    <main className="settings-shell">
      <section className="settings-panel" aria-labelledby="settings-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Application preferences</p>
            <h1 id="settings-title">Settings</h1>
          </div>
          <span className={hasUnsavedChanges ? "save-state dirty" : "save-state"}>
            {hasUnsavedChanges ? "Unsaved" : "Saved"}
          </span>
        </div>

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

          <label className="field wide-field">
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
              <small>Persist edits as they are made.</small>
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
            className="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            Import
          </button>
          <button
            type="button"
            className="secondary"
            onClick={exportSettings}
            disabled={isBusy}
          >
            Export
          </button>
          <button type="button" onClick={() => saveSettings()} disabled={isBusy}>
            Save
          </button>
        </div>

        <p className={`notice ${notice.kind}`} role="status">
          {notice.message}
        </p>
      </section>
    </main>
  );
}

export default App;
