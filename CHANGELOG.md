# Changelog

All notable changes to Project 234 are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this file is maintained
from the commit history. Nothing has been publicly released yet, so everything
lives under **Unreleased**.

## [Unreleased]

### Phase 1 — Foundation

- Scaffolded the pnpm-workspace monorepo (Writer / Sheet / Slides / shared +
  `packages/*`), TypeScript strict, Vitest + Playwright, and the GitHub Actions
  CI matrix (Windows / macOS / Linux).
- **234 Writer**: ProseMirror editor (bold/italic, headings h1–h3, lists),
  styles as first-class schema objects (no className styling), `.fwtr`
  (Markdown + YAML front matter) save/load.
- **234 Sheet**: virtual 100k-row grid, formula engine wired, named-reference
  translation-layer scaffold, `.fwsh` (CSV + sidecar meta) save/load.
- **234 Slides**: Fabric.js canvas, slide panel, `constraintCheck` stub, `.fwsl`
  (JSON) save/load.
- Shared design system: CSS custom-property tokens (light + dark), Button /
  Input / Icon, and the Cmd/Ctrl+K command palette.
- **Formula engine swapped from HyperFormula (GPLv3) to an in-house MIT
  evaluator** so the suite stays cleanly MIT; the public `SheetEngine` API was
  unchanged. Tauri scaffold for Writer added (native window deferred — see §17).

### Phase 2 — Fixing the known pain points

- **Writer**: visual style editor; find & replace; unlimited session undo;
  block-level image model with an explicit anchor picker (no float-on-drag).
- **Sheet**: named-reference translation layer fully wired (A1 lints, structural
  edits preserve refs); formula autocomplete (names first) in every input
  context; explicit date columns (no auto-coercion); external-link auditor;
  charts (bar/line/pie); conditional formatting + data validation.
- **Slides**: live auto-layout engine (grid snapping, alignment, guardrails);
  animation model (entrance/emphasis/exit) + presenter mode + speaker notes;
  image import with compression; a 10-template library with CI validation.
- **Shared**: AI sidebar scaffold (docked, user-invoked, no AI content); MS
  Office keyboard-shortcut compatibility layer; accessibility audit.

### Phase 3 — AI layer & MS Office round-trip

- **AI sidebar (live, offline-first)**: an `AiProvider` engine with a
  deterministic mock (default, no network) + a local Ollama provider; Writer
  (rephrase / summarise / explain / continue), Sheet (NL → formula / explain /
  suggest chart), and Slides (outline / layout / speaker notes). Cloud providers
  (Claude / OpenAI) + OS-keychain key storage landed once the native window built
  (see below).
- **MS Office round-trip** (`/packages/compat`, dependency-light via `fflate`):
  `.docx` ↔ Writer, `.xlsx` ↔ Sheet, `.pptx` ↔ Slides, each with a user-visible
  **import report** that logs fidelity losses (never silently mangles). Added a
  50-sample-per-format automated round-trip diff suite.

### Native desktop, installers & collaboration

- **Native Tauri windows** — all four apps (Writer / Sheet / Slides + a new **234
  Launcher**) build and run on the Rust + MSVC toolchain. Each produces an
  optimized `<app>.exe` (~8 MB) and an **NSIS installer** (~1.8–1.9 MB). The
  Windows bundle target is NSIS, not MSI (WiX trips on spaced checkout paths).
- **234 Suite single installer** (`installer/`) — one Windows installer lays all
  four self-contained exes into `%LOCALAPPDATA%\234 Suite`, bootstraps WebView2
  once, and adds a Start-menu folder. The launcher opens each app as an isolated
  process (sibling-relative resolution); per-app installers remain available.
- **Cloud AI + OS-keychain key storage (§6)** — Claude / OpenAI via a shared Rust
  crate (`packages/ai-backend`): the API key is stored in the OS keychain and the
  HTTPS call is made **in Rust**, so the key never enters JavaScript and never
  hits plaintext. Default provider stays the offline mock; AI remains optional.
- **Real-time collaboration (Yjs)** — a transport-agnostic core (`@234/collab`):
  `CollabDoc`, human session codes, an in-memory test network + lazy WebRTC /
  WebSocket transports, awareness, guarded local persistence, and a minimal relay
  that stores nothing. Live in **all three apps** — Sheet (cells ↔ `Y.Map`),
  Writer (`y-prosemirror` ↔ `Y.XmlFragment`), Slides (slide-granular `Y.Map` +
  `Y.Array`). Opt-in and off by default; convergence proven by deterministic
  in-memory tests.

### Notes

- Performance gates (Writer < 200ms render, Sheet 60fps scroll, Slides < 3s
  open, Sheet < 500ms / 10k formulas) have held throughout.
- Verified here at the compile/unit level; the manual steps that need real
  devices/network — a clean-machine suite install, a two-peer live collab edit,
  and a real cloud-AI round-trip — are pending. Still planned (see `CLAUDE.md` §9
  / §17): macOS/Linux installers, native file I/O, the AES-256 keychain fallback,
  a working plugin loader, and a public repo + docs site.
