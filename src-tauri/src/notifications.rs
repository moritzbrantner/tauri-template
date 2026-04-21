use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::{
    errors::{AppError, CommandResult},
    storage,
};

const NOTIFICATION_CREATED_EVENT: &str = "notification://created";
const NOTIFICATION_UPDATED_EVENT: &str = "notification://updated";
const OUTBOX_FLUSHED_EVENT: &str = "outbox://flushed";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub body: String,
    pub kind: String,
    pub read: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationInput {
    pub title: String,
    pub body: String,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueuedMessage {
    pub id: String,
    pub channel: String,
    pub payload: Value,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueMessageInput {
    pub channel: String,
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FlushResult {
    pub queued: u32,
    pub sent: u32,
}

fn open_connection(app: &AppHandle) -> CommandResult<Connection> {
    let connection = storage::open_connection(&storage::database_path(app)?)?;
    storage::apply_migrations(&connection)?;
    Ok(connection)
}

fn row_to_notification(row: &rusqlite::Row<'_>) -> rusqlite::Result<Notification> {
    Ok(Notification {
        id: row.get(0)?,
        title: row.get(1)?,
        body: row.get(2)?,
        kind: row.get(3)?,
        read: row.get::<_, i64>(4)? != 0,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

pub fn create_notification_in_connection(
    connection: &Connection,
    input: CreateNotificationInput,
) -> CommandResult<Notification> {
    if input.title.trim().is_empty() {
        return Err(AppError::validation("Notification title cannot be empty."));
    }
    let now = Utc::now().to_rfc3339();
    let notification = Notification {
        id: Uuid::new_v4().to_string(),
        title: input.title.trim().into(),
        body: input.body,
        kind: input.kind.unwrap_or_else(|| "info".into()),
        read: false,
        created_at: now.clone(),
        updated_at: now,
    };
    connection
        .execute(
            "INSERT INTO notifications (id, title, body, kind, read, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                notification.id,
                notification.title,
                notification.body,
                notification.kind,
                0,
                notification.created_at,
                notification.updated_at
            ],
        )
        .map_err(AppError::database)?;
    Ok(notification)
}

pub fn list_notifications_in_connection(
    connection: &Connection,
) -> CommandResult<Vec<Notification>> {
    let mut statement = connection
        .prepare(
            "SELECT id, title, body, kind, read, created_at, updated_at FROM notifications ORDER BY created_at DESC",
        )
        .map_err(AppError::database)?;
    let rows = statement
        .query_map([], row_to_notification)
        .map_err(AppError::database)?;
    let mut notifications = Vec::new();
    for row in rows {
        notifications.push(row.map_err(AppError::database)?);
    }
    Ok(notifications)
}

#[tauri::command]
pub fn list_notifications(app: AppHandle) -> CommandResult<Vec<Notification>> {
    let connection = open_connection(&app)?;
    list_notifications_in_connection(&connection)
}

#[tauri::command]
pub fn create_notification(
    app: AppHandle,
    input: CreateNotificationInput,
) -> CommandResult<Notification> {
    let connection = open_connection(&app)?;
    let notification = create_notification_in_connection(&connection, input)?;
    if let Err(error) = app.emit(NOTIFICATION_CREATED_EVENT, &notification) {
        eprintln!("Could not emit notification event: {error}");
    }
    Ok(notification)
}

#[tauri::command]
pub fn mark_notification_read(app: AppHandle, id: String) -> CommandResult<bool> {
    let connection = open_connection(&app)?;
    let changed = connection
        .execute(
            "UPDATE notifications SET read = 1, updated_at = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )
        .map_err(AppError::database)?;
    if changed > 0 {
        let notification = connection
            .query_row(
                "SELECT id, title, body, kind, read, created_at, updated_at FROM notifications WHERE id = ?1",
                params![id],
                row_to_notification,
            )
            .optional()
            .map_err(AppError::database)?;
        if let Some(notification) = notification {
            if let Err(error) = app.emit(NOTIFICATION_UPDATED_EVENT, notification) {
                eprintln!("Could not emit notification update event: {error}");
            }
        }
    }
    Ok(changed > 0)
}

#[tauri::command]
pub fn mark_all_notifications_read(app: AppHandle) -> CommandResult<u32> {
    let connection = open_connection(&app)?;
    let changed = connection
        .execute(
            "UPDATE notifications SET read = 1, updated_at = ?1 WHERE read = 0",
            params![Utc::now().to_rfc3339()],
        )
        .map_err(AppError::database)?;
    Ok(changed as u32)
}

#[tauri::command]
pub fn delete_notification(app: AppHandle, id: String) -> CommandResult<bool> {
    let connection = open_connection(&app)?;
    let changed = connection
        .execute("DELETE FROM notifications WHERE id = ?1", params![id])
        .map_err(AppError::database)?;
    Ok(changed > 0)
}

#[tauri::command]
pub fn queue_message(app: AppHandle, input: QueueMessageInput) -> CommandResult<QueuedMessage> {
    if input.channel.trim().is_empty() {
        return Err(AppError::validation("Message channel cannot be empty."));
    }
    let connection = open_connection(&app)?;
    let now = Utc::now().to_rfc3339();
    let message = QueuedMessage {
        id: Uuid::new_v4().to_string(),
        channel: input.channel.trim().into(),
        payload: input.payload,
        status: "queued".into(),
        created_at: now.clone(),
        updated_at: now,
    };
    let payload_json = serde_json::to_string(&message.payload).map_err(AppError::serialization)?;
    connection
        .execute(
            "INSERT INTO outbox (id, channel, payload_json, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                message.id,
                message.channel,
                payload_json,
                message.status,
                message.created_at,
                message.updated_at
            ],
        )
        .map_err(AppError::database)?;
    Ok(message)
}

#[tauri::command]
pub fn flush_outbox(app: AppHandle) -> CommandResult<FlushResult> {
    let connection = open_connection(&app)?;
    let queued = connection
        .query_row(
            "SELECT COUNT(*) FROM outbox WHERE status = 'queued'",
            [],
            |row| row.get::<_, u32>(0),
        )
        .map_err(AppError::database)?;
    let sent = connection
        .execute(
            "UPDATE outbox SET status = 'sent', updated_at = ?1 WHERE status = 'queued'",
            params![Utc::now().to_rfc3339()],
        )
        .map_err(AppError::database)? as u32;
    let result = FlushResult { queued, sent };
    if let Err(error) = app.emit(OUTBOX_FLUSHED_EVENT, &result) {
        eprintln!("Could not emit outbox flush event: {error}");
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn notification_create_read_delete_flow() {
        let connection = Connection::open_in_memory().expect("sqlite");
        storage::apply_migrations(&connection).expect("migrations");
        let notification = create_notification_in_connection(
            &connection,
            CreateNotificationInput {
                title: "Hello".into(),
                body: "World".into(),
                kind: None,
            },
        )
        .expect("notification");

        assert_eq!(
            list_notifications_in_connection(&connection).unwrap().len(),
            1
        );

        let changed = connection
            .execute(
                "UPDATE notifications SET read = 1, updated_at = ?1 WHERE id = ?2",
                params![Utc::now().to_rfc3339(), notification.id],
            )
            .expect("mark read");
        assert_eq!(changed, 1);

        let deleted = connection
            .execute(
                "DELETE FROM notifications WHERE id = ?1",
                params![notification.id],
            )
            .expect("delete");
        assert_eq!(deleted, 1);
    }
}
