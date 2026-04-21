use std::{collections::HashMap, sync::Mutex, thread, time::Duration};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

use crate::errors::{lock_error, AppError, CommandResult};

pub const JOB_STARTED_EVENT: &str = "job://started";
pub const JOB_PROGRESS_EVENT: &str = "job://progress";
pub const JOB_COMPLETED_EVENT: &str = "job://completed";
pub const JOB_CANCELLED_EVENT: &str = "job://cancelled";

#[derive(Default)]
pub struct JobState(pub Mutex<HashMap<String, Job>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub kind: String,
    pub status: String,
    pub progress: f32,
    pub message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub type JobStatus = Job;

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn make_job(kind: String) -> Job {
    let timestamp = now();
    Job {
        id: Uuid::new_v4().to_string(),
        kind,
        status: "queued".into(),
        progress: 0.0,
        message: None,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    }
}

fn emit_job(app: &AppHandle, event: &str, job: &Job) {
    if let Err(error) = app.emit(event, job) {
        eprintln!("Could not emit job event `{event}`: {error}");
    }
}

fn set_job_status(
    state: &JobState,
    job_id: &str,
    status: &str,
    progress: f32,
    message: Option<String>,
) -> CommandResult<Job> {
    let mut jobs = state.0.lock().map_err(|_| lock_error("Job"))?;
    let job = jobs
        .get_mut(job_id)
        .ok_or_else(|| AppError::job_not_found(job_id))?;
    job.status = status.into();
    job.progress = progress;
    job.message = message;
    job.updated_at = now();
    Ok(job.clone())
}

pub fn create_background_job(
    app: AppHandle,
    state: &JobState,
    kind: String,
    payload: Value,
) -> CommandResult<Job> {
    if kind.trim().is_empty() {
        return Err(AppError::validation("Job kind cannot be empty."));
    }
    let mut job = make_job(kind.trim().into());
    job.status = "running".into();
    job.message = payload
        .get("message")
        .and_then(|value| value.as_str())
        .map(str::to_string);
    {
        let mut jobs = state.0.lock().map_err(|_| lock_error("Job"))?;
        jobs.insert(job.id.clone(), job.clone());
    }
    emit_job(&app, JOB_STARTED_EVENT, &job);

    let job_id = job.id.clone();
    let app_handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        for step in 1..=10 {
            thread::sleep(Duration::from_millis(80));
            let state = app_handle.state::<JobState>();
            let current_status = {
                let jobs = match state.0.lock() {
                    Ok(jobs) => jobs,
                    Err(_) => return,
                };
                jobs.get(&job_id).map(|job| job.status.clone())
            };
            if current_status.as_deref() == Some("cancelled") {
                if let Ok(job) = set_job_status(&state, &job_id, "cancelled", 0.0, None) {
                    emit_job(&app_handle, JOB_CANCELLED_EVENT, &job);
                }
                return;
            }
            match set_job_status(
                &state,
                &job_id,
                "running",
                step as f32 / 10.0,
                Some(format!("Processing {step}/10")),
            ) {
                Ok(job) => emit_job(&app_handle, JOB_PROGRESS_EVENT, &job),
                Err(_) => return,
            }
        }
        let state = app_handle.state::<JobState>();
        if let Ok(job) = set_job_status(&state, &job_id, "completed", 1.0, None) {
            emit_job(&app_handle, JOB_COMPLETED_EVENT, &job);
        }
    });

    Ok(job)
}

#[cfg(test)]
pub fn complete_job_for_test(state: &JobState, kind: &str) -> CommandResult<Job> {
    let mut job = make_job(kind.into());
    job.status = "started".into();
    {
        let mut jobs = state.0.lock().map_err(|_| lock_error("Job"))?;
        jobs.insert(job.id.clone(), job.clone());
    }
    set_job_status(state, &job.id, "completed", 1.0, None)
}

#[tauri::command]
pub fn start_job(
    app: AppHandle,
    state: State<'_, JobState>,
    kind: String,
    payload: Value,
) -> CommandResult<Job> {
    create_background_job(app, &state, kind, payload)
}

#[tauri::command]
pub fn cancel_job(state: State<'_, JobState>, job_id: String) -> CommandResult<bool> {
    let mut jobs = state.0.lock().map_err(|_| lock_error("Job"))?;
    let job = jobs
        .get_mut(&job_id)
        .ok_or_else(|| AppError::job_not_found(&job_id))?;
    if matches!(job.status.as_str(), "completed" | "failed" | "cancelled") {
        return Ok(false);
    }
    job.status = "cancelled".into();
    job.updated_at = now();
    Ok(true)
}

#[tauri::command]
pub fn job_status(state: State<'_, JobState>, job_id: String) -> CommandResult<JobStatus> {
    state
        .0
        .lock()
        .map_err(|_| lock_error("Job"))?
        .get(&job_id)
        .cloned()
        .ok_or_else(|| AppError::job_not_found(&job_id))
}

#[tauri::command]
pub fn list_jobs(state: State<'_, JobState>) -> CommandResult<Vec<Job>> {
    let mut jobs = state
        .0
        .lock()
        .map_err(|_| lock_error("Job"))?
        .values()
        .cloned()
        .collect::<Vec<_>>();
    jobs.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(jobs)
}

#[tauri::command]
pub fn clear_finished_jobs(state: State<'_, JobState>) -> CommandResult<u32> {
    let mut jobs = state.0.lock().map_err(|_| lock_error("Job"))?;
    let before = jobs.len();
    jobs.retain(|_, job| !matches!(job.status.as_str(), "completed" | "failed" | "cancelled"));
    Ok((before - jobs.len()) as u32)
}

pub fn recent_jobs(state: &JobState, limit: usize) -> CommandResult<Vec<Job>> {
    let mut jobs = state
        .0
        .lock()
        .map_err(|_| lock_error("Job"))?
        .values()
        .cloned()
        .collect::<Vec<_>>();
    jobs.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    jobs.truncate(limit);
    Ok(jobs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn job_lifecycle_moves_from_started_to_completed() {
        let state = JobState::default();

        let job = complete_job_for_test(&state, "test").expect("job");

        assert_eq!(job.status, "completed");
        assert_eq!(job.progress, 1.0);
    }

    #[test]
    fn cancelling_a_missing_job_returns_job_not_found() {
        let state = JobState::default();
        let result = set_job_status(&state, "missing", "cancelled", 0.0, None);

        assert_eq!(result.unwrap_err().code, "job_not_found");
    }
}
