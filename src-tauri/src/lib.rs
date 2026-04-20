use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    theme: String,
    accent_color: String,
    auto_save: bool,
    compact_mode: bool,
    default_project_name: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            accent_color: "#2f6fed".into(),
            auto_save: true,
            compact_mode: false,
            default_project_name: "Untitled project".into(),
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not find config directory: {error}"))?;

    Ok(config_dir.join("settings.json"))
}

fn validate_settings(settings: &AppSettings) -> Result<(), String> {
    let theme_is_valid = matches!(settings.theme.as_str(), "system" | "light" | "dark");
    if !theme_is_valid {
        return Err("Theme must be system, light, or dark.".into());
    }

    let accent = settings.accent_color.as_str();
    let color_is_valid = accent.len() == 7
        && accent.starts_with('#')
        && accent
            .chars()
            .skip(1)
            .all(|character| character.is_ascii_hexdigit());
    if !color_is_valid {
        return Err("Accent color must be a #RRGGBB hex color.".into());
    }

    if settings.default_project_name.trim().is_empty() {
        return Err("Default project name cannot be empty.".into());
    }

    Ok(())
}

fn write_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    validate_settings(settings)?;

    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create settings directory: {error}"))?;
    }

    let contents = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Could not serialize settings: {error}"))?;
    fs::write(path, contents).map_err(|error| format!("Could not save settings: {error}"))
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app)?;
    match fs::read_to_string(path) {
        Ok(contents) => {
            let settings = serde_json::from_str::<AppSettings>(&contents)
                .map_err(|error| format!("Could not parse settings: {error}"))?;
            validate_settings(&settings)?;
            Ok(settings)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let settings = AppSettings::default();
            write_settings(&app, &settings)?;
            Ok(settings)
        }
        Err(error) => Err(format!("Could not load settings: {error}")),
    }
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
fn export_settings(settings: AppSettings) -> Result<String, String> {
    validate_settings(&settings)?;
    serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("Could not export settings: {error}"))
}

#[tauri::command]
fn import_settings(app: AppHandle, contents: String) -> Result<AppSettings, String> {
    let settings = serde_json::from_str::<AppSettings>(&contents)
        .map_err(|error| format!("Could not parse imported settings: {error}"))?;
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_settings,
            save_settings,
            export_settings,
            import_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
