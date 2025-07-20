#[cfg_attr(mobile, tauri::mobile_entry_point)]

use base64::{Engine, engine::general_purpose};
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_decorum::WebviewWindowExt;
use tokio::io::AsyncWriteExt;

#[tauri::command]
async fn download(app: AppHandle, url: String, name: String) -> Result<(), String> {
    app.emit("download-started", &url).unwrap();

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let total_size = resp.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    println!("{}", app.path().app_local_data_dir().unwrap().display().to_string());
    let mut file = tokio::fs::File::create(app.path().app_local_data_dir().unwrap().join(format!("download_{}.zip", name)))
        .await
        .map_err(|e| e.to_string())?;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            (downloaded * 100 / total_size) as u8
        } else {
            0
        };
        app.emit(
            "download-progress",
            format!("{}:{}", general_purpose::STANDARD.encode(&url), progress),
        )
        .unwrap();
    }

    app.emit("download-finished", &url).unwrap();
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download])
        .setup(|app| {
            #[cfg(target_os = "windows")] {
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
