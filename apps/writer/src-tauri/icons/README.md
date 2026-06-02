# Tauri icons

App icons are **not** committed here. Generate them from a single source image
(1024×1024 PNG recommended) with:

```bash
pnpm --filter @234/writer tauri icon path/to/source.png
```

This produces `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico`,
`icon.icns`, and platform icon sets referenced by `tauri.conf.json` → `bundle.icon`.

A native build (`pnpm --filter @234/writer tauri build`) requires these icons
**and** the Rust toolchain + platform build tools — see
`docs/architecture/app-shell.md` for prerequisites.
