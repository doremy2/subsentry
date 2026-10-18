mod migrations;
mod tray;

use std::{thread, time::Duration};
use tauri::{Manager, WindowEvent};

/// Exit the whole app (the window's close button only hides it to the tray).
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(migrations::DATABASE_URL, migrations::all())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(|app| {
            tray::setup(app.handle())?;

            // The window starts hidden so the frontend can restore its saved position
            // before showing it. If the frontend never does (crash, slow start), show it anyway.
            if let Some(window) = app.get_webview_window("main") {
                thread::spawn(move || {
                    thread::sleep(Duration::from_secs(6));
                    let _ = window.show();
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing hides to the tray instead of quitting.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running SubSentry");
}
