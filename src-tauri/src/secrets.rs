use keyring::{Entry, Error as KeyringError};
use tauri::AppHandle;

use crate::errors::{AppError, CommandResult};

fn service_name(app: &AppHandle) -> String {
    app.config().identifier.clone()
}

fn prefixed_key(app: &AppHandle, key: &str) -> CommandResult<String> {
    let key = key.trim();
    if key.is_empty() {
        return Err(AppError::validation("Secret key cannot be empty."));
    }
    Ok(format!("{}:{key}", app.config().identifier))
}

fn entry(app: &AppHandle, key: &str) -> CommandResult<Entry> {
    Entry::new(&service_name(app), &prefixed_key(app, key)?).map_err(AppError::secret)
}

#[tauri::command]
pub fn save_secret(app: AppHandle, key: String, value: String) -> CommandResult<bool> {
    entry(&app, &key)?
        .set_password(&value)
        .map_err(AppError::secret)?;
    Ok(true)
}

#[tauri::command]
pub fn load_secret(app: AppHandle, key: String) -> CommandResult<Option<String>> {
    match entry(&app, &key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(AppError::secret(error)),
    }
}

#[tauri::command]
pub fn delete_secret(app: AppHandle, key: String) -> CommandResult<bool> {
    match entry(&app, &key)?.delete_credential() {
        Ok(()) => Ok(true),
        Err(KeyringError::NoEntry) => Ok(false),
        Err(error) => Err(AppError::secret(error)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn secret_save_load_delete_round_trip_when_keychain_is_available() {
        let key = format!("test-{}", Uuid::new_v4());
        let entry = Entry::new("tauri-template-test", &key).expect("keyring entry");

        if let Err(error) = entry.set_password("secret-value") {
            eprintln!("Skipping keyring round trip because keychain is unavailable: {error}");
            return;
        }

        assert_eq!(entry.get_password().expect("load secret"), "secret-value");
        entry.delete_credential().expect("delete secret");
        assert!(matches!(entry.get_password(), Err(KeyringError::NoEntry)));
    }
}
