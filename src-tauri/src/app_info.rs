use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::errors::{AppError, CommandResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub product_name: String,
    pub version: String,
    pub identifier: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub os: String,
    pub arch: String,
    pub debug: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub config_dir: String,
    pub data_dir: String,
    pub cache_dir: String,
    pub log_dir: String,
}

pub fn collect_app_info(app: &AppHandle) -> AppInfo {
    AppInfo {
        product_name: app.package_info().name.clone(),
        version: app.package_info().version.to_string(),
        identifier: app.config().identifier.clone(),
    }
}

pub fn collect_runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        debug: cfg!(debug_assertions),
    }
}

pub fn collect_app_paths(app: &AppHandle) -> CommandResult<AppPaths> {
    let paths = app.path();
    Ok(AppPaths {
        config_dir: paths
            .app_config_dir()
            .map_err(AppError::io)?
            .to_string_lossy()
            .into_owned(),
        data_dir: paths
            .app_data_dir()
            .map_err(AppError::io)?
            .to_string_lossy()
            .into_owned(),
        cache_dir: paths
            .app_cache_dir()
            .map_err(AppError::io)?
            .to_string_lossy()
            .into_owned(),
        log_dir: paths
            .app_log_dir()
            .map_err(AppError::io)?
            .to_string_lossy()
            .into_owned(),
    })
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> CommandResult<AppInfo> {
    Ok(collect_app_info(&app))
}

#[tauri::command]
pub fn get_runtime_info() -> CommandResult<RuntimeInfo> {
    Ok(collect_runtime_info())
}

#[tauri::command]
pub fn get_app_paths(app: AppHandle) -> CommandResult<AppPaths> {
    collect_app_paths(&app)
}
