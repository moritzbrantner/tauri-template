use serde::Serialize;
use tauri::AppHandle;

use crate::errors::CommandResult;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub available: Option<bool>,
    pub current_version: String,
    pub message: String,
}

#[tauri::command]
pub fn check_update_status(app: AppHandle) -> CommandResult<UpdateStatus> {
    Ok(UpdateStatus {
        available: None,
        current_version: app.package_info().version.to_string(),
        message: "Use the frontend updater API to check and install updates.".into(),
    })
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> CommandResult<()> {
    app.restart();
}
