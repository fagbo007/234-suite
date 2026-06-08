#!/usr/bin/env bash
# Build the 234 Suite single macOS installer (root CLAUDE.md §3.2) — a .dmg
# containing the launcher + the three app bundles, plus an /Applications symlink.
#
# Build the four .app bundles first (on a macOS machine / CI runner):
#   pnpm --filter @234/writer   tauri build --bundles app
#   pnpm --filter @234/sheet    tauri build --bundles app
#   pnpm --filter @234/slides   tauri build --bundles app
#   pnpm --filter @234/launcher tauri build --bundles app
# then run this script. Dragging the four .apps to /Applications co-locates them,
# so the launcher resolves each sibling "<Product>.app" (see launcher lib.rs).
#
# No extra dependency — hdiutil ships with macOS.
set -euo pipefail

VERSION="${VERSION:-0.0.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST="$SCRIPT_DIR/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

app_bundle() { # app id -> "<Product>.app" path under its Tauri bundle output
  echo "$REPO/apps/$1/src-tauri/target/release/bundle/macos/$2.app"
}

declare -a APPS=(
  "launcher:234 Launcher"
  "writer:234 Writer"
  "sheet:234 Sheet"
  "slides:234 Slides"
)

missing=0
for entry in "${APPS[@]}"; do
  id="${entry%%:*}"; product="${entry#*:}"
  src="$(app_bundle "$id" "$product")"
  if [ ! -d "$src" ]; then
    echo "Missing bundle: $src" >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo "Run the per-app 'tauri build --bundles app' first." >&2
  exit 1
fi

# Stage the four .apps + an Applications symlink for drag-install.
for entry in "${APPS[@]}"; do
  id="${entry%%:*}"; product="${entry#*:}"
  cp -R "$(app_bundle "$id" "$product")" "$STAGE/"
done
ln -s /Applications "$STAGE/Applications"

mkdir -p "$DIST"
OUT="$DIST/234-Suite_${VERSION}_universal.dmg"
rm -f "$OUT"

hdiutil create \
  -volname "234 Suite" \
  -srcfolder "$STAGE" \
  -ov -format UDZO \
  "$OUT"

echo ""
echo "Built suite installer:"
echo "  $OUT ($(du -h "$OUT" | cut -f1))"
