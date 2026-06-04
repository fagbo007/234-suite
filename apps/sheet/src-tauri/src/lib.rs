// 234 Sheet — Tauri backend entry point.
//
// Per the Tauri/Electron trade-off (root CLAUDE.md Section 3.5), CPU-intensive
// work and file I/O belong here in Rust; the React frontend handles UI only.
// The formula engine and large-grid work stay in the frontend/package layer for
// now — backend commands are added as features land.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running 234 Sheet");
}
