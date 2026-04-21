use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use chrono::Utc;
use globset::{Glob, GlobSet, GlobSetBuilder};
use notify::{
    event::{CreateKind, RemoveKind},
    Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::errors::{lock_error, CommandResult};

const FOLDER_WATCH_CHANGED_EVENT: &str = "folder-watch://changed";
const FOLDER_WATCH_ERROR_EVENT: &str = "folder-watch://error";
const MAX_STORED_EVENTS: usize = 200;

pub struct FolderWatchState {
    active: Mutex<Option<FolderWatch>>,
    events: Arc<Mutex<VecDeque<FolderWatchEvent>>>,
}

impl Default for FolderWatchState {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
            events: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderWatchOptions {
    pub path: String,
    pub filters: Option<Vec<String>>,
    pub recursive: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderWatchStatus {
    pub path: String,
    pub filters: Vec<String>,
    pub recursive: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderWatchEvent {
    pub id: String,
    pub watch_path: String,
    pub kind: String,
    pub paths: Vec<String>,
    pub message: Option<String>,
    pub occurred_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FolderWatchErrorEvent {
    watch_path: String,
    message: String,
}

struct FolderWatch {
    _watcher: RecommendedWatcher,
    status: FolderWatchStatus,
}

struct FileFilter {
    root: PathBuf,
    relative_patterns: Option<GlobSet>,
    basename_patterns: Option<GlobSet>,
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

fn folder_watch_lock(
    state: &FolderWatchState,
) -> Result<std::sync::MutexGuard<'_, Option<FolderWatch>>, String> {
    state
        .active
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

fn store_event(events: &Arc<Mutex<VecDeque<FolderWatchEvent>>>, event: FolderWatchEvent) {
    let Ok(mut events) = events.lock() else {
        return;
    };
    events.push_front(event);
    events.truncate(MAX_STORED_EVENTS);
}

#[tauri::command]
pub fn start_folder_watch(
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
    let stored_events = Arc::clone(&state.events);

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
                    id: Uuid::new_v4().to_string(),
                    watch_path: event_watch_path.clone(),
                    kind: folder_watch_kind_label(&event.kind).into(),
                    paths,
                    message: None,
                    occurred_at: Utc::now().to_rfc3339(),
                };
                store_event(&stored_events, payload.clone());

                if let Err(error) = event_app.emit(FOLDER_WATCH_CHANGED_EVENT, payload) {
                    eprintln!("Could not emit folder watch event: {error}");
                }
            }
            Err(error) => {
                let message = error.to_string();
                store_event(
                    &stored_events,
                    FolderWatchEvent {
                        id: Uuid::new_v4().to_string(),
                        watch_path: event_watch_path.clone(),
                        kind: "error".into(),
                        paths: Vec::new(),
                        message: Some(message.clone()),
                        occurred_at: Utc::now().to_rfc3339(),
                    },
                );
                let payload = FolderWatchErrorEvent {
                    watch_path: event_watch_path.clone(),
                    message,
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
pub fn stop_folder_watch(state: State<'_, FolderWatchState>) -> Result<bool, String> {
    let mut active_watch = folder_watch_lock(&state)?;
    Ok(active_watch.take().is_some())
}

#[tauri::command]
pub fn folder_watch_status(
    state: State<'_, FolderWatchState>,
) -> Result<Option<FolderWatchStatus>, String> {
    let active_watch = folder_watch_lock(&state)?;
    Ok(active_watch.as_ref().map(|watch| watch.status.clone()))
}

#[tauri::command]
pub fn list_folder_watch_events(
    state: State<'_, FolderWatchState>,
    limit: Option<u32>,
) -> CommandResult<Vec<FolderWatchEvent>> {
    let events = state
        .events
        .lock()
        .map_err(|_| lock_error("Folder watcher"))?;
    Ok(events
        .iter()
        .take(limit.unwrap_or(50) as usize)
        .cloned()
        .collect())
}

#[tauri::command]
pub fn clear_folder_watch_events(state: State<'_, FolderWatchState>) -> CommandResult<u32> {
    let mut events = state
        .events
        .lock()
        .map_err(|_| lock_error("Folder watcher"))?;
    let count = events.len();
    events.clear();
    Ok(count as u32)
}

pub fn recent_folder_watch_errors(
    state: &FolderWatchState,
    limit: usize,
) -> CommandResult<Vec<FolderWatchEvent>> {
    let events = state
        .events
        .lock()
        .map_err(|_| lock_error("Folder watcher"))?;
    Ok(events
        .iter()
        .filter(|event| event.kind == "error")
        .take(limit)
        .cloned()
        .collect())
}
