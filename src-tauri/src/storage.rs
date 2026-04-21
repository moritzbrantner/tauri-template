use std::path::{Path, PathBuf};

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::errors::{AppError, CommandResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStatus {
    pub database_path: String,
    pub applied: bool,
    pub tables: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordQuery {
    pub kind: Option<String>,
    pub search: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub payload: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRecordInput {
    pub kind: String,
    pub title: String,
    pub payload: Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecordInput {
    pub kind: Option<String>,
    pub title: Option<String>,
    pub payload: Option<Value>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported: u32,
    pub skipped: u32,
}

pub fn database_path(app: &AppHandle) -> CommandResult<PathBuf> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(AppError::io)?
        .join("app.db"))
}

fn open_app_connection(app: &AppHandle) -> CommandResult<Connection> {
    let path = database_path(app)?;
    open_connection(&path)
}

pub fn open_connection(path: &Path) -> CommandResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(AppError::io)?;
    }

    Connection::open(path).map_err(AppError::database)
}

pub fn run_migrations_for_path(path: &Path) -> CommandResult<MigrationStatus> {
    let connection = open_connection(path)?;
    apply_migrations(&connection)?;
    Ok(MigrationStatus {
        database_path: path.to_string_lossy().into_owned(),
        applied: true,
        tables: list_tables(&connection)?,
    })
}

pub fn apply_migrations(connection: &Connection) -> CommandResult<()> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                kind TEXT NOT NULL,
                read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS outbox (
                id TEXT PRIMARY KEY,
                channel TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )
        .map_err(AppError::database)
}

pub fn list_tables(connection: &Connection) -> CommandResult<Vec<String>> {
    let mut statement = connection
        .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .map_err(AppError::database)?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(AppError::database)?;

    let mut tables = Vec::new();
    for row in rows {
        tables.push(row.map_err(AppError::database)?);
    }
    Ok(tables)
}

fn validate_record_parts(kind: &str, title: &str) -> CommandResult<()> {
    if kind.trim().is_empty() {
        return Err(AppError::validation("Record kind cannot be empty."));
    }
    if title.trim().is_empty() {
        return Err(AppError::validation("Record title cannot be empty."));
    }
    Ok(())
}

