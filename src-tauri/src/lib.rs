#[cfg_attr(mobile, tauri::mobile_entry_point)]
use futures_util::stream::StreamExt;
use std::{
    fs::{create_dir_all, File},
    io::{copy, BufReader},
    path::PathBuf,
    process::Command, time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tokio::{io::AsyncWriteExt, task::spawn_blocking, time::timeout};
use zip::ZipArchive;

#[cfg(target_os = "linux")]
use std::{fs, os::unix::fs::PermissionsExt};
#[cfg(target_os = "windows")]
use tauri_plugin_decorum::WebviewWindowExt;

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
async fn download(
    app: AppHandle,
    url: String,
    name: String,
    executable: String,
) -> Result<(), String> {
    app.emit("download-started", &name).unwrap();

    let client = reqwest::Client::new();
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            app.emit("download-failed", &name).unwrap();
            return Err(e.to_string());
        }
    };
    let total_size = resp.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    let downloads_path = app.path().app_local_data_dir().unwrap().join("downloads");
    let game_path = app.path().app_local_data_dir().unwrap().join("game");

    let download_part_path = downloads_path.join(format!("{}.part", name));
    let download_zip_path = downloads_path.join(format!("{}.zip", name));
    let executable_path = game_path.join(&name).join(&executable);

    let _ = tokio::fs::create_dir_all(&downloads_path).await;
    if let Ok(true) = tokio::fs::try_exists(&game_path.join(name.clone())).await {
        let _ = tokio::fs::remove_dir_all(&game_path.join(name.clone())).await;
    }
    let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;
    let mut file = tokio::fs::File::create(download_part_path).await.unwrap();

    while let Ok(Some(chunk_result)) = timeout(Duration::from_secs(5), stream.next()).await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(e) => {
                app.emit("download-failed", &name).unwrap();
                return Err(e.to_string());
            }
        };

        if let Err(e) = file.write_all(&chunk).await {
            app.emit("download-failed", &name).unwrap();
            return Err(e.to_string());
        }

        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            (downloaded * 100 / total_size) as u8
        } else {
            0
        };

        app.emit("download-progress", format!("{}:{}", &name, progress)).unwrap();
    }

    if total_size > 0 && downloaded < total_size {
        app.emit("download-failed", &name).unwrap();
        return Err("Download incomplete".into());
    }

    app.emit("download-done", &name).unwrap();

    tokio::fs::rename(
        downloads_path.join(format!("{}.part", name)),
        download_zip_path.clone(),
    )
    .await
    .unwrap();
    unzip_to_dir(download_zip_path.clone(), game_path.join(&name))
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::remove_file(download_zip_path.clone())
        .await
        .unwrap();

    #[cfg(target_os = "linux")]
    {
        let mut perms = fs::metadata(&executable_path).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(executable_path, perms).unwrap();
    }

    app.emit("download-complete", &name).unwrap();
    Ok(())
}

#[tauri::command]
fn launch_game(app: AppHandle, name: String, executable: String) {
    let game_folder = app
        .path()
        .app_local_data_dir()
        .unwrap()
        .join("game")
        .join(&name);
    let game_path = game_folder.join(&executable);
    if !game_path.exists() {
        app.dialog()
            .message(format!("Executable \"{}\" not found.\n\nTry reinstalling the game or make a support request in the Community link on the sidebar.", game_path.display().to_string()))
            .kind(MessageDialogKind::Error)
            .title("Game not found")
            .show(|_| {});
        return;
    }
    match Command::new(&game_path).current_dir(&game_folder).spawn() {
        Ok(_) => println!("Game launched successfully."),
        Err(e) => {
            app.dialog()
                .message(format!("Failed to load game:\n{}\n\nTry reinstalling the game or make a support request in the Community link on the sidebar.", e))
                .kind(MessageDialogKind::Error)
                .title("Failed to launch game")
                .show(|_| {});
        }
    }
}

pub fn run() {
    #[allow(unused_variables)]
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download, launch_game])
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
