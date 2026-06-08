#!/usr/bin/env bash
# Build the 234 Suite single Linux installer (root CLAUDE.md §3.2) — a .deb that
# lays the four raw release binaries into one directory (so the launcher's
# sibling resolution works, like the Windows suite) + a launcher desktop entry.
#
# Build the four binaries first (on a Linux machine / CI runner) — a normal
# `tauri build` produces them at apps/<app>/src-tauri/target/release/<app>:
#   pnpm --filter @234/writer   tauri build --bundles deb
#   pnpm --filter @234/sheet    tauri build --bundles deb
#   pnpm --filter @234/slides   tauri build --bundles deb
#   pnpm --filter @234/launcher tauri build --bundles deb
# then run this script. (Per-app .deb / .AppImage from Tauri remain available.)
#
# No extra dependency — dpkg-deb ships with Debian/Ubuntu.
set -euo pipefail

VERSION="${VERSION:-0.0.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST="$SCRIPT_DIR/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

INSTALL_DIR="usr/lib/234-suite"
APPS=(launcher writer sheet slides)

# Stage the co-located binaries.
mkdir -p "$STAGE/$INSTALL_DIR"
for app in "${APPS[@]}"; do
  bin="$REPO/apps/$app/src-tauri/target/release/$app"
  if [ ! -x "$bin" ]; then
    echo "Missing binary: $bin" >&2
    echo "Run the per-app 'tauri build' first." >&2
    exit 1
  fi
  install -m 0755 "$bin" "$STAGE/$INSTALL_DIR/$app"
done

# Launch the suite via a /usr/bin symlink to the launcher.
mkdir -p "$STAGE/usr/bin"
ln -sf "/$INSTALL_DIR/launcher" "$STAGE/usr/bin/234-suite"

# Desktop entry for the launcher.
mkdir -p "$STAGE/usr/share/applications"
cat > "$STAGE/usr/share/applications/234-suite.desktop" <<'DESKTOP'
[Desktop Entry]
Type=Application
Name=234 Suite
Comment=Open source office suite — Writer, Sheet, Slides
Exec=234-suite
Terminal=false
Categories=Office;
DESKTOP

# Debian control metadata.
mkdir -p "$STAGE/DEBIAN"
cat > "$STAGE/DEBIAN/control" <<CONTROL
Package: 234-suite
Version: ${VERSION}
Section: office
Priority: optional
Architecture: amd64
Depends: libwebkit2gtk-4.1-0
Maintainer: Project 234 contributors
Description: 234 suite — open source office suite
 The 234 launcher plus Writer, Sheet, and Slides as three isolated processes.
CONTROL

mkdir -p "$DIST"
OUT="$DIST/234-suite_${VERSION}_amd64.deb"
rm -f "$OUT"
dpkg-deb --build --root-owner-group "$STAGE" "$OUT"

echo ""
echo "Built suite installer:"
echo "  $OUT ($(du -h "$OUT" | cut -f1))"
