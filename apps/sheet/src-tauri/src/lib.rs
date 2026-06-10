// 234 Sheet — Tauri backend entry point.
//
// Per the Tauri/Electron trade-off (root CLAUDE.md Section 3.5), CPU-intensive
// work and file I/O belong here in Rust; the React frontend handles UI only.
// The formula engine and large-grid work stay in the frontend/package layer for
// now. The AI cloud + OS-keychain key-storage commands (root §6) wrap the shared
// app234_ai crate; the key is read only in Rust and never returned to JS.

#[tauri::command]
fn ai_set_key(provider: String, key: String) -> Result<(), String> {
    app234_ai::set_key(&provider, &key)
}

#[tauri::command]
fn ai_delete_key(provider: String) -> Result<(), String> {
    app234_ai::delete_key(&provider)
}

#[tauri::command]
fn ai_has_key(provider: String) -> Result<bool, String> {
    app234_ai::has_key(&provider)
}

#[tauri::command]
fn ai_cloud_complete(
    provider: String,
    model: String,
    system: Option<String>,
    prompt: String,
) -> Result<String, String> {
    app234_ai::cloud_complete(&provider, &model, system.as_deref(), &prompt)
}

// Native file I/O (root §3.5) — open/save the suite's own formats via the OS
// dialog; read/write the picked path. Wraps the shared app234_files crate.
#[tauri::command]
fn fs_pick_open(filter_name: String, extensions: Vec<String>) -> Option<String> {
    app234_files::pick_open(&filter_name, &extensions)
}

#[tauri::command]
fn fs_pick_save(default_name: String, filter_name: String, extensions: Vec<String>) -> Option<String> {
    app234_files::pick_save(&default_name, &filter_name, &extensions)
}

#[tauri::command]
fn fs_read_text(path: String) -> Result<String, String> {
    app234_files::read_text(&path)
}

#[tauri::command]
fn fs_write_text(path: String, contents: String) -> Result<(), String> {
    app234_files::write_text(&path, &contents)
}

#[tauri::command]
fn fs_read_bytes(path: String) -> Result<Vec<u8>, String> {
    app234_files::read_bytes(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ai_set_key,
            ai_delete_key,
            ai_has_key,
            ai_cloud_complete,
            fs_pick_open,
            fs_pick_save,
            fs_read_text,
            fs_read_bytes,
            fs_write_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running 234 Sheet");
}
