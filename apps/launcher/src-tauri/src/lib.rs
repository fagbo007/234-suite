// 234 Launcher — Tauri backend entry point.
//
// The launcher window lists Writer / Sheet / Slides and opens each as a
// SEPARATE OS process (root CLAUDE.md Section 3.2: "three isolated processes —
// a crash in Sheet does not affect Writer"). App resolution is per-OS:
//   • Windows / Linux — the suite co-locates the four binaries in one directory,
//     so each app is the launcher's sibling binary (no registry lookup).
//   • macOS — apps are `.app` bundles sitting alongside the launcher's bundle;
//     resolve the sibling `<Product>.app` and `open` it (falling back to launch
//     by registered name). `open` still yields a separate process.

use std::process::Command;

/// Map an app id to its (binary base name, macOS product name).
fn app_target(app: &str) -> Option<(&'static str, &'static str)> {
    match app {
        "writer" => Some(("writer", "234 Writer")),
        "sheet" => Some(("sheet", "234 Sheet")),
        "slides" => Some(("slides", "234 Slides")),
        _ => None,
    }
}

/// Launch one of the suite apps by id ("writer" | "sheet" | "slides").
#[tauri::command]
fn launch_app(app: String) -> Result<(), String> {
    let (base, product) =
        app_target(&app).ok_or_else(|| format!("Unknown app: {app}"))?;
    spawn_app(base, product)
}

#[cfg(not(target_os = "macos"))]
fn spawn_app(base: &str, _product: &str) -> Result<(), String> {
    let exe = format!("{base}{}", std::env::consts::EXE_SUFFIX);
    let dir = std::env::current_exe()
        .map_err(|e| format!("Cannot resolve the install directory: {e}"))?
        .parent()
        .ok_or_else(|| "Cannot resolve the install directory".to_string())?
        .to_path_buf();
    let path = dir.join(&exe);
    if !path.exists() {
        return Err(format!("{base} is not installed alongside the launcher."));
    }
    Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch {base}: {e}"))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn spawn_app(_base: &str, product: &str) -> Result<(), String> {
    // The launcher binary lives at `…/234 Launcher.app/Contents/MacOS/launcher`;
    // walk up four parents to the directory holding the sibling `.app` bundles.
    let exe = std::env::current_exe()
        .map_err(|e| format!("Cannot resolve the install directory: {e}"))?;
    let sibling_dir = exe
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .and_then(|p| p.parent());

    if let Some(dir) = sibling_dir {
        let bundle = dir.join(format!("{product}.app"));
        if bundle.exists() {
            Command::new("open")
                .arg(&bundle)
                .spawn()
                .map_err(|e| format!("Failed to launch {product}: {e}"))?;
            return Ok(());
        }
    }

    // Fall back to launching by registered application name (e.g. in /Applications).
    Command::new("open")
        .args(["-a", product])
        .spawn()
        .map_err(|e| format!("Failed to launch {product}: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launch_app])
        .run(tauri::generate_context!())
        .expect("error while running 234 Launcher");
}
