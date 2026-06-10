//! 234 suite native file I/O (root CLAUDE.md §3.5 — "file I/O belongs in Rust").
//!
//! Open/save the suite's own formats (`.fwtr` / `.fwsh` / `.fwsl`) through the OS
//! file dialog (`rfd`) and read/write text via `std::fs`. The surface is
//! deliberately narrow and path-based: the frontend asks the user for a path
//! (open or save), then reads/writes exactly that path — no broad filesystem
//! capability is exposed.
//!
//! Exposed as **plain functions** (no `tauri` dependency); each app's `src-tauri`
//! wraps them in thin `#[tauri::command]`s and registers those via
//! `generate_handler!` (defining the commands in this dependency crate would trip
//! Tauri's generated-macro name collision — same split as `app234_ai`).

use std::fs;

use rfd::FileDialog;

/// Read a UTF-8 text file. Errors become a human-readable `String`.
pub fn read_text(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|err| format!("Could not read {path}: {err}"))
}

/// Write a UTF-8 text file (creating or truncating it).
pub fn write_text(path: &str, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|err| format!("Could not write {path}: {err}"))
}

/// Read a file's raw bytes (for binary formats like `.docx`/`.xlsx`/`.pptx`,
/// which the unified Open dialog routes through the import path).
pub fn read_bytes(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|err| format!("Could not read {path}: {err}"))
}

fn with_filter(mut dialog: FileDialog, filter_name: &str, extensions: &[String]) -> FileDialog {
    if !extensions.is_empty() {
        let refs: Vec<&str> = extensions.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(filter_name, &refs);
    }
    dialog
}

/// Show an open dialog; returns the chosen path, or `None` if cancelled.
pub fn pick_open(filter_name: &str, extensions: &[String]) -> Option<String> {
    with_filter(FileDialog::new(), filter_name, extensions)
        .pick_file()
        .map(|path| path.to_string_lossy().into_owned())
}

/// Show a save dialog (pre-filled with `default_name`); returns the chosen path,
/// or `None` if cancelled.
pub fn pick_save(default_name: &str, filter_name: &str, extensions: &[String]) -> Option<String> {
    with_filter(FileDialog::new().set_file_name(default_name), filter_name, extensions)
        .save_file()
        .map(|path| path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_then_read_round_trips() {
        let mut path = std::env::temp_dir();
        path.push(format!("app234-files-test-{}.txt", std::process::id()));
        let p = path.to_string_lossy().into_owned();

        write_text(&p, "hello 234").expect("write");
        assert_eq!(read_text(&p).expect("read"), "hello 234");

        // Overwrite truncates.
        write_text(&p, "second").expect("rewrite");
        assert_eq!(read_text(&p).expect("reread"), "second");

        let _ = fs::remove_file(&p);
    }

    #[test]
    fn read_missing_file_errors() {
        let err = read_text("does-not-exist-app234.txt").unwrap_err();
        assert!(err.contains("Could not read"));
    }

    #[test]
    fn read_bytes_round_trips_binary() {
        let mut path = std::env::temp_dir();
        path.push(format!("app234-files-bin-test-{}.bin", std::process::id()));
        let p = path.to_string_lossy().into_owned();

        // Not valid UTF-8 — read_text would fail on this; read_bytes must not.
        let data: Vec<u8> = vec![0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe, 0x00];
        fs::write(&p, &data).expect("write");
        assert_eq!(read_bytes(&p).expect("read"), data);

        let _ = fs::remove_file(&p);
    }

    #[test]
    fn read_bytes_missing_file_errors() {
        let err = read_bytes("does-not-exist-app234.bin").unwrap_err();
        assert!(err.contains("Could not read"));
    }
}
