use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use crate::errors::{lock_error, AppError, CommandResult};

const WORKSPACE_FILE: &str = "workspace.json";
const RECENT_WORKSPACES_FILE: &str = "recent-workspaces.json";

#[derive(Default)]
pub struct WorkspaceState(pub Mutex<Option<Workspace>>);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspace {
    pub name: String,
    pub path: String,
    pub last_opened_at: String,
}

pub fn validate_workspace_name(name: &str) -> CommandResult<()> {
    if name.trim().is_empty() {
        return Err(AppError::validation("Workspace name cannot be empty."));
    }
    Ok(())
}

pub fn validate_workspace_directory(directory: &str) -> CommandResult<PathBuf> {
    let path = PathBuf::from(directory.trim());
    if path.as_os_str().is_empty() {
        return Err(AppError::validation("Workspace directory cannot be empty."));
    }
    if path.exists() && !path.is_dir() {
        return Err(AppError::validation(
            "Workspace directory must be a directory.",
        ));
    }
    Ok(path)
}

fn workspace_metadata_path(path: &Path) -> PathBuf {
    path.join(WORKSPACE_FILE)
}

fn recent_workspaces_path(app: &AppHandle) -> CommandResult<PathBuf> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(AppError::io)?
        .join(RECENT_WORKSPACES_FILE))
}

fn read_recent(app: &AppHandle) -> CommandResult<Vec<RecentWorkspace>> {
    let path = recent_workspaces_path(app)?;
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).map_err(AppError::serialization),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
        Err(error) => Err(AppError::io(error)),
    }
}

fn write_recent(app: &AppHandle, recent: &[RecentWorkspace]) -> CommandResult<()> {
    let path = recent_workspaces_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(AppError::io)?;
    }
    let contents = serde_json::to_string_pretty(recent).map_err(AppError::serialization)?;
    fs::write(path, contents).map_err(AppError::io)
}

fn upsert_recent(app: &AppHandle, workspace: &Workspace) -> CommandResult<()> {
    let mut recent = read_recent(app)?;
    recent.retain(|item| item.path != workspace.path);
    recent.insert(
        0,
        RecentWorkspace {
            name: workspace.name.clone(),
            path: workspace.path.clone(),
            last_opened_at: Utc::now().to_rfc3339(),
        },
    );
    recent.truncate(20);
    write_recent(app, &recent)
}

fn write_workspace(workspace: &Workspace) -> CommandResult<()> {
    let path = PathBuf::from(&workspace.path);
    fs::create_dir_all(&path).map_err(AppError::io)?;
    let contents = serde_json::to_string_pretty(workspace).map_err(AppError::serialization)?;
    fs::write(workspace_metadata_path(&path), contents).map_err(AppError::io)
}

#[tauri::command]
pub fn create_workspace(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    input: CreateWorkspaceInput,
) -> CommandResult<Workspace> {
    validate_workspace_name(&input.name)?;
    let directory = validate_workspace_directory(&input.directory)?;
    fs::create_dir_all(&directory).map_err(AppError::io)?;
    let directory = directory.canonicalize().map_err(AppError::io)?;
    let now = Utc::now().to_rfc3339();
    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name: input.name.trim().into(),
        path: directory.to_string_lossy().into_owned(),
        created_at: now.clone(),
        updated_at: now,
    };

    write_workspace(&workspace)?;
    upsert_recent(&app, &workspace)?;
    *state.0.lock().map_err(|_| lock_error("Workspace"))? = Some(workspace.clone());
    Ok(workspace)
}

#[tauri::command]
pub fn open_workspace(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    path: String,
) -> CommandResult<Workspace> {
    let directory = validate_workspace_directory(&path)?;
    let metadata_path = workspace_metadata_path(&directory);
    let contents = fs::read_to_string(metadata_path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("Workspace metadata was not found.")
        } else {
            AppError::io(error)
        }
    })?;
    let mut workspace: Workspace =
        serde_json::from_str(&contents).map_err(AppError::serialization)?;
    workspace.path = directory
        .canonicalize()
        .map_err(AppError::io)?
        .to_string_lossy()
        .into_owned();

    upsert_recent(&app, &workspace)?;
    *state.0.lock().map_err(|_| lock_error("Workspace"))? = Some(workspace.clone());
    Ok(workspace)
}

#[tauri::command]
pub fn save_workspace(
    app: AppHandle,
    state: State<'_, WorkspaceState>,
    mut workspace: Workspace,
) -> CommandResult<Workspace> {
    validate_workspace_name(&workspace.name)?;
    validate_workspace_directory(&workspace.path)?;
    workspace.updated_at = Utc::now().to_rfc3339();
    write_workspace(&workspace)?;
    upsert_recent(&app, &workspace)?;
    *state.0.lock().map_err(|_| lock_error("Workspace"))? = Some(workspace.clone());
    Ok(workspace)
}

#[tauri::command]
pub fn close_workspace(state: State<'_, WorkspaceState>) -> CommandResult<bool> {
    let mut active = state.0.lock().map_err(|_| lock_error("Workspace"))?;
    Ok(active.take().is_some())
}

#[tauri::command]
pub fn get_active_workspace(state: State<'_, WorkspaceState>) -> CommandResult<Option<Workspace>> {
    Ok(state.0.lock().map_err(|_| lock_error("Workspace"))?.clone())
}

#[tauri::command]
pub fn list_recent_workspaces(app: AppHandle) -> CommandResult<Vec<RecentWorkspace>> {
    read_recent(&app)
}

#[tauri::command]
pub fn remove_recent_workspace(app: AppHandle, path: String) -> CommandResult<bool> {
    let mut recent = read_recent(&app)?;
    let before = recent.len();
    recent.retain(|item| item.path != path);
    write_recent(&app, &recent)?;
    Ok(recent.len() != before)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn workspace_creation_rejects_empty_names() {
        assert!(validate_workspace_name("   ").is_err());
    }

    #[test]
    fn workspace_creation_rejects_invalid_paths() {
        assert!(validate_workspace_directory("").is_err());
    }
}
