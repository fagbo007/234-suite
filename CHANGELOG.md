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
  and OS-keychain key storage are deferred to the Tauri window.
- **MS Office round-trip** (`/packages/compat`, dependency-light via `fflate`):
  `.docx` ↔ Writer, `.xlsx` ↔ Sheet, `.pptx` ↔ Slides, each with a user-visible
  **import report** that logs fidelity losses (never silently mangles). Added a
  50-sample-per-format automated round-trip diff suite.

### Notes

- Performance gates (Writer < 200ms render, Sheet 60fps scroll, Slides < 3s
  open) have held throughout.
- Native desktop builds (Tauri window), cloud AI key storage, real-time
  collaboration, and packaged installers are planned for later phases; see
  `CLAUDE.md` §9 and the §17 decision log.
