# Building the native Tauri window (234 Writer)

234 ships its UI as a web build today; the native desktop window is wired but
**not yet compiled** because building it needs a Rust + MSVC toolchain that the
current dev machine lacks (no admin rights to install the multi-GB MSVC C++ Build
Tools — see root `CLAUDE.md` §17). This is the turnkey runbook for building it on
a properly tooled Windows machine. macOS/Linux notes at the end.

> Status: **234 Writer** has a complete `src-tauri/` scaffold (`Cargo.toml`,
> `tauri.conf.json` v2, `src/main.rs` + `src/lib.rs`, `capabilities/`, and the
> committed icon set). 234 Sheet / Slides are not yet scaffolded — same steps
> apply once they are.

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

# Release bundle (NSIS .exe + MSI; runs `pnpm build` via beforeBuildCommand):
pnpm --filter @234/writer tauri build
```

Output bundles land in `apps/writer/src-tauri/target/release/bundle/`.

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
