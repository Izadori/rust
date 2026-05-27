use tauri::{Runtime};
use std::fs;
use serde::Deserialize;

fn main() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        tauri_app_lib::run();
    }
}

/*
// Define the structure that matches the frontend's BackendSeries type for easy serialization/deserialization
#[derive(Debug, Clone, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct BackendSeriesData {
    label: String,
    points: Vec<Point>,
    source: String,
}

/// Reads a tab-separated file and parses it into structured series data.
/// Assumes the first column is X, and subsequent columns are Y series (Y1, Y2, etc.).
#[tauri::command]
fn read_data<R: Runtime>(app: tauri::AppHandle<R>, path: String) -> Result<Vec<BackendSeriesData>, String> {
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => return Err(format!("Failed to read file: {}", e)),
    };

    // Split by line and filter out empty lines
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() {
        return Ok(Vec::new());
    }

    // Assuming the first row is a header (which we ignore for data parsing, but might use for labeling)
    let data_rows = &lines[1..];

    let mut series: Vec<BackendSeriesData> = Vec::new();
    let num_y_cols = 0; // We assume the number of Y columns is determined dynamically or fixed. Since the spec implies dynamic column count, we'll process based on the data structure.

    // For simplicity and robustness against variable column counts:
    // 1. Identify the X-column (index 0).
    // 2. Group all remaining columns into series.
    let num_cols = lines[0].split('\t').count();
    if num_cols < 2 { // Need at least X and one Y
        return Err("Data file must contain at least two tab-separated columns (X and one Y)".to_string());
    }

    // Placeholder: Use the header line if available, or generate a generic label.
    let source_label = "Loaded Data"; 

    // For now, we simplify by assuming all subsequent columns are independent series starting from row 1 data.
    // We will process column-wise after parsing into an intermediate structure.

    // Intermediate storage: Vec<Vec<f64>> where inner vector is a row [x, y1, y2, ...]
    let mut structured_data: Vec<Vec<f64>> = Vec::new();
    for line in data_rows {
        let mut row: Vec<f64> = Vec::new();
        for token in line.split('\t').filter(|s| !s.trim().is_empty()) {
            if let Ok(val) = token.trim().parse::<f64>() {
                row.push(val);
            } else {
                // Skip non-numeric columns, or handle as error if strict parsing is needed
                eprintln!("Warning: Skipping non-numeric data token: {}", token);
            }
        }
        structured_data.push(row);
    }

    if structured_data.is_empty() {
         return Ok(Vec::new());
    }

    let num_rows = structured_data.len();
    // Number of series is total columns - 1 (X column)
    let num_series = structured_data[0].len().checked_sub(1).unwrap_or(0); 
    
    for i in 0..num_series {
        let mut points: Vec<Point> = Vec::new();
        for j in 0..num_rows {
            // X is always column 0. Y data starts at column 1 (index i+1).
            let x = structured_data[j][0];
            let y = structured_data[j][i + 1];

            if x.is_finite() && y.is_finite() {
                points.push(Point { x, y });
            }
        }
        series.push(BackendSeriesData {
            label: format!("Series {}", i + 1), // Initial generic label
            points,
            source: source_label,
        });
    }

    Ok(series)
}
*/
