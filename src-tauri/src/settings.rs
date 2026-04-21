use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::errors::{AppError, CommandResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub accent_color: String,
    pub auto_save: bool,
    pub compact_mode: bool,
    pub default_project_name: String,
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

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Could not find config directory: {error}"))?;

    Ok(config_dir.join("settings.json"))
}

pub fn validate_settings(settings: &AppSettings) -> Result<(), String> {
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

fn validate_settings_command(settings: &AppSettings) -> CommandResult<()> {
    validate_settings(settings).map_err(AppError::validation)
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

fn write_settings_command(app: &AppHandle, settings: &AppSettings) -> CommandResult<()> {
    validate_settings_command(settings)?;
    let path = settings_path(app).map_err(AppError::io)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(AppError::io)?;
    }

    let contents = serde_json::to_string_pretty(settings).map_err(AppError::serialization)?;
    fs::write(path, contents).map_err(AppError::io)
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
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
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn export_settings(settings: AppSettings) -> Result<String, String> {
    validate_settings(&settings)?;
    serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("Could not export settings: {error}"))
}

#[tauri::command]
pub fn import_settings(app: AppHandle, contents: String) -> Result<AppSettings, String> {
    let settings = serde_json::from_str::<AppSettings>(&contents)
        .map_err(|error| format!("Could not parse imported settings: {error}"))?;
    write_settings(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn reset_settings(app: AppHandle) -> CommandResult<AppSettings> {
    let settings = AppSettings::default();
    write_settings_command(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn settings_file_path(app: AppHandle) -> CommandResult<String> {
    settings_path(&app)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(AppError::io)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_settings() -> AppSettings {
        AppSettings::default()
    }

    #[test]
    fn settings_validation_accepts_valid_themes_and_colors() {
        for theme in ["system", "light", "dark"] {
            let mut settings = valid_settings();
            settings.theme = theme.into();
            settings.accent_color = "#Aa12fF".into();

            assert!(validate_settings(&settings).is_ok());
        }
    }

    #[test]
    fn settings_validation_rejects_invalid_themes() {
        let mut settings = valid_settings();
        settings.theme = "sepia".into();

        assert!(validate_settings(&settings).is_err());
    }

    #[test]
    fn settings_validation_rejects_invalid_hex_colors() {
        for color in ["2f6fed", "#12345", "#1234567", "#zzzzzz"] {
            let mut settings = valid_settings();
            settings.accent_color = color.into();

            assert!(validate_settings(&settings).is_err());
        }
    }

    #[test]
    fn app_settings_default_matches_reset_payload() {
        assert_eq!(AppSettings::default().theme, "system");
        assert_eq!(AppSettings::default().accent_color, "#2f6fed");
    }
}
