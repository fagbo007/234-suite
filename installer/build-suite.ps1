# Build the 234 Suite single Windows installer (root CLAUDE.md §3.2).
#
# Bundles the four self-contained Tauri release binaries (launcher + writer/
# sheet/slides) into one NSIS installer via the makensis that Tauri downloaded.
# Build the four binaries first:
#   pnpm --filter @234/writer  tauri build --bundles nsis
#   pnpm --filter @234/sheet   tauri build --bundles nsis
#   pnpm --filter @234/slides  tauri build --bundles nsis
#   pnpm --filter @234/launcher tauri build --bundles nsis
# then run this script from anywhere.

$ErrorActionPreference = 'Stop'

$version = if ($env:VERSION) { $env:VERSION } else { '0.0.0' }
$repo = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $PSScriptRoot 'dist'
$script = Join-Path $PSScriptRoot '234-suite.nsi'

function Get-AppExe([string]$app) {
  Join-Path $repo "apps\$app\src-tauri\target\release\$app.exe"
}

$exes = @{
  WRITER_EXE   = Get-AppExe 'writer'
  SHEET_EXE    = Get-AppExe 'sheet'
  SLIDES_EXE   = Get-AppExe 'slides'
  LAUNCHER_EXE = Get-AppExe 'launcher'
}
$launcherIcon = Join-Path $repo 'apps\launcher\src-tauri\icons\icon.ico'

# Verify inputs exist.
$missing = @()
foreach ($k in $exes.Keys) { if (-not (Test-Path $exes[$k])) { $missing += $exes[$k] } }
if (-not (Test-Path $launcherIcon)) { $missing += $launcherIcon }
if ($missing.Count -gt 0) {
  Write-Error ("Missing build inputs (run the per-app `tauri build --bundles nsis` first):`n  " + ($missing -join "`n  "))
}

# Locate the makensis that Tauri downloaded.
$makensis = Join-Path $env:LOCALAPPDATA 'tauri\NSIS\makensis.exe'
if (-not (Test-Path $makensis)) {
  Write-Error "makensis not found at $makensis. Run any `tauri build --bundles nsis` once so Tauri fetches NSIS."
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$outFile = Join-Path $distDir "234 Suite_${version}_x64-setup.exe"
if (Test-Path $outFile) { Remove-Item $outFile -Force }

$nsisArgs = @(
  "/DVERSION=$version",
  "/DWRITER_EXE=$($exes.WRITER_EXE)",
  "/DSHEET_EXE=$($exes.SHEET_EXE)",
  "/DSLIDES_EXE=$($exes.SLIDES_EXE)",
  "/DLAUNCHER_EXE=$($exes.LAUNCHER_EXE)",
  "/DLAUNCHER_ICON=$launcherIcon",
  "/DOUTFILE=$outFile",
  $script
)

Write-Output "Compiling $script ..."
& $makensis @nsisArgs
if ($LASTEXITCODE -ne 0) { Write-Error "makensis failed with exit code $LASTEXITCODE" }

if (Test-Path $outFile) {
  $mb = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
  Write-Output ""
  Write-Output "Built suite installer:"
  Write-Output "  $outFile ($mb MB)"
} else {
  Write-Error "makensis reported success but the output is missing: $outFile"
}
