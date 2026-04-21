use std::{
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
};

use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::errors::{AppError, CommandResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileValidation {
    pub path: String,
    pub exists: bool,
    pub is_file: bool,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredFile {
    pub original_path: String,
    pub stored_path: String,
    pub file_name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileHash {
    pub path: String,
    pub algorithm: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub removed_files: u32,
    pub removed_bytes: u64,
}

fn path_from_input(path: &str) -> CommandResult<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation("Path cannot be empty."));
    }
    Ok(PathBuf::from(trimmed))
}

fn reject_path_traversal(path: &Path) -> CommandResult<()> {
    if path
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(AppError::validation(
            "Path cannot contain parent traversal.",
        ));
    }
    Ok(())
}

fn app_owned_roots(app: &AppHandle) -> CommandResult<Vec<PathBuf>> {
    let paths = app.path();
    Ok(vec![
        paths.app_config_dir().map_err(AppError::io)?,
        paths.app_data_dir().map_err(AppError::io)?,
        paths.app_cache_dir().map_err(AppError::io)?,
        paths.app_log_dir().map_err(AppError::io)?,
    ])
}

fn ensure_write_allowed(app: &AppHandle, path: &Path) -> CommandResult<()> {
    reject_path_traversal(path)?;
    let parent = path
        .parent()
        .ok_or_else(|| AppError::validation("Write path must have a parent directory."))?;
    fs::create_dir_all(parent).map_err(AppError::io)?;
    let parent = parent.canonicalize().map_err(AppError::io)?;
    let roots = app_owned_roots(app)?;
    for root in roots {
        if parent.starts_with(root) {
            return Ok(());
        }
    }
    Err(AppError::validation(
        "Writes are only allowed inside app-owned directories.",
    ))
}

pub fn calculate_sha256_for_path(path: &Path) -> CommandResult<String> {
    let mut file = fs::File::open(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("File was not found.")
        } else {
            AppError::io(error)
        }
    })?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 8192];
    loop {
        let read = file.read(&mut buffer).map_err(AppError::io)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn remove_directory_contents(path: &Path) -> CommandResult<CleanupResult> {
    let mut result = CleanupResult {
        removed_files: 0,
        removed_bytes: 0,
    };
    if !path.exists() {
        return Ok(result);
    }
    for entry in fs::read_dir(path).map_err(AppError::io)? {
        let entry = entry.map_err(AppError::io)?;
        let metadata = entry.metadata().map_err(AppError::io)?;
        if metadata.is_dir() {
            let nested = remove_directory_contents(&entry.path())?;
            result.removed_files += nested.removed_files;
            result.removed_bytes += nested.removed_bytes;
            fs::remove_dir_all(entry.path()).map_err(AppError::io)?;
        } else {
            result.removed_files += 1;
            result.removed_bytes += metadata.len();
            fs::remove_file(entry.path()).map_err(AppError::io)?;
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn validate_file(path: String) -> CommandResult<FileValidation> {
    let path = path_from_input(&path)?;
    let metadata = fs::metadata(&path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("File was not found.")
        } else {
            AppError::io(error)
        }
    })?;
    if !metadata.is_file() {
        return Err(AppError::validation("Path must point to a file."));
    }

    Ok(FileValidation {
        path: path.to_string_lossy().into_owned(),
        exists: true,
        is_file: metadata.is_file(),
        size_bytes: metadata.len(),
    })
}

#[tauri::command]
pub fn read_text_file(path: String) -> CommandResult<String> {
    let path = path_from_input(&path)?;
    fs::read_to_string(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("File was not found.")
        } else {
            AppError::io(error)
        }
    })
}

#[tauri::command]
pub fn write_text_file(app: AppHandle, path: String, contents: String) -> CommandResult<bool> {
    let path = path_from_input(&path)?;
    ensure_write_allowed(&app, &path)?;
    fs::write(path, contents).map_err(AppError::io)?;
    Ok(true)
}

#[tauri::command]
pub fn copy_file_to_app_data(
    app: AppHandle,
    path: String,
    subdir: Option<String>,
) -> CommandResult<StoredFile> {
    let source = path_from_input(&path)?;
    let metadata = fs::metadata(&source).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::not_found("File was not found.")
        } else {
            AppError::io(error)
        }
    })?;
    if !metadata.is_file() {
        return Err(AppError::validation("Source path must point to a file."));
    }
    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| AppError::validation("Source file must have a file name."))?
        .to_string();
    let mut target_dir = app.path().app_data_dir().map_err(AppError::io)?;
    if let Some(subdir) = subdir {
        let subdir = PathBuf::from(subdir.trim());
        reject_path_traversal(&subdir)?;
        if subdir.is_absolute() {
            return Err(AppError::validation("Subdirectory must be relative."));
        }
        target_dir.push(subdir);
    }
    fs::create_dir_all(&target_dir).map_err(AppError::io)?;
    let target = target_dir.join(&file_name);
    fs::copy(&source, &target).map_err(AppError::io)?;
    let copied_metadata = fs::metadata(&target).map_err(AppError::io)?;

    Ok(StoredFile {
        original_path: source.to_string_lossy().into_owned(),
        stored_path: target.to_string_lossy().into_owned(),
        file_name,
        size_bytes: copied_metadata.len(),
    })
}

#[tauri::command]
pub fn calculate_file_hash(path: String) -> CommandResult<FileHash> {
    let path = path_from_input(&path)?;
    let hash = calculate_sha256_for_path(&path)?;
    Ok(FileHash {
        path: path.to_string_lossy().into_owned(),
        algorithm: "sha256".into(),
        hash,
    })
}

#[tauri::command]
pub fn cleanup_temp_files(app: AppHandle) -> CommandResult<CleanupResult> {
    let temp_dir = app
        .path()
        .app_cache_dir()
        .map_err(AppError::io)?
        .join("temp");
    remove_directory_contents(&temp_dir)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_validation_rejects_missing_files() {
        let result = validate_file("/definitely/missing/file.txt".into());

        assert_eq!(result.unwrap_err().code, "not_found");
    }

    #[test]
    fn file_hash_is_stable_for_known_content() {
        let temp = tempfile::NamedTempFile::new().expect("tempfile");
        fs::write(temp.path(), "hello").expect("write");

        let hash = calculate_sha256_for_path(temp.path()).expect("hash");

        assert_eq!(
            hash,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }
}
