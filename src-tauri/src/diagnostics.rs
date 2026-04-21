use std::fs;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::{
    app_info::{self, AppInfo, AppPaths, RuntimeInfo},
    errors::{AppError, CommandResult},
    files::CleanupResult,
    folder_watch::{self, FolderWatchEvent, FolderWatchState},
    jobs::{self, Job, JobState},
    settings,
    storage::{self, MigrationStatus},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsStatus {
    pub valid: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    pub ok: bool,
    pub app_info: AppInfo,
    pub runtime_info: RuntimeInfo,
    pub app_paths: AppPaths,
    pub settings: SettingsStatus,
    pub database: MigrationStatus,
    pub recent_jobs: Vec<Job>,
    pub recent_folder_watch_errors: Vec<FolderWatchEvent>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogFile {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsBundle {
    pub path: String,
    pub included_files: Vec<String>,
}

fn settings_status(app: &AppHandle) -> SettingsStatus {
    match settings::load_settings(app.clone()) {
        Ok(settings) => match settings::validate_settings(&settings) {
            Ok(()) => SettingsStatus {
                valid: true,
                message: None,
            },
            Err(error) => SettingsStatus {
                valid: false,
                message: Some(error),
            },
        },
        Err(error) => SettingsStatus {
            valid: false,
            message: Some(error),
        },
    }
}

pub fn health_report_for_app(
    app: &AppHandle,
    job_state: &JobState,
    folder_state: &FolderWatchState,
) -> CommandResult<HealthReport> {
    let db_path = storage::database_path(app)?;
    let database = storage::run_migrations_for_path(&db_path)?;
    Ok(HealthReport {
        ok: true,
        app_info: app_info::collect_app_info(app),
        runtime_info: app_info::collect_runtime_info(),
        app_paths: app_info::collect_app_paths(app)?,
        settings: settings_status(app),
        database,
        recent_jobs: jobs::recent_jobs(job_state, 10)?,
        recent_folder_watch_errors: folder_watch::recent_folder_watch_errors(folder_state, 10)?,
    })
}

#[tauri::command]
pub fn health_check(
    app: AppHandle,
    job_state: State<'_, JobState>,
    folder_state: State<'_, FolderWatchState>,
) -> CommandResult<HealthReport> {
    health_report_for_app(&app, &job_state, &folder_state)
}

#[tauri::command]
pub fn get_log_files(app: AppHandle) -> CommandResult<Vec<LogFile>> {
    let log_dir = app.path().app_log_dir().map_err(AppError::io)?;
    if !log_dir.exists() {
        return Ok(Vec::new());
    }
    let mut logs = Vec::new();
    for entry in fs::read_dir(log_dir).map_err(AppError::io)? {
        let entry = entry.map_err(AppError::io)?;
        let metadata = entry.metadata().map_err(AppError::io)?;
        if metadata.is_file() {
            logs.push(LogFile {
                path: entry.path().to_string_lossy().into_owned(),
                size_bytes: metadata.len(),
            });
        }
    }
    logs.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(logs)
}

#[tauri::command]
pub fn export_diagnostics_bundle(
    app: AppHandle,
    job_state: State<'_, JobState>,
    folder_state: State<'_, FolderWatchState>,
) -> CommandResult<DiagnosticsBundle> {
    let report = health_report_for_app(&app, &job_state, &folder_state)?;
    let target_dir = app
        .path()
        .app_cache_dir()
        .map_err(AppError::io)?
        .join("diagnostics");
    fs::create_dir_all(&target_dir).map_err(AppError::io)?;
    let path = target_dir.join(format!(
        "diagnostics-{}.json",
        chrono::Utc::now().format("%Y%m%d%H%M%S")
    ));
    let contents = serde_json::to_string_pretty(&report).map_err(AppError::serialization)?;
    fs::write(&path, contents).map_err(AppError::io)?;

    let mut included_files = vec![path.to_string_lossy().into_owned()];
    included_files.extend(get_log_files(app)?.into_iter().map(|log| log.path));

    Ok(DiagnosticsBundle {
        path: path.to_string_lossy().into_owned(),
        included_files,
    })
}

#[tauri::command]
pub fn clear_logs(app: AppHandle) -> CommandResult<CleanupResult> {
    let log_dir = app.path().app_log_dir().map_err(AppError::io)?;
    let mut result = CleanupResult {
        removed_files: 0,
        removed_bytes: 0,
    };
    if !log_dir.exists() {
        return Ok(result);
    }
    for entry in fs::read_dir(log_dir).map_err(AppError::io)? {
        let entry = entry.map_err(AppError::io)?;
        let metadata = entry.metadata().map_err(AppError::io)?;
        if metadata.is_file() {
            result.removed_files += 1;
            result.removed_bytes += metadata.len();
            fs::remove_file(entry.path()).map_err(AppError::io)?;
        }
    }
    Ok(result)
}
