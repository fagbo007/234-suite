# Tauri icons

The desktop icon set referenced by `tauri.conf.json` → `bundle.icon`
(`32x32.png`, `128x128.png`, `icon.ico`, `icon.icns`) **is committed** here, plus
the Windows `Square*Logo.png` / `StoreLogo.png` set, all generated from the
committed source **`app-icon.png`** (a 1024×1024 placeholder shared with the
other 234 apps — replace with real 234 Sheet branding when available).

Regenerate the whole set from a new source image with:

```bash
pnpm --filter @234/sheet exec tauri icon src-tauri/icons/app-icon.png
```

(`tauri icon` is a Node command — no Rust required.) A native **build**
(`pnpm --filter @234/sheet tauri build --bundles nsis`) additionally needs the
Rust toolchain + MSVC C++ build tools — see
[`docs/architecture/tauri-build.md`](../../../../docs/architecture/tauri-build.md).
