use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use crate::{
    errors::{lock_error, AppError, CommandResult},
    jobs::{self, Job, JobState},
};

#[derive(Default)]
pub struct UploadState(pub Mutex<HashMap<String, Upload>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Upload {
    pub id: String,
    pub original_path: String,
    pub staged_path: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub status: String,
    pub job_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub type UploadStatus = Upload;

fn upload_dir(app: &AppHandle) -> CommandResult<PathBuf> {
    Ok(app
        .path()
        .app_cache_dir()
        .map_err(AppError::io)?
        .join("uploads"))
}

fn path_from_input(path: &str) -> CommandResult<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("Upload path cannot be empty."));
    }
    Ok(PathBuf::from(trimmed))
}

#[tauri::command]
pub fn stage_upload(
    app: AppHandle,
    state: State<'_, UploadState>,
    path: String,
) -> CommandResult<Upload> {
    let source = path_from_input(&path)?;
    let metadata = fs::metadata(&source).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("Upload file was not found.")
        } else {
            AppError::io(error)
        }
    })?;
    if !metadata.is_file() {
        return Err(AppError::validation("Upload path must point to a file."));
    }
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| AppError::validation("Upload file must have a file name."))?
        .to_string();
    let id = Uuid::new_v4().to_string();
    let target_dir = upload_dir(&app)?.join(&id);
    fs::create_dir_all(&target_dir).map_err(AppError::io)?;
    let staged_path = target_dir.join(&file_name);
    fs::copy(&source, &staged_path).map_err(AppError::io)?;
    let now = Utc::now().to_rfc3339();
    let upload = Upload {
        id,
        original_path: source.to_string_lossy().into_owned(),
        staged_path: staged_path.to_string_lossy().into_owned(),
        file_name,
        size_bytes: metadata.len(),
        status: "staged".into(),
        job_id: None,
        created_at: now.clone(),
        updated_at: now,
    };
    state
        .0
        .lock()
        .map_err(|_| lock_error("Upload"))?
        .insert(upload.id.clone(), upload.clone());
    Ok(upload)
}

#[tauri::command]
pub fn process_upload(
    app: AppHandle,
    upload_state: State<'_, UploadState>,
    job_state: State<'_, JobState>,
    upload_id: String,
) -> CommandResult<Job> {
    let upload = {
        let uploads = upload_state.0.lock().map_err(|_| lock_error("Upload"))?;
        uploads
            .get(&upload_id)
            .cloned()
            .ok_or_else(|| AppError::not_found(format!("Upload `{upload_id}` was not found.")))?
    };
    let job = jobs::create_background_job(
        app,
        &job_state,
        "upload.process".into(),
        json!({ "uploadId": upload.id, "path": upload.staged_path }),
    )?;
    let mut uploads = upload_state.0.lock().map_err(|_| lock_error("Upload"))?;
    let upload = uploads
        .get_mut(&upload_id)
        .ok_or_else(|| AppError::not_found(format!("Upload `{upload_id}` was not found.")))?;
    upload.status = "processing".into();
    upload.job_id = Some(job.id.clone());
    upload.updated_at = Utc::now().to_rfc3339();
    Ok(job)
}

#[tauri::command]
pub fn cancel_upload(
    upload_state: State<'_, UploadState>,
    job_state: State<'_, JobState>,
    upload_id: String,
) -> CommandResult<bool> {
    let job_id = {
        let mut uploads = upload_state.0.lock().map_err(|_| lock_error("Upload"))?;
        let upload = uploads
            .get_mut(&upload_id)
            .ok_or_else(|| AppError::not_found(format!("Upload `{upload_id}` was not found.")))?;
        upload.status = "cancelled".into();
        upload.updated_at = Utc::now().to_rfc3339();
        upload.job_id.clone()
    };

    if let Some(job_id) = job_id {
        let mut jobs = job_state.0.lock().map_err(|_| lock_error("Job"))?;
        if let Some(job) = jobs.get_mut(&job_id) {
            job.status = "cancelled".into();
            job.updated_at = Utc::now().to_rfc3339();
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn get_upload_status(
    state: State<'_, UploadState>,
    upload_id: String,
) -> CommandResult<UploadStatus> {
    state
        .0
        .lock()
        .map_err(|_| lock_error("Upload"))?
        .get(&upload_id)
        .cloned()
        .ok_or_else(|| AppError::not_found(format!("Upload `{upload_id}` was not found.")))
}

#[tauri::command]
pub fn list_uploads(state: State<'_, UploadState>) -> CommandResult<Vec<Upload>> {
    let mut uploads = state
        .0
        .lock()
        .map_err(|_| lock_error("Upload"))?
        .values()
        .cloned()
        .collect::<Vec<_>>();
    uploads.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(uploads)
}

#[tauri::command]
pub fn clear_upload(state: State<'_, UploadState>, upload_id: String) -> CommandResult<bool> {
    Ok(state
        .0
        .lock()
        .map_err(|_| lock_error("Upload"))?
        .remove(&upload_id)
        .is_some())
}
