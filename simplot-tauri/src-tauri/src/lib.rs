mod commands {
    use serde::{Deserialize, Serialize};
    use std::env;
    use std::fs::File;
    use std::io::{BufRead, BufReader};
    use std::path::PathBuf;
    use tauri::AppHandle;
    use tauri_plugin_dialog::DialogExt;

    #[derive(Serialize, Deserialize, Clone)]
    pub struct Series {
        pub label: String,
        pub points: Vec<Point>,
        pub visible: bool,
    }

    #[derive(Serialize, Deserialize, Clone)]
    pub struct Point {
        pub x: f32,
        pub y: f32,
    }

    #[tauri::command]
    pub fn read_data(path: PathBuf) -> Result<Vec<Series>, String> {
        let file = File::open(&path).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let mut multi_series: Vec<Vec<Point>> = Vec::new();
        let file_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();

        let mut data_lines = 0usize;
        let mut skipped_lines = 0usize;
        let mut tabbed_lines = 0usize;

        for (line_index, line) in reader.lines().enumerate() {
            let line = line.map_err(|e| e.to_string())?;
            if line.trim().is_empty() {
                continue;
            }

            data_lines += 1;
            if line.contains('\t') {
                tabbed_lines += 1;
            }

            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() < 2 {
                skipped_lines += 1;
                continue;
            }

            let x: f32 = parts[0].trim().parse().map_err(|_| {
                format!(
                    "{}:{} invalid X value: {}",
                    file_name,
                    line_index + 1,
                    parts[0]
                )
            })?;

            for (i, y_part) in parts.iter().skip(1).enumerate() {
                if y_part.trim().is_empty() {
                    continue;
                }

                let y: f32 = y_part.trim().parse().map_err(|_| {
                    format!(
                        "{}:{} invalid Y value: {}",
                        file_name,
                        line_index + 1,
                        y_part
                    )
                })?;
                if multi_series.len() <= i {
                    multi_series.push(Vec::new());
                }
                multi_series[i].push(Point { x, y });
            }
        }

        if data_lines > 0 && tabbed_lines == 0 {
            return Err(format!(
                "{}: no tab-separated rows found. The file may be space-separated.",
                file_name
            ));
        }

        if multi_series.is_empty() {
            return Err(format!(
                "{}: no numeric X-Y rows found. Read {} non-empty rows, skipped {} rows.",
                file_name, data_lines, skipped_lines
            ));
        }

        let series = multi_series
            .into_iter()
            .enumerate()
            .filter(|(_, points)| !points.is_empty())
            .map(|(i, points)| Series {
                label: format!("{}_Y{}", file_name, i + 1),
                points,
                visible: true,
            })
            .collect();

        Ok(series)
    }

    #[tauri::command]
    pub fn initial_files() -> Vec<String> {
        env::args()
            .skip(1)
            .filter(|arg| !arg.starts_with('-'))
            .collect()
    }

    #[tauri::command]
    pub fn open_file_dialog(app: AppHandle) -> Option<String> {
        app.dialog()
            .file()
            .set_title("Open Data File")
            .add_filter("Text data", &["txt", "dat", "tsv", "csv"])
            .blocking_pick_file()
            .and_then(|path| path.into_path().ok())
            .map(|path| path.to_string_lossy().into_owned())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::Emitter;
    use tauri_plugin_dialog::DialogExt;

    tauri::Builder::default()
        .menu(|handle| {
            let open = MenuItem::with_id(handle, "open", "Open...", true, Some("CmdOrCtrl+O"))?;
            let quit = PredefinedMenuItem::quit(handle, None)?;
            Menu::with_items(
                handle,
                &[&Submenu::with_items(handle, "File", true, &[&open, &quit])?],
            )
        })
        .on_menu_event(|app, event| {
            if event.id() == "open" {
                let app_handle = app.clone();
                app.dialog()
                    .file()
                    .set_title("Open Data File")
                    .add_filter("Text data", &["txt", "dat", "tsv", "csv"])
                    .pick_file(move |path| {
                        if let Some(path) = path.and_then(|path| path.into_path().ok()) {
                            let _ = app_handle
                                .emit("simplot-open-file", path.to_string_lossy().into_owned());
                        }
                    });
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_data,
            commands::initial_files,
            commands::open_file_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
