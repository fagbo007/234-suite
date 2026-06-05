// 234 Writer — Tauri backend entry point.
//
// Per the Tauri/Electron trade-off (root CLAUDE.md Section 3.5), CPU-intensive
// work and file I/O belong here in Rust; the React frontend handles UI only.
// The AI cloud + OS-keychain key-storage commands (root §6) wrap the shared
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ai_set_key,
            ai_delete_key,
            ai_has_key,
            ai_cloud_complete
        ])
        .run(tauri::generate_context!())
        .expect("error while running 234 Writer");
}
