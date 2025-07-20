#[cfg_attr(mobile, tauri::mobile_entry_point)]

use base64::{Engine, engine::general_purpose};
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn download(app: AppHandle, url: String) {
  app.emit("download-started", &url).unwrap();
  for progress in [1, 15, 50, 80, 100] {
    app.emit("download-progress", format!("{}:{}", general_purpose::STANDARD.encode(&url), progress)).unwrap();
  }
  app.emit("download-finished", &url).unwrap();
  //code from the wiki i didnt change it yet
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
