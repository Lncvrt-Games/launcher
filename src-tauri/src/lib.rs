use futures_util::stream::StreamExt;
use std::{
    fs::{File, create_dir_all},
    io::{BufReader, copy},
    path::PathBuf,
    process::Command,
    time::Duration,
};
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_os::platform;
use tokio::{io::AsyncWriteExt, time::timeout};
use zip::ZipArchive;

#[cfg(target_os = "linux")]
use std::{fs, os::unix::fs::PermissionsExt};
#[cfg(target_os = "windows")]
use tauri_plugin_decorum::WebviewWindowExt;

fn is_running_by_path(path: &PathBuf) -> bool {
    let sys = System::new_all();
    sys.processes().values().any(|proc| {
        if let Some(exe) = proc.exe() {
            exe == path
        } else {
            false
        }
    })
}

async fn unzip_to_dir(zip_path: PathBuf, out_dir: PathBuf) -> String {
    let res = tauri::async_runtime::spawn_blocking(move || {
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

        Ok::<(), zip::result::ZipError>(())
    })
    .await;

    match res {
        Ok(Ok(())) => "1".into(),
        _ => "-1".into(),
    }
}

#[tauri::command]
async fn download(app: AppHandle, url: String, name: String, executable: String) -> String {
    let client = reqwest::Client::new();
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(_) => {
            return "-1".to_string();
        }
    };
    let total_size = resp.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    let downloads_path = app.path().app_local_data_dir().unwrap().join("downloads");
    let game_path = app.path().app_local_data_dir().unwrap().join("game");

    let download_part_path = downloads_path.join(format!("{}.part", name));
    let download_zip_path = downloads_path.join(format!("{}.zip", name));

    if download_part_path.exists() {
        let _ = tokio::fs::remove_file(&download_part_path).await;
    }

    let _ = tokio::fs::create_dir_all(&downloads_path).await;
    if let Ok(true) = tokio::fs::try_exists(&game_path.join(name.clone())).await {
        let _ = tokio::fs::remove_dir_all(&game_path.join(name.clone())).await;
    }
    let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;
    let mut file = tokio::fs::File::create(download_part_path).await.unwrap();

    while let Ok(Some(chunk_result)) = timeout(Duration::from_secs(5), stream.next()).await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(_) => {
                return "-1".to_string();
            }
        };

        if let Err(_) = file.write_all(&chunk).await {
            return "-1".to_string();
        }

        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            (downloaded * 100 / total_size) as u8
        } else {
            0
        };

        app.emit("download-progress", format!("{}:{}", &name, progress))
            .unwrap();
    }

    if total_size > 0 && downloaded < total_size {
        return "-1".to_string();
    }

    tokio::fs::rename(
        downloads_path.join(format!("{}.part", name)),
        download_zip_path.clone(),
    )
    .await
    .unwrap();
    let unzip_res = unzip_to_dir(download_zip_path.clone(), game_path.join(&name)).await;
    tokio::fs::remove_file(download_zip_path.clone())
        .await
        .unwrap();
    if unzip_res == "-1" {
        return "-1".to_string();
    }

    #[cfg(target_os = "linux")]
    {
        let executable_path = game_path.join(&name).join(&executable);
        let mut perms = fs::metadata(&executable_path).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(executable_path, perms).unwrap();
    }
    #[cfg(target_os = "macos")]
    {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;

        let macos_app_path = game_path
            .join(&name)
            .join(&executable)
            .join("Contents")
            .join("MacOS")
            .join(
                &executable
                    .chars()
                    .take(executable.chars().count() - 4)
                    .collect::<String>(),
            );

        let mut perms = fs::metadata(&macos_app_path).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&macos_app_path, perms).unwrap();
    }
    return "1".to_string();
}

#[allow(unused_variables)]
#[tauri::command]
fn launch_game(app: AppHandle, name: String, executable: String, wine: bool, wine_command: String) {
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
    let result = if wine && platform() == "linux" {
        #[cfg(target_os = "linux")]
        {
            let wine_cmd_to_use =
                wine_command.replace("%path%", &format!("\"{}\"", game_path.to_string_lossy()));

            let parts = shlex::split(&wine_cmd_to_use).expect("failed to split command");
            let exe = &parts[0];
            let args = &parts[1..];

            Command::new(exe)
                .args(args)
                .current_dir(&game_folder)
                .spawn()
        }

        #[cfg(not(target_os = "linux"))]
        {
            Err(std::io::Error::new(std::io::ErrorKind::Other, "not linux"))
        }
    } else {
        if is_running_by_path(&game_path) {
            app.dialog()
                .message(format!("The version {} is already running.", name))
                .kind(MessageDialogKind::Error)
                .title("Game already running")
                .show(|_| {});
            return;
        }
        if platform() == "macos" {
            Command::new("open")
                .arg(&game_path)
                .current_dir(&game_folder)
                .spawn()
        } else {
            Command::new(&game_path).current_dir(&game_folder).spawn()
        }
    };

    match result {
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

#[tauri::command]
async fn uninstall_version(app: AppHandle, name: String) {
    let game_path = app
        .path()
        .app_local_data_dir()
        .unwrap()
        .join("game")
        .join(&name);
    if game_path.exists() {
        if let Err(_) = tokio::fs::remove_dir_all(&game_path).await {
            app.emit("version-failed", &name).unwrap();
        } else {
            app.emit("version-uninstalled", &name).unwrap();
        }
    } else {
        app.emit("version-uninstalled", &name).unwrap();
    }
}

#[tauri::command]
async fn open_folder(app: AppHandle, name: String) {
    let game_path = app
        .path()
        .app_local_data_dir()
        .unwrap()
        .join("game")
        .join(&name);
    if game_path.exists() {
        app.opener()
            .open_path(game_path.to_string_lossy(), None::<&str>)
            .unwrap();
    } else {
        app.dialog()
            .message(format!(
                "Game folder \"{}\" not found.",
                game_path.display()
            ))
            .kind(MessageDialogKind::Error)
            .title("Folder not found")
            .show(|_| {});
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_variables)]
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            download,
            launch_game,
            uninstall_version,
            open_folder
        ])
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
