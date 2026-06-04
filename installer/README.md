# 234 Suite installer (Windows)

The **single Windows installer** for the 234 suite (root `CLAUDE.md` §3.2): one
`234 Suite_<version>_x64-setup.exe` that installs all three apps **plus the 234
Launcher** and bootstraps the WebView2 runtime once.

## Design

- **Unified, self-contained layout.** Each Tauri `<app>.exe` embeds its frontend,
  so the only external runtime dependency is WebView2. The suite installer lays
  the four binaries — `launcher.exe`, `writer.exe`, `sheet.exe`, `slides.exe` —
  into one per-user directory (`%LOCALAPPDATA%\234 Suite`, no UAC) and installs
  WebView2 if absent.
- **Launcher opens apps as isolated processes.** The 234 Launcher
  (`apps/launcher`) resolves each app as a **sibling** of its own executable
  (`current_exe()` → parent → `writer.exe` …) and spawns it with
  `std::process::Command` — a separate OS process, so a crash in one app does not
  affect another (§3.2). No registry lookup needed because of the unified layout.
- **Standalone access too.** The Start-menu "234 Suite" folder has a shortcut to
  the launcher *and* to each app directly; the per-app NSIS installers produced by
  `tauri build` remain available separately, as §3.2 requires.
- **One uninstall entry** ("234 Suite") removes all four binaries and shortcuts.

## Build

1. Build the four release binaries (needs the Rust + MSVC toolchain — see
   [`../docs/architecture/tauri-build.md`](../docs/architecture/tauri-build.md)):
   ```powershell
   pnpm --filter @234/writer   tauri build --bundles nsis
   pnpm --filter @234/sheet    tauri build --bundles nsis
   pnpm --filter @234/slides   tauri build --bundles nsis
   pnpm --filter @234/launcher tauri build --bundles nsis
   ```
2. Compile the suite installer:
   ```powershell
   ./installer/build-suite.ps1
   ```
   Output: `installer/dist/234 Suite_0.0.0_x64-setup.exe`.

`build-suite.ps1` uses the `makensis.exe` that Tauri downloads into
`%LOCALAPPDATA%\tauri\NSIS\` for the per-app bundles, and passes the binary paths
to [`234-suite.nsi`](./234-suite.nsi) via `-D` defines. `installer/dist/` is
git-ignored; the `.nsi` and `.ps1` are tracked.

## Cross-platform

macOS (`.dmg`) and Linux (`.AppImage`/`.deb`) suite installers follow the same
pattern — lay down the four bundles + the launcher — on those OSes. Not built
here (Windows machine).
