# 234 Suite installer

The **single suite installer** per OS (root `CLAUDE.md` §3.2) — Windows
`234 Suite_<version>_x64-setup.exe` (NSIS), macOS `234-Suite_<version>_universal.dmg`,
Linux `234-suite_<version>_amd64.deb` — each installing all three apps **plus the
234 Launcher**. Per-app installers (from `tauri build`) remain available too.

Build them in CI on a version tag — see [`release.yml`](../.github/workflows/release.yml).

## Design

- **Unified, self-contained layout.** Each Tauri `<app>.exe` embeds its frontend,
  so the only external runtime dependency is WebView2. The suite installer lays
  the four binaries — `launcher.exe`, `writer.exe`, `sheet.exe`, `slides.exe` —
  into one per-user directory (`%LOCALAPPDATA%\234 Suite`, no UAC) and installs
  WebView2 if absent.
- **Launcher opens apps as isolated processes** (`launch_app`,
  `apps/launcher/src-tauri/src/lib.rs`), resolved per-OS:
  - **Windows / Linux** — each app is a **sibling binary** of the launcher
    (`current_exe()` → parent → `writer<EXE_SUFFIX>`), spawned with
    `std::process::Command`. The suite co-locates the four binaries in one dir, so
    no registry lookup is needed.
  - **macOS** — apps are `.app` bundles beside the launcher's bundle; the launcher
    resolves the sibling `<Product>.app` and `open`s it (falling back to launch by
    registered name). `open` still yields a separate process.
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

## macOS (`.dmg`)

1. Build the four `.app` bundles on macOS:
   ```bash
   for a in writer sheet slides launcher; do pnpm --filter @234/$a tauri build --bundles app; done
   ```
2. Assemble the suite `.dmg`:
   ```bash
   bash installer/build-suite-macos.sh
   ```
   Output: `installer/dist/234-Suite_<version>_universal.dmg` — the four `.app`s +
   an `/Applications` symlink (drag to install; co-locating them lets the launcher
   resolve its siblings). Uses `hdiutil` (ships with macOS).

## Linux (`.deb`)

1. Build the four binaries on Linux (`pnpm --filter @234/<app> tauri build`).
2. Assemble the suite `.deb`:
   ```bash
   bash installer/build-suite-linux.sh
   ```
   Output: `installer/dist/234-suite_<version>_amd64.deb` — the four raw binaries
   co-located under `/usr/lib/234-suite/`, a `/usr/bin/234-suite` → launcher
   symlink, and a desktop entry. Uses `dpkg-deb` (ships with Debian/Ubuntu).
   Per-app `.AppImage`s come from `tauri build`.

## CI

[`release.yml`](../.github/workflows/release.yml) runs all of the above across a
Windows / macOS / Linux matrix on a `v*` tag and attaches every installer to a
GitHub Release. Dormant until a public remote + tag exist (like `ci.yml`).
`installer/dist/` is git-ignored; the scripts + `.nsi` are tracked.
