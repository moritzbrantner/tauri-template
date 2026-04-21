mod app_info;
mod diagnostics;
mod errors;
mod files;
mod folder_watch;
mod jobs;
mod notifications;
mod secrets;
mod settings;
mod storage;
mod updates;
mod uploads;
mod workspace;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_formats_the_name() {
        assert_eq!(greet("Ada"), "Hello, Ada! You've been greeted from Rust!");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(folder_watch::FolderWatchState::default())
        .manage(jobs::JobState::default())
        .manage(uploads::UploadState::default())
        .manage(workspace::WorkspaceState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            app_info::get_app_info,
            app_info::get_runtime_info,
            app_info::get_app_paths,
            settings::load_settings,
            settings::save_settings,
            settings::export_settings,
            settings::import_settings,
            settings::reset_settings,
            settings::settings_file_path,
            workspace::create_workspace,
            workspace::open_workspace,
            workspace::save_workspace,
            workspace::close_workspace,
            workspace::get_active_workspace,
            workspace::list_recent_workspaces,
            workspace::remove_recent_workspace,
            storage::run_migrations,
            storage::get_records,
            storage::create_record,
            storage::update_record,
            storage::delete_record,
            storage::export_data,
            storage::import_data,
            files::validate_file,
            files::read_text_file,
            files::write_text_file,
            files::copy_file_to_app_data,
            files::calculate_file_hash,
            files::cleanup_temp_files,
            jobs::start_job,
            jobs::cancel_job,
            jobs::job_status,
            jobs::list_jobs,
            jobs::clear_finished_jobs,
            uploads::stage_upload,
            uploads::process_upload,
            uploads::cancel_upload,
            uploads::get_upload_status,
            uploads::list_uploads,
            uploads::clear_upload,
            notifications::list_notifications,
            notifications::create_notification,
            notifications::mark_notification_read,
            notifications::mark_all_notifications_read,
            notifications::delete_notification,
            notifications::queue_message,
            notifications::flush_outbox,
            folder_watch::start_folder_watch,
            folder_watch::stop_folder_watch,
            folder_watch::folder_watch_status,
            folder_watch::list_folder_watch_events,
            folder_watch::clear_folder_watch_events,
            updates::check_update_status,
            updates::restart_app,
            diagnostics::health_check,
            diagnostics::get_log_files,
            diagnostics::export_diagnostics_bundle,
            diagnostics::clear_logs,
            secrets::save_secret,
            secrets::load_secret,
            secrets::delete_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
