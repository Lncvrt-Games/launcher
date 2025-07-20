#[cfg_attr(mobile, tauri::mobile_entry_point)]

use base64::{Engine, engine::general_purpose};
use std::{fs::{create_dir_all, File}, io::{copy, BufReader}, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_decorum::WebviewWindowExt;
use tokio::{io::AsyncWriteExt, task::spawn_blocking};
use zip::ZipArchive;
use futures_util::stream::StreamExt;

pub async fn unzip_to_dir(zip_path: PathBuf, out_dir: PathBuf) -> zip::result::ZipResult<()> {
    spawn_blocking(move || {
        let file = File::open(zip_path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = out_dir.join(file.name());

            if file.is_dir() {
                create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    create_dir_all(parent)?;
                }
                let mut outfile = File::create(&outpath)?;
                copy(&mut file, &mut outfile)?;
            }
        }

        Ok(())
    })
    .await
    .map_err(|e| zip::result::ZipError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))?
}

#[tauri::command]
async fn download(app: AppHandle, url: String, name: String) -> Result<(), String> {
    app.emit("download-started", &url).unwrap();

    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let total_size = resp.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    let downloads_path = app.path().app_local_data_dir().unwrap().join("downloads");
    let game_path = app.path().app_local_data_dir().unwrap().join("game");
    let _ = tokio::fs::create_dir_all(&downloads_path).await;
    if let Ok(true) = tokio::fs::try_exists(&game_path.join(&name)).await {
        let _ = tokio::fs::remove_dir_all(&game_path.join(&name)).await;
    }
    let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;
    let mut file = tokio::fs::File::create(downloads_path.join(format!("{}.part", name))).await.unwrap();

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

    tokio::fs::rename(downloads_path.join(format!("{}.part", name)), downloads_path.join(format!("{}.zip", name))).await.unwrap();
    unzip_to_dir(downloads_path.join(format!("{}.zip", name)), game_path.join(&name)).await.map_err(|e| e.to_string())?;
    tokio::fs::remove_file(downloads_path.join(format!("{}.zip", name))).await.unwrap();

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
