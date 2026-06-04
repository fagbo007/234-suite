// 234 Launcher — Tauri backend entry point.
//
// The launcher window lists Writer / Sheet / Slides and opens each as a
// SEPARATE OS process (root CLAUDE.md Section 3.2: "three isolated processes —
// a crash in Sheet does not affect Writer"). In the suite install layout all
// four executables sit in one directory, so each app is resolved relative to
// the launcher's own executable — no registry lookup required.

use std::path::PathBuf;
use std::process::Command;

/// Launch one of the suite apps by id ("writer" | "sheet" | "slides").
#[tauri::command]
fn launch_app(app: String) -> Result<(), String> {
    let base = match app.as_str() {
        "writer" | "sheet" | "slides" => app.as_str(),
        other => return Err(format!("Unknown app: {other}")),
    };
    let exe = format!("{base}{}", std::env::consts::EXE_SUFFIX);

    let dir: PathBuf = std::env::current_exe()
        .map_err(|e| format!("Cannot resolve the install directory: {e}"))?
        .parent()
        .ok_or_else(|| "Cannot resolve the install directory".to_string())?
        .to_path_buf();
    let path = dir.join(&exe);
    if !path.exists() {
        return Err(format!("{app} is not installed alongside the launcher."));
    }

    Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch {app}: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_app])
        .run(tauri::generate_context!())
        .expect("error while running 234 Launcher");
}