fn row_to_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<Record> {
    let payload_json: String = row.get(3)?;
    let payload = serde_json::from_str(&payload_json).unwrap_or(Value::Null);
    Ok(Record {
        id: row.get(0)?,
        kind: row.get(1)?,
        title: row.get(2)?,
        payload,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

pub fn create_record_in_connection(
    connection: &Connection,
    input: CreateRecordInput,
) -> CommandResult<Record> {
    validate_record_parts(&input.kind, &input.title)?;
    let now = Utc::now().to_rfc3339();
    let record = Record {
        id: Uuid::new_v4().to_string(),
        kind: input.kind.trim().into(),
        title: input.title.trim().into(),
        payload: input.payload,
        created_at: now.clone(),
        updated_at: now,
    };
    let payload_json = serde_json::to_string(&record.payload).map_err(AppError::serialization)?;

    connection
        .execute(
            "INSERT INTO records (id, kind, title, payload_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                record.id,
                record.kind,
                record.title,
                payload_json,
                record.created_at,
                record.updated_at
            ],
        )
        .map_err(AppError::database)?;

    Ok(record)
}

pub fn get_record_by_id(connection: &Connection, id: &str) -> CommandResult<Record> {
    connection
        .query_row(
            "SELECT id, kind, title, payload_json, created_at, updated_at FROM records WHERE id = ?1",
            params![id],
            row_to_record,
        )
        .optional()
        .map_err(AppError::database)?
        .ok_or_else(|| AppError::not_found(format!("Record `{id}` was not found.")))
}

#[tauri::command]
pub fn run_migrations(app: AppHandle) -> CommandResult<MigrationStatus> {
    let path = database_path(&app)?;
    run_migrations_for_path(&path)
}

#[tauri::command]
pub fn get_records(app: AppHandle, query: RecordQuery) -> CommandResult<Vec<Record>> {
    let connection = open_app_connection(&app)?;
    apply_migrations(&connection)?;

    let mut statement = connection
        .prepare(
            "SELECT id, kind, title, payload_json, created_at, updated_at FROM records ORDER BY updated_at DESC",
        )
        .map_err(AppError::database)?;
    let rows = statement
        .query_map([], row_to_record)
        .map_err(AppError::database)?;

    let search = query.search.map(|value| value.to_lowercase());
    let mut records = Vec::new();
    for row in rows {
        let record = row.map_err(AppError::database)?;
        if let Some(kind) = &query.kind {
            if record.kind != kind.trim() {
                continue;
            }
        }
        if let Some(search) = &search {
            if !record.title.to_lowercase().contains(search) {
                continue;
            }
        }
        records.push(record);
        if query
            .limit
            .is_some_and(|limit| records.len() >= limit as usize)
        {
            break;
        }
    }

    Ok(records)
}

#[tauri::command]
pub fn create_record(app: AppHandle, input: CreateRecordInput) -> CommandResult<Record> {
    let connection = open_app_connection(&app)?;
    apply_migrations(&connection)?;
    create_record_in_connection(&connection, input)
}

#[tauri::command]
pub fn update_record(
    app: AppHandle,
    id: String,
    patch: UpdateRecordInput,
) -> CommandResult<Record> {
    let connection = open_app_connection(&app)?;
    apply_migrations(&connection)?;
    let mut record = get_record_by_id(&connection, &id)?;

    if let Some(kind) = patch.kind {
        record.kind = kind.trim().into();
    }
    if let Some(title) = patch.title {
        record.title = title.trim().into();
    }
    if let Some(payload) = patch.payload {
        record.payload = payload;
    }
    validate_record_parts(&record.kind, &record.title)?;
    record.updated_at = Utc::now().to_rfc3339();
    let payload_json = serde_json::to_string(&record.payload).map_err(AppError::serialization)?;

    connection
        .execute(
            "UPDATE records SET kind = ?1, title = ?2, payload_json = ?3, updated_at = ?4 WHERE id = ?5",
            params![record.kind, record.title, payload_json, record.updated_at, id],
        )
        .map_err(AppError::database)?;

    Ok(record)
}

#[tauri::command]
pub fn delete_record(app: AppHandle, id: String) -> CommandResult<bool> {
    let connection = open_app_connection(&app)?;
    apply_migrations(&connection)?;
    let changed = connection
        .execute("DELETE FROM records WHERE id = ?1", params![id])
        .map_err(AppError::database)?;
    Ok(changed > 0)
}

#[tauri::command]
pub fn export_data(app: AppHandle, format: ExportFormat) -> CommandResult<String> {
    match format {
        ExportFormat::Json => {
            let records = get_records(
                app,
                RecordQuery {
                    kind: None,
                    search: None,
                    limit: None,
                },
            )?;
            serde_json::to_string_pretty(&records).map_err(AppError::serialization)
        }
    }
}

#[tauri::command]
pub fn import_data(
    app: AppHandle,
    contents: String,
    format: ExportFormat,
) -> CommandResult<ImportResult> {
    let records = match format {
        ExportFormat::Json => {
            serde_json::from_str::<Vec<Record>>(&contents).map_err(AppError::serialization)?
        }
    };
    let connection = open_app_connection(&app)?;
    apply_migrations(&connection)?;

    let mut imported = 0;
    let mut skipped = 0;
    for record in records {
        if validate_record_parts(&record.kind, &record.title).is_err() {
            skipped += 1;
            continue;
        }
        let payload_json =
            serde_json::to_string(&record.payload).map_err(AppError::serialization)?;
        let changed = connection
            .execute(
                "INSERT OR REPLACE INTO records (id, kind, title, payload_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    record.id,
                    record.kind,
                    record.title,
                    payload_json,
                    record.created_at,
                    record.updated_at
                ],
            )
            .map_err(AppError::database)?;
        if changed > 0 {
            imported += 1;
        }
    }

    Ok(ImportResult { imported, skipped })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn sqlite_migration_creates_expected_tables() {
        let temp = tempfile::tempdir().expect("tempdir");
        let path = temp.path().join("app.db");

        let status = run_migrations_for_path(&path).expect("migrations");

        assert!(status.tables.contains(&"records".into()));
        assert!(status.tables.contains(&"notifications".into()));
        assert!(status.tables.contains(&"outbox".into()));
    }

    #[test]
    fn record_create_get_update_delete_flow() {
        let connection = Connection::open_in_memory().expect("sqlite");
        apply_migrations(&connection).expect("migrations");
        let record = create_record_in_connection(
            &connection,
            CreateRecordInput {
                kind: "note".into(),
                title: "First".into(),
                payload: json!({ "ok": true }),
            },
        )
        .expect("record");

        assert_eq!(
            get_record_by_id(&connection, &record.id).unwrap().title,
            "First"
        );

        connection
            .execute(
                "UPDATE records SET title = ?1, updated_at = ?2 WHERE id = ?3",
                params!["Second", Utc::now().to_rfc3339(), record.id],
            )
            .expect("update");

        assert_eq!(
            get_record_by_id(&connection, &record.id).unwrap().title,
            "Second"
        );

        let deleted = connection
            .execute("DELETE FROM records WHERE id = ?1", params![record.id])
            .expect("delete");
        assert_eq!(deleted, 1);
    }
}
