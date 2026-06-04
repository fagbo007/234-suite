# Building the native Tauri window (234 Writer)

234 Writer's native desktop window has been **built and run** on a Rust + MSVC
machine (2026-06-04): `tauri dev` launches the hot-reload window, `tauri build`
produces an optimized `writer.exe` (~8.3 MB) and an **NSIS `.exe` installer**
(~1.9 MB). This is the turnkey runbook for reproducing that build. macOS/Linux
notes at the end.

> Status: **234 Writer** has a complete, **building** `src-tauri/` scaffold
> (`Cargo.toml`, `tauri.conf.json` v2, `src/main.rs` + `src/lib.rs`,
> `capabilities/`, and the committed icon set) — release binary + NSIS installer
> verified. 234 Sheet / Slides are not yet scaffolded — same steps apply once
> they are.

## Prerequisites (one-time, on the build machine)

1. **Rust** (MSVC host toolchain):
   ```powershell
   winget install Rustup.Rustup
   rustup default stable-x86_64-pc-windows-msvc
   ```
2. **MSVC C++ build tools** — Visual Studio 2022 Build Tools with the
   "Desktop development with C++" workload (this is the multi-GB, **admin**
   install; run an elevated shell):
   ```powershell
   winget install --id Microsoft.VisualStudio.2022.BuildTools `
     --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```
3. **WebView2 runtime** — preinstalled on Windows 11 / recent 10; otherwise
   install the Evergreen runtime from Microsoft.
4. **Node 20+ / corepack / pnpm** (as for the rest of the repo).

Verify with: `pnpm --filter @234/writer exec tauri info` (Rust, MSVC, and
WebView2 should all show ✓).

## Build / run

```powershell
pnpm install
# Icons are committed; regenerate only if app-icon.png changes:
#   pnpm --filter @234/writer exec tauri icon apps/writer/src-tauri/icons/app-icon.png

# Dev (hot-reload; runs `pnpm dev` via beforeDevCommand → Vite on :5173):
pnpm --filter @234/writer tauri dev

# Release bundle. The NSIS .exe is the Windows target (root §3.2):
pnpm --filter @234/writer tauri build --bundles nsis
```

Output bundles land in `apps/writer/src-tauri/target/release/bundle/` — e.g.
`nsis/234 Writer_0.0.0_x64-setup.exe`. The first `tauri build` downloads the NSIS
toolchain into `%LOCALAPPDATA%\tauri\` automatically.

### Windows bundle target: NSIS, not MSI

`tauri.conf.json` keeps `bundle.targets: "all"` (correct for the cross-platform
CI matrix — it yields `.deb`/`.AppImage` on Linux and `.dmg` on macOS). On
Windows that also attempts an **MSI** via the WiX toolset, and WiX's `light.exe`
**fails when the project path contains spaces or special characters** — e.g. this
repo lives under `…\OneDrive - Architech\…`, which trips WiX. The **NSIS**
installer has no such restriction and is the §3.2 Windows deliverable, so build
Windows installers with `--bundles nsis` (above).

To also get the MSI, either move the checkout to a plain path (e.g.
`C:\dev\project-234`) and run `tauri build` without the flag, or produce the MSI
in CI where the workspace path has no spaces.

## macOS / Linux

- **macOS:** install Rust via rustup + Xcode Command Line Tools (`xcode-select
  --install`). `tauri build` produces `.app` / `.dmg`. The committed `icon.icns`
  is used.
- **Linux:** install Rust + the WebKitGTK / build deps Tauri lists for your
  distro; `tauri build` produces `.AppImage` / `.deb`.

## Notes

- `tauri icon` is a Node command (no Rust) — icon generation works on any
  machine, including this one. Only the **compile/bundle** step needs the
  Rust + MSVC toolchain.
- The single-installer suite + per-app installers (root §3.2) are assembled in
  Phase 4 once all three apps are scaffolded and building.
- Never commit `src-tauri/target/` (git-ignored).
