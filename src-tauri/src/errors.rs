use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
}

pub type CommandResult<T> = Result<T, AppError>;

impl AppError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self::new("validation_error", message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new("not_found", message)
    }

    pub fn io(error: impl std::fmt::Display) -> Self {
        Self::new("io_error", error.to_string())
    }

    pub fn serialization(error: impl std::fmt::Display) -> Self {
        Self::new("serialization_error", error.to_string())
    }

    pub fn database(error: impl std::fmt::Display) -> Self {
        Self::new("database_error", error.to_string())
    }

    pub fn job_not_found(job_id: &str) -> Self {
        Self::new("job_not_found", format!("Job `{job_id}` was not found."))
    }

    pub fn secret(error: impl std::fmt::Display) -> Self {
        Self::new("secret_error", error.to_string())
    }

    pub fn internal(error: impl std::fmt::Display) -> Self {
        Self::new("internal_error", error.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::io(error)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        Self::serialization(error)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        Self::database(error)
    }
}

pub fn lock_error(name: &str) -> AppError {
    AppError::internal(format!("{name} state lock was poisoned."))
}
