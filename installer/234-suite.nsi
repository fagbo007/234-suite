; 234 Suite — single Windows installer (root CLAUDE.md §3.2).
;
; Installs all four self-contained Tauri executables (launcher + writer/sheet/
; slides) into one per-user directory and bootstraps WebView2 once. The launcher
; opens each app as a separate process, resolving them as siblings in $INSTDIR.
;
; Compile via installer/build-suite.ps1 (passes the -D defines below). Requires
; the four release exes built first (`tauri build --bundles nsis` per app).
;
; Expected defines (all absolute paths):
;   WRITER_EXE SHEET_EXE SLIDES_EXE LAUNCHER_EXE  — the four release binaries
;   LAUNCHER_ICON                                 — icon.ico for shortcuts/branding
;   OUTFILE                                       — output installer path
;   VERSION                                       — e.g. 0.0.0

Unicode true
ManifestDPIAware true

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!define PRODUCTNAME "234 Suite"
!define PUBLISHER "Project 234 contributors"
!define WEBVIEW2APPGUID "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}"

Name "${PRODUCTNAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\${PRODUCTNAME}"
RequestExecutionLevel user
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${PRODUCTNAME}"
VIAddVersionKey "FileDescription" "${PRODUCTNAME} installer"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${PUBLISHER}"

!define MUI_ICON "${LAUNCHER_ICON}"
!define MUI_UNICON "${LAUNCHER_ICON}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\launcher.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open the 234 launcher"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "WebView2 runtime"
  ; Skip if the Evergreen WebView2 runtime is already present.
  ${If} ${RunningX64}
    ReadRegStr $4 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${Else}
    ReadRegStr $4 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}
  ${If} $4 == ""
    ReadRegStr $4 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}

  ${If} $4 == ""
    DetailPrint "Downloading the Microsoft WebView2 runtime..."
    Delete "$TEMP\MicrosoftEdgeWebview2Setup.exe"
    NSISdl::download "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "$TEMP\MicrosoftEdgeWebview2Setup.exe"
    Pop $0
    ${If} $0 == "success"
      DetailPrint "Installing the WebView2 runtime..."
      ExecWait '"$TEMP\MicrosoftEdgeWebview2Setup.exe" /silent /install' $1
      ${If} $1 <> 0
        DetailPrint "WebView2 runtime install returned $1 (continuing)."
      ${EndIf}
    ${Else}
      DetailPrint "Could not download WebView2 ($0). The apps need it to run; install the Evergreen runtime manually if missing."
    ${EndIf}
  ${EndIf}
SectionEnd

Section "234 Suite" SecSuite
  SectionIn RO
  SetOutPath "$INSTDIR"

  File "/oname=launcher.exe" "${LAUNCHER_EXE}"
  File "/oname=writer.exe" "${WRITER_EXE}"
  File "/oname=sheet.exe" "${SHEET_EXE}"
  File "/oname=slides.exe" "${SLIDES_EXE}"
  File "/oname=app.ico" "${LAUNCHER_ICON}"

  ; Start-menu suite folder: launcher first, then each app standalone.
  CreateDirectory "$SMPROGRAMS\${PRODUCTNAME}"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\234 Launcher.lnk" "$INSTDIR\launcher.exe" "" "$INSTDIR\app.ico"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\234 Writer.lnk" "$INSTDIR\writer.exe"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\234 Sheet.lnk" "$INSTDIR\sheet.exe"
  CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}\234 Slides.lnk" "$INSTDIR\slides.exe"
  CreateShortcut "$DESKTOP\234 Launcher.lnk" "$INSTDIR\launcher.exe" "" "$INSTDIR\app.ico"

  ; Single uninstall entry for the whole suite.
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "${PRODUCTNAME}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\app.ico"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\launcher.exe"
  Delete "$INSTDIR\writer.exe"
  Delete "$INSTDIR\sheet.exe"
  Delete "$INSTDIR\slides.exe"
  Delete "$INSTDIR\app.ico"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\${PRODUCTNAME}\234 Launcher.lnk"
  Delete "$SMPROGRAMS\${PRODUCTNAME}\234 Writer.lnk"
  Delete "$SMPROGRAMS\${PRODUCTNAME}\234 Sheet.lnk"
  Delete "$SMPROGRAMS\${PRODUCTNAME}\234 Slides.lnk"
  RMDir "$SMPROGRAMS\${PRODUCTNAME}"
  Delete "$DESKTOP\234 Launcher.lnk"

  DeleteRegKey HKCU "${UNINSTKEY}"
SectionEnd
