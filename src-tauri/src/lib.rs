use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use globset::{Glob, GlobSet, GlobSetBuilder};
use notify::{
    event::{CreateKind, RemoveKind},
    Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

const FOLDER_WATCH_CHANGED_EVENT: &str = "folder-watch://changed";
const FOLDER_WATCH_ERROR_EVENT: &str = "folder-watch://error";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    theme: String,
    accent_color: String,
    auto_save: bool,
    compact_mode: bool,
    default_project_name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FolderWatchOptions {
    path: String,
    filters: Option<Vec<String>>,
    recursive: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderWatchStatus {
    path: String,
    filters: Vec<String>,
    recursive: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderWatchEvent {
    watch_path: String,
    kind: String,
    paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderWatchErrorEvent {
    watch_path: String,
    message: String,
}

#[derive(Default)]
struct FolderWatchState(Mutex<Option<FolderWatch>>);

struct FolderWatch {
    _watcher: RecommendedWatcher,
    status: FolderWatchStatus,
}

struct FileFilter {
    root: PathBuf,
    relative_patterns: Option<GlobSet>,
    basename_patterns: Option<GlobSet>,
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

impl FileFilter {
    fn new(root: PathBuf, filters: &[String]) -> Result<Self, String> {
        let clean_filters = filters
            .iter()
            .map(|filter| filter.trim())
            .filter(|filter| !filter.is_empty())
            .collect::<Vec<_>>();

        if clean_filters.is_empty() {
            return Ok(Self {
                root,
                relative_patterns: None,
                basename_patterns: None,
            });
        }

        let mut relative_builder = GlobSetBuilder::new();
        let mut basename_builder = GlobSetBuilder::new();
        let mut has_relative_patterns = false;
        let mut has_basename_patterns = false;

        for filter in clean_filters {
            let glob = Glob::new(filter)
                .map_err(|error| format!("Invalid folder watch filter `{filter}`: {error}"))?;

            if filter.contains('/') || filter.contains('\\') {
                relative_builder.add(glob);
                has_relative_patterns = true;
            } else {
                basename_builder.add(glob);
                has_basename_patterns = true;
            }
        }

        let relative_patterns = if has_relative_patterns {
            Some(
                relative_builder
                    .build()
                    .map_err(|error| format!("Could not build folder watch filters: {error}"))?,
            )
        } else {
            None
        };

        let basename_patterns = if has_basename_patterns {
            Some(
                basename_builder
                    .build()
                    .map_err(|error| format!("Could not build folder watch filters: {error}"))?,
            )
        } else {
            None
        };

        Ok(Self {
            root,
            relative_patterns,
            basename_patterns,
        })
    }

    fn matches(&self, path: &Path) -> bool {
        if self.relative_patterns.is_none() && self.basename_patterns.is_none() {
            return path
                .metadata()
                .map(|metadata| metadata.is_file())
                .unwrap_or(true);
        }

        if path
            .metadata()
            .map(|metadata| !metadata.is_file())
            .unwrap_or(false)
        {
            return false;
        }

        if let Some(patterns) = &self.relative_patterns {
            let relative_path = path.strip_prefix(&self.root).unwrap_or(path);
            if patterns.is_match(relative_path) {
                return true;
            }
        }

        if let (Some(patterns), Some(file_name)) = (&self.basename_patterns, path.file_name()) {
            if patterns.is_match(Path::new(file_name)) {
                return true;
            }
        }

        false
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

fn folder_watch_lock(
    state: &FolderWatchState,
) -> Result<std::sync::MutexGuard<'_, Option<FolderWatch>>, String> {
    state
        .0
        .lock()
        .map_err(|_| "Folder watcher state lock was poisoned.".to_string())
}

fn is_change_event(kind: &EventKind) -> bool {
    matches!(
        kind,
        EventKind::Any
            | EventKind::Create(CreateKind::Any | CreateKind::File | CreateKind::Other)
            | EventKind::Modify(_)
            | EventKind::Remove(RemoveKind::Any | RemoveKind::File | RemoveKind::Other)
    )
}

fn folder_watch_kind_label(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Any => "any",
        EventKind::Create(_) => "create",
        EventKind::Modify(_) => "modify",
        EventKind::Remove(_) => "remove",
        EventKind::Access(_) => "access",
        EventKind::Other => "other",
    }
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

#[tauri::command]
fn start_folder_watch(
    app: AppHandle,
    state: State<'_, FolderWatchState>,
    options: FolderWatchOptions,
) -> Result<FolderWatchStatus, String> {
    let path = PathBuf::from(options.path.trim());
    if path.as_os_str().is_empty() {
        return Err("Folder watch path cannot be empty.".into());
    }

    let path = path
        .canonicalize()
        .map_err(|error| format!("Could not resolve folder watch path: {error}"))?;

    let metadata = path
        .metadata()
        .map_err(|error| format!("Could not inspect folder watch path: {error}"))?;
    if !metadata.is_dir() {
        return Err("Folder watch path must be a directory.".into());
    }

    let filters = options
        .filters
        .unwrap_or_default()
        .into_iter()
        .map(|filter| filter.trim().to_string())
        .filter(|filter| !filter.is_empty())
        .collect::<Vec<_>>();
    let recursive = options.recursive.unwrap_or(true);
    let filter = FileFilter::new(path.clone(), &filters)?;
    let event_watch_path = path.to_string_lossy().into_owned();
    let event_app = app.clone();

    let mut watcher = RecommendedWatcher::new(
        move |result: notify::Result<notify::Event>| match result {
            Ok(event) => {
                if !is_change_event(&event.kind) {
                    return;
                }

                let paths = event
                    .paths
                    .iter()
                    .filter(|path| filter.matches(path))
                    .map(|path| path.to_string_lossy().into_owned())
                    .collect::<Vec<_>>();

                if paths.is_empty() {
                    return;
                }

                let payload = FolderWatchEvent {
                    watch_path: event_watch_path.clone(),
                    kind: folder_watch_kind_label(&event.kind).into(),
                    paths,
                };

                if let Err(error) = event_app.emit(FOLDER_WATCH_CHANGED_EVENT, payload) {
                    eprintln!("Could not emit folder watch event: {error}");
                }
            }
            Err(error) => {
                let payload = FolderWatchErrorEvent {
                    watch_path: event_watch_path.clone(),
                    message: error.to_string(),
                };

                if let Err(emit_error) = event_app.emit(FOLDER_WATCH_ERROR_EVENT, payload) {
                    eprintln!("Could not emit folder watch error event: {emit_error}");
                }
            }
        },
        Config::default(),
    )
    .map_err(|error| format!("Could not create folder watcher: {error}"))?;

    let recursive_mode = if recursive {
        RecursiveMode::Recursive
    } else {
        RecursiveMode::NonRecursive
    };
    watcher
        .watch(&path, recursive_mode)
        .map_err(|error| format!("Could not watch folder: {error}"))?;

    let status = FolderWatchStatus {
        path: path.to_string_lossy().into_owned(),
        filters,
        recursive,
    };

    let mut active_watch = folder_watch_lock(&state)?;
    *active_watch = Some(FolderWatch {
        _watcher: watcher,
        status: status.clone(),
    });

    Ok(status)
}

#[tauri::command]
fn stop_folder_watch(state: State<'_, FolderWatchState>) -> Result<bool, String> {
    let mut active_watch = folder_watch_lock(&state)?;
    Ok(active_watch.take().is_some())
}

#[tauri::command]
fn folder_watch_status(
    state: State<'_, FolderWatchState>,
) -> Result<Option<FolderWatchStatus>, String> {
    let active_watch = folder_watch_lock(&state)?;
    Ok(active_watch.as_ref().map(|watch| watch.status.clone()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(FolderWatchState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_settings,
            save_settings,
            export_settings,
            import_settings,
            start_folder_watch,
            stop_folder_watch,
            folder_watch_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
