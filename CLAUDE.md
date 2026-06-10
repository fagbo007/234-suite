# CLAUDE.md — Project 234: Open Source Office Suite

> This file is the single source of truth for Claude Code across all sessions.
> Read it in full before doing anything. Every architecture decision, design
> principle, and constraint in this file was deliberately chosen. Do not deviate
> without raising it as a question first.

---

## 1. Project overview

**Project name:** Project 234  
**What it is:** Three open source desktop productivity applications built as a
monorepo, targeting general consumers on Windows, macOS, and Linux.

- **234 Writer** — word processor (replaces Microsoft Word)
- **234 Sheet** — spreadsheet (replaces Microsoft Excel)
- **234 Slides** — presentation tool (replaces Microsoft PowerPoint)

**License:** MIT  
**Business model:** 100% open source, no account required to run, no
subscriptions, no telemetry without explicit opt-in.  
**Target users:** General consumers — people who write letters, build simple
budgets, make occasional presentations. Not enterprise power users.

---

## 2. Why this exists — the competitive context

This suite was designed to fix known, documented failures of the incumbents.
Every architectural decision maps to a specific pain point. Do not remove or
simplify these constraints without understanding what pain they are fixing.

### 2.1 Microsoft Word failures (fixes required in 234 Writer)

| Pain point | Severity | Required fix |
|---|---|---|
| Ribbon cognitive overload — hundreds of commands visible at once | Critical | Context-adaptive command palette. Show only commands relevant to current selection. Full command list via Cmd+K / Ctrl+K |
| Style corruption — hidden style hierarchy causes spontaneous reflow | Critical | Styles as first-class named objects in the document schema. No implicit CSS cascade. Visual style editor |
| Image placement chaos — slight mouse movement makes images fly | Critical | Images as block-level nodes in ProseMirror schema. Explicit anchor picker UI. No float-on-drag |
| Performance degrades on large documents | Medium | Benchmark: 100-page document must render in under 200ms. This gates Phase 1 completion |
| Forced subscription, no offline | Critical | MIT license, native open formats, runs fully offline |
| AI feels intrusive and obstructive | Medium | AI lives in collapsible sidebar only. See Section 6 |

### 2.2 Microsoft Excel failures (fixes required in 234 Sheet)

| Pain point | Severity | Required fix |
|---|---|---|
| Formula syntax is arcane, no autocomplete in dialogs | Critical | Formula autocomplete in every input context including conditional formatting and data validation dialogs |
| Inserting a column breaks formula references silently | Critical | All formula references stored by name or UUID. Named by default; A1 permitted with a lint warning shown to the user. Structural edits preserve reference integrity |
| Date auto-coercion mutates data silently | Critical | No automatic type coercion. Explicit date column declaration. Date format locked to column schema |
| Conditional formatting dialog has no formula helper | Critical | Full autocomplete and formula preview in all dialog boxes including charts, conditional formatting, and data validation |
| Ghost external links persist invisibly | Medium | Link audit tool built in. External references surfaced in document inspector |
| Benchmark | — | 100,000-row sheet must scroll at 60fps. This gates Phase 1 completion |

### 2.3 Microsoft PowerPoint failures (fixes required in 234 Slides)

| Pain point | Severity | Required fix |
|---|---|---|
| Design floor is low — default results look dated and amateurish | Critical | Auto-layout engine enforces visual hierarchy. Hard to produce an ugly slide by default |
| Templates feel generic and outdated | Critical | Modern template library, contributed via PR to main repo, reviewed like code |
| Manual pixel-pushing for alignment and spacing | Critical | Smart alignment snapping. Spacing grid. Design guardrails baked in |
| Advanced animations require steep learning curve | Medium | Simplified animation model: entrance, emphasis, exit. Advanced panel for power users |
| Large files crawl with embedded media | Medium | Benchmark: 100-slide deck with images must open in under 3 seconds |
| AI layout suggestions feel intrusive | Medium | AI lives in collapsible sidebar only. See Section 6 |

### 2.4 Open source baseline failures (fixes required across all apps)

| Pain point | Fix |
|---|---|
| LibreOffice UI feels 15 years old | Purpose-built design system, modern type scale, dark mode by default |
| MS Office round-trip fidelity breaks fonts and layout | Dedicated compatibility layer. Lossy cases communicated clearly rather than silently mangled |
| Real-time collaboration only just arriving in OSS alternatives | Yjs CRDT layer, optional relay server for remote collab. User can self-host or use community relay |

---

## 3. Tech stack

### 3.1 Core decisions

| Layer | Choice | Rationale |
|---|---|---|
| Desktop shell | Tauri 2 + Rust | Native binaries, cross-platform, much lighter than Electron. Critical for spreadsheet performance |
| UI layer | React 18 + TypeScript | Component-driven, typed, testable. Claude Code handles Rust fluently so team Rust fluency is not a constraint |
| Document model (Writer) | ProseMirror | Structured schema, styles as first-class schema nodes, extensible |
| Formula engine (Sheet) | In-house MIT evaluator (formula.js — MIT — for Phase 2 breadth) | MIT-licensed so the suite stays MIT; HyperFormula (GPLv3) was dropped. Phase 1 covers arithmetic + SUM/AVERAGE/COUNT. Owner decision 2026-06-02 — see §17 |
| Canvas model (Slides) | Fabric.js | Precise object model, pixel-perfect layout, good SVG interop |
| Collaboration / state | Yjs (CRDTs) | Conflict-free, offline-first. Optional — not required for v1. Remote sessions use optional relay server |
| File formats (native) | Markdown (.fwtr), CSV (.fwsh), JSON (.fwsl) | Open, human-readable, version-control-friendly |
| File formats (import/export) | .docx, .xlsx, .pptx | Full round-trip support via dedicated compatibility layer in Phase 3 |
| AI integration | Ollama (local) + Claude API (optional) | Local LLM for offline use. Claude/OpenAI as opt-in via user settings. Never mandatory |
| AI key storage | OS keychain (primary), encrypted local file (fallback) | macOS Keychain / Windows Credential Manager / Linux Secret Service where available; AES-256 encrypted file in app data dir as fallback on systems without keychain support |
| Package manager | pnpm workspaces | Monorepo dependency management |
| Testing | Vitest + Playwright | Unit and integration per app, E2E for critical user flows |
| CI | GitHub Actions | Matrix: Windows, macOS, Linux on every PR |

### 3.2 App shell architecture

The suite ships as a **single installer** containing all three apps. A launcher
lets users open Writer, Sheet, or Slides from one place. Each app also functions
as a standalone binary — users can install only Writer if they choose. The three
processes are isolated: a crash in Sheet does not affect Writer.

Installer packages:
- `.dmg` containing 234 suite (macOS)
- NSIS `.exe` suite installer (Windows) — individual app `.exe` also available
- `.AppImage` suite (Linux) — individual `.AppImage` per app also available

Record implementation decisions in `/docs/architecture/app-shell.md`.

### 3.3 Formula function coverage

The in-house MIT evaluator covers a deliberately small Phase 1 set (arithmetic +
SUM/AVERAGE/COUNT). Before adding any formula feature in 234 Sheet, check the
compat table at `/docs/formula-compat.md`. Do not implement missing functions by
guessing — mark them as unsupported in the UI with a clear error message (the
evaluator returns `#NAME?` for unknown functions). Broader coverage in Phase 2
comes via extending the evaluator or adopting formula.js (MIT). The compat table
is maintained from Phase 1 onward.

### 3.4 Formula reference translation layer

The formula engine uses A1 notation at its evaluation boundary. 234 Sheet
exposes named references to users by default. A translation layer in
`/packages/formula-engine` maps human-readable names to cell coordinates at
evaluation time. (The translation layer is engine-agnostic — it was unaffected
by swapping HyperFormula out for the in-house MIT evaluator.)

Rules:
- Named references are the **default and encouraged** path. Autocomplete always
  suggests names first.
- A1 notation is **permitted** but surfaces a lint warning in the formula bar:
  *"Consider using a named reference for better stability."*
- The translation layer stores a `name → {sheet, row, col}` registry. When a
  column or row is inserted, the registry updates coordinates automatically.
  Named refs are therefore structurally stable. A1 refs are not — this is why
  named refs are encouraged.
- Design the translation layer architecture and record it in
  `/docs/architecture/formula-refs.md` before any Sheet formula work begins.

### 3.5 Tauri vs Electron trade-off

Tauri was chosen for performance. The Rust backend handles file I/O, the
formula engine subprocess, and any CPU-intensive work. The React frontend
handles UI only. If a task belongs in the backend, put it in Rust. Ask before
adding any Node.js subprocess that could be handled in Rust.

---

## 4. Monorepo structure

```
/
├── CLAUDE.md                  ← this file (root)
├── package.json               ← pnpm workspace root
├── apps/
│   ├── writer/
│   │   ├── CLAUDE.md          ← Writer-specific rules
│   │   ├── src/
│   │   └── ...
│   ├── sheet/
│   │   ├── CLAUDE.md          ← Sheet-specific rules
│   │   ├── src/
│   │   └── ...
│   ├── slides/
│   │   ├── CLAUDE.md          ← Slides-specific rules
│   │   ├── src/
│   │   └── ...
│   └── shared/
│       ├── CLAUDE.md          ← Design system rules
│       ├── components/        ← Shared React components
│       ├── design-tokens/     ← CSS variables, theme
│       └── ...
├── packages/
│   ├── compat/                ← MS Office import/export layer (Phase 3)
│   ├── formula-engine/        ← HyperFormula wrapper + name→A1 translation layer
│   └── ai-sidebar/            ← Shared AI sidebar component
└── docs/
    ├── architecture/
    │   ├── app-shell.md       ← App shell decisions (populate in Phase 1 Step 1)
    │   ├── formula-refs.md    ← Translation layer design (populate before Sheet work)
    │   └── ai-sidebar.md      ← AI sidebar rules and decisions
    ├── contributing.md
    └── formula-compat.md      ← HyperFormula gap table (build in Phase 1)
```

All apps share the design system in `apps/shared`. Never duplicate a shared
component inside an app. If a component is needed by two or more apps, it
belongs in `apps/shared/components`.

---

## 5. Design system rules

These rules apply to every component in every app. They are non-negotiable.

- **Dark mode is mandatory.** Every new component must work in both light and
  dark mode before it can be merged. Use CSS custom properties only — no
  hardcoded hex values in component styles.
- **Accessible by default.** Every interactive element needs an ARIA label if
  it has no visible text. Focus states must be visible. Do not ship a component
  with `outline: none` without providing an equivalent focus indicator.
- **Context-adaptive UI.** The command palette is the primary navigation
  surface. Show only commands relevant to the current selection state. Do not
  expose ribbon-style toolbars that show all commands at all times.
- **Sentence case everywhere.** All labels, menu items, button text, headings —
  sentence case. Never Title Case or ALL CAPS in UI text.
- **Icons:** Tabler outline icons only (`@tabler/icons-react`). Never use
  filled variants. Never hand-draw icon paths.
- **Type scale:** 14px body, 16px emphasis, 12px secondary/metadata. Two
  weights only: 400 regular and 500 medium. Never 600 or 700.
- **Border radius:** 8px for interactive elements, 12px for cards. Pills
  only when semantically a pill.
- **No gradients, no drop shadows** on UI chrome. Flat surfaces only.

---

## 6. AI integration rules — the single most important design principle

> **The AI sidebar rule:**
> AI lives in a collapsible sidebar only.
> It never floats over content.
> It never speaks first.
> The user invokes it — it never invokes itself.
> This rule cannot be overridden by any feature request without explicit
> discussion and a decision recorded in `/docs/architecture/ai-sidebar.md`.

This rule exists because Microsoft's Copilot, when placed as a floating element
over document content, generated significant user backlash and had to be
reverted. We do not repeat that mistake.

### AI feature scope by phase

- **Phase 1–2:** No AI features. Build the core editing experience first.
- **Phase 3:** AI sidebar scaffold only. Collapsible panel, user-invoked.
  - Writer: writing assist, summarise, rephrase, continue
  - Sheet: natural language formula input ("total sales by region" → formula),
    explain formula, suggest chart type
  - Slides: layout suggestion, content outline, speaker notes draft
- **Phase 4+:** Plugin API lets third-party AI integrations extend the sidebar.

### AI key storage (decided)

User-supplied API keys (Claude, OpenAI) are stored using the OS keychain as
primary: macOS Keychain, Windows Credential Manager, Linux Secret Service
(libsecret). On systems where no keychain is available, fall back to an
AES-256 encrypted file in the app data directory. The encryption key is derived
from a machine-specific identifier. Keys are never stored in plaintext. Keys
are never transmitted anywhere except to the AI provider's API endpoint.

### AI is always optional

The apps must be fully functional with AI disabled or unavailable. AI features
are progressive enhancement, not core functionality. A user with no internet
access and no local LLM installed must have access to 100% of the non-AI
feature set.

---

## 7. File format rules

### Native formats (open first)

| App | Extension | Format |
|---|---|---|
| 234 Writer | `.fwtr` | Markdown-based with YAML front matter for metadata and styles |
| 234 Sheet | `.fwsh` | CSV with a sidecar `.fwsh.meta` JSON for schema, column types, named ranges |
| 234 Slides | `.fwsl` | JSON document model, assets stored as base64 or referenced paths |

These are the primary save formats. They must be human-readable, diffable in
git, and not require the application to be installed to read their contents.

### Import / export (Phase 3)

Full round-trip support for `.docx`, `.xlsx`, `.pptx`. The compatibility layer
lives in `/packages/compat`. When a round-trip causes fidelity loss (e.g. a
gradient that has no equivalent in our format), the import must:
1. Complete successfully — never fail silently or corrupt data
2. Log the specific fidelity loss to a user-visible import report
3. Never silently mangle or discard content

---

## 8. Performance benchmarks — gates, not guidelines

These benchmarks must pass before the relevant phase is considered complete.
They are run as part of the pre-commit hook and block merges if they regress.

| App | Benchmark | Target | Phase gate |
|---|---|---|---|
| Writer | Render 100-page document (no media) | < 200ms | Phase 1 |
| Writer | Scroll through 100 pages | 60fps | Phase 1 |
| Sheet | Scroll 100,000-row sheet | 60fps | Phase 1 |
| Sheet | Evaluate 10,000 formula cells | < 500ms | Phase 2 |
| Slides | Open 100-slide deck with images | < 3s | Phase 1 |
| Slides | Real-time object drag on canvas | 60fps | Phase 1 |
| All | Cold start to usable UI | < 1.5s | Phase 2 |

If a benchmark regression is introduced, fix it before continuing. Do not
suppress the benchmark or raise the threshold without a recorded architecture
discussion.

---

## 9. Build phases

### Phase 1 — Foundation (target: 2–3 weeks with Claude Code)

**Goal:** All three apps running. Minimal but correct. Benchmarks pass.

**Writer deliverables:**
- Tauri window, React shell
- ProseMirror editor with basic text editing (bold, italic, headings, lists)
- Styles as first-class schema nodes — no className-based styling
- Save/load `.fwtr` files
- 100-page render benchmark passing

**Sheet deliverables:**
- Grid rendering with virtual scrolling (100k rows, 60fps)
- HyperFormula wired — basic arithmetic and SUM/AVERAGE/COUNT formulas
- Formula compat table at `/docs/formula-compat.md`
- Save/load `.fwsh` files
- Named reference translation layer scaffolded in `/packages/formula-engine`

**Slides deliverables:**
- Fabric.js canvas with add text / add shape
- Slide panel (add, reorder, delete slides)
- Auto-layout engine scaffold — object placement triggers constraint check
- Save/load `.fwsl` files
- 100-slide open benchmark passing

**Shared deliverables:**
- Design system: CSS custom properties, dark mode, type scale
- Command palette component (Cmd+K / Ctrl+K) wired in all three apps
- Tabler icon library installed and documented
- pnpm workspace configured, CI matrix running on GitHub Actions
- Suite installer scaffold: single launcher, three isolated processes

**Phase 1 is NOT done until:**
- All benchmarks pass
- All three apps open, edit, save, and reload a document
- Dark mode works in all three apps
- CI passes on Windows, macOS, and Linux

---

### Phase 2 — Fix the known pain (target: 3–4 weeks with Claude Code)

**Goal:** Every critical pain point from Section 2 is resolved.

**Writer:**
- Visual style editor — create, rename, delete, apply named styles
- Image block model — images as block-level ProseMirror nodes, explicit anchor
  picker, no float-on-drag
- Large document performance: maintain 60fps scroll on 100-page doc
- Find and replace
- Undo history (unlimited within session)

**Sheet:**
- Named reference translation layer fully wired
- Named refs default and autocompleted; A1 refs permitted with lint warning
- Autocomplete in every formula context (formula bar, conditional formatting
  dialog, data validation dialog, chart data dialog)
- Date column declaration — no auto date coercion, format locked to schema
- Column/row insert preserves all named formula reference integrity
- External link auditor — surfaces all external references in inspector panel
- Basic charting: bar, line, pie with correct data binding

**Slides:**
- Auto-layout engine live — spacing grid, smart alignment snapping
- Modern default template set: minimum 10 templates contributed via PR,
  each in `/apps/slides/templates/`, reviewed and merged like code
- Simplified animation model: entrance, emphasis, exit per object
- Presenter mode: fullscreen, speaker notes panel
- Image import with automatic compression

**Shared:**
- AI sidebar scaffold — collapsible panel, user-invoked, no AI content yet
- MS Office keyboard shortcut compatibility layer (Ctrl+B, Ctrl+I, etc.)
- Accessibility audit: all interactive elements keyboard-navigable

**Phase 2 is NOT done until:**
- All Phase 2 deliverables above are complete
- Zero known regressions on Phase 1 benchmarks
- A new user can produce a functional document, spreadsheet, and presentation
  without consulting documentation

---

### Phase 3 — Polish and AI layer (target: 4–5 weeks with Claude Code)

**Goal:** Production-quality finish. AI sidebar live. MS Office round-trip.

**AI sidebar (all apps):**
- Collapsible panel, remembers open/closed state per app
- No floating elements, no proactive suggestions
- Writer: rephrase, continue, summarise, explain selection
- Sheet: natural language → formula, explain formula, suggest chart
- Slides: outline generation, layout suggestion, speaker notes
- Works with local Ollama model (offline) or user-supplied Claude/OpenAI API
  key (opt-in). Key stored per Section 6 (OS keychain, encrypted file fallback)
- 234 never ships with a default API key

**MS Office compatibility (in `/packages/compat`):**
- `.docx` import/export with import report for fidelity losses
- `.xlsx` import/export with import report
- `.pptx` import/export with import report
- Round-trip test suite: 50 sample documents per format, automated diff

**Performance polish:**
- Cold start < 1.5s on all platforms
- Memory profile: Writer < 200MB for 100-page doc, Sheet < 500MB for 100k rows

**Phase 3 is NOT done until:**
- All three import/export formats work with the import report system
- AI sidebar is live and user-invokable in all three apps
- All performance targets in Section 8 pass

---

### Phase 4 — Community and launch (target: 2–3 weeks with Claude Code)

**Goal:** Public, installable, welcoming to contributors.

- GitHub repo public with contributing guide and code of conduct
- Plugin / extension API documented and working for all three apps
- Optional Yjs real-time collaboration via community relay server. User can
  self-host a relay or connect to the official community relay. Relay is
  optional — local network peer connection also supported without relay.
  Session sharing: user generates a session code, shares it, peer enters code
  to join. Relay implementation in `/packages/collab`.
- Packaged installers: `.dmg` suite + per-app (macOS), NSIS `.exe` suite +
  per-app (Windows), `.AppImage` suite + per-app (Linux), `.deb` (Linux)
- Docs site (generated from source comments and architecture docs)
- Changelog generated from git history
- Beta programme issue triage workflow documented

---

## 10. Template contribution process (234 Slides)

Templates are contributed via pull request to the main repository, reviewed
like code, and shipped with the app. This keeps quality high and avoids a
separate distribution infrastructure for v1.

**Template file structure:**
```
/apps/slides/templates/
└── <template-name>/
    ├── template.fwsl       ← the slide template in native format
    ├── preview.png         ← 1280×720 PNG preview image
    └── meta.json           ← name, author, tags, description, license
```

**Validation requirements for a template PR:**
- `template.fwsl` must parse without errors
- `preview.png` must be exactly 1280×720
- `meta.json` must include: `name`, `author`, `tags` (array), `description`,
  `license` (must be MIT or CC0)
- Auto-layout engine must not flag any constraint violations on the template slides
- CI runs a template validation script on every PR touching `/apps/slides/templates/`

Record the validation script spec in `/apps/slides/docs/template-format.md`
before Phase 2 template work begins.

---

## 11. Pain-to-task mapping — complete reference

| Pain point (source) | App | Build task | Phase |
|---|---|---|---|
| Ribbon cognitive overload | All | Context-adaptive command palette (Cmd+K) | 1 |
| Style corruption / hidden hierarchy | Writer | Styles as named schema nodes, visual style editor | 1 + 2 |
| Image placement chaos | Writer | Image as block node, anchor picker, no float-on-drag | 2 |
| Performance on large docs | Writer | Virtual rendering, 100-page benchmark | 1 |
| Forced subscription | All | MIT license, open formats, fully offline | 1 |
| AI intrusive / floating | All | AI sidebar rule (Section 6) — enforced by post-edit hook | 1 |
| Arcane formula syntax | Sheet | Autocomplete in all formula contexts | 2 |
| Column insert breaks refs | Sheet | Named refs default, A1 with lint warning, translation layer | 1 (scaffold) + 2 (full) |
| Date auto-coercion | Sheet | Explicit date column declaration, no coercion | 2 |
| Conditional formatting no helper | Sheet | Autocomplete + preview in all dialog inputs | 2 |
| Ghost external links | Sheet | Link auditor in inspector panel | 2 |
| Design floor too low | Slides | Auto-layout engine, design guardrails | 1 (scaffold) + 2 (full) |
| Generic outdated templates | Slides | PR-reviewed template library, 10+ templates in Phase 2 | 2 |
| Manual pixel alignment | Slides | Smart snapping, spacing grid | 2 |
| LibreOffice UI dated | All | Purpose-built design system, dark mode | 1 |
| OSS MS Office compat poor | All | Dedicated compat layer, import report | 3 |
| OSS no real-time collab | All | Optional Yjs + relay server | 4 |

---

## 12. Hooks configuration

### Post-edit hook

Run after every file write. Block if any of the following are violated:

1. **Sheet**: any formula reference uses raw A1 notation in the storage layer
   (not the display layer) — raise error: `"Formula ref violation: storage
   layer must use named references or UUIDs. A1 notation is only permitted
   in the display layer with a lint warning."`
2. **Writer**: any style applied via a `className` string without a
   corresponding registered `Style` schema node — raise error: `"Style
   violation: all styles must be registered schema nodes"`
3. **All**: any new component file containing a hardcoded hex color in styles —
   raise warning: `"Dark mode check: hardcoded color found, use CSS custom
   properties"`
4. **All**: any new interactive element missing an `aria-label` where no
   visible text exists — raise warning: `"Accessibility check: missing
   aria-label"`
5. **All**: any new component file missing a corresponding `.test.ts` or
   `.test.tsx` file — raise warning: `"Test coverage check: no test file found
   for this component"`

### Pre-commit hook

Run before every commit. Block if:

1. Full unit test suite fails
2. Any Phase 1 performance benchmark regresses by more than 10%
3. Lint errors present (ESLint strict mode)
4. Any file in `/apps/slides/templates/` fails template validation script

### Session start hook

At the start of every Claude Code session:

1. Print current benchmark results from the last CI run
2. Print count of open GitHub issues labelled `bug` and `p1`
3. Print the current phase and any incomplete Phase gate criteria
4. Remind: **"AI sidebar rule: user invokes, never floats, never speaks first"**
5. Remind: **"Formula refs: named refs are default and stored in translation
   layer. A1 is display-only with lint warning. Never store raw A1 in
   formula-engine."**
6. If working in `/apps/sheet`, print the HyperFormula compat gap count from
   `/docs/formula-compat.md`

### Session end hook

At the end of every Claude Code session:

1. Auto-generate a draft commit message from the diff
2. Write session decisions to auto-memory: architecture decisions made, formula
   engine edge cases discovered, benchmark results that changed
3. Prompt: "Any decisions to record in Section 16 of CLAUDE.md?"
4. If branch has uncommitted changes, prompt: "Commit before closing?"

---

## 13. Sub-agent topology

When running parallel sessions, use this agent structure:

| Agent | Scope | CLAUDE.md | Responsibilities |
|---|---|---|---|
| Lead agent | Root `/` | Root CLAUDE.md | Orchestrates, integrates sub-agent PRs, runs cross-app tests, merges |
| Writer agent | `/apps/writer` | Writer CLAUDE.md | ProseMirror schema, style system, image model, Writer tests |
| Sheet agent | `/apps/sheet` | Sheet CLAUDE.md | HyperFormula, translation layer, named refs, date schema, autocomplete, Sheet tests |
| Slides agent | `/apps/slides` | Slides CLAUDE.md | Fabric.js canvas, auto-layout engine, templates, Slides tests |
| Design agent | `/apps/shared` | Shared CLAUDE.md | Component library, design tokens, command palette, AI sidebar scaffold |

Sub-agents do not merge to `main` directly. They push to feature branches. The
lead agent reviews diffs and merges. Enable Plan Mode for any sub-agent task
touching shared infrastructure in `/apps/shared` or `/packages`.

---

## 14. App-specific CLAUDE.md files to create

Create these files at the start of Phase 1 before any app code is written.

### `/apps/writer/CLAUDE.md` must include:
- ProseMirror schema constraints (styles as schema nodes, required node types)
- Image block model specification
- Forbidden patterns: className-based styling, float-on-drag image handling
- Test commands: `pnpm test:writer`
- Benchmark commands: `pnpm bench:writer`

### `/apps/sheet/CLAUDE.md` must include:
- HyperFormula integration specification
- Translation layer rules: named refs stored in `/packages/formula-engine`,
  A1 is display-layer only, lint warning required when user enters A1 ref
- Date column schema specification
- Autocomplete requirement for all dialog input contexts
- Pointer to `/docs/formula-compat.md` for unsupported functions
- Test commands: `pnpm test:sheet`
- Benchmark commands: `pnpm bench:sheet`

### `/apps/slides/CLAUDE.md` must include:
- Fabric.js canvas model specification
- Auto-layout engine requirement: every object placement triggers constraint check
- Template contribution format (see Section 10 and `/apps/slides/docs/template-format.md`)
- Animation API constraints: entrance / emphasis / exit only in v1
- Test commands: `pnpm test:slides`
- Benchmark commands: `pnpm bench:slides`

### `/apps/shared/CLAUDE.md` must include:
- Full design system rules (mirrors Section 5 of this file)
- CSS custom property naming convention
- Component file structure template
- Dark mode testing requirement
- Icon usage rules (Tabler outline only)
- Command palette API

---

## 15. What to build first — Phase 1 task list

Execute in order. Do not add Phase 2 features. Goal: thin, correct, benchmarked.

### Step 1: Repository scaffold
- [ ] Initialise pnpm workspace: packages `writer`, `sheet`, `slides`, `shared`
- [ ] Configure TypeScript strict mode across all packages
- [ ] Set up Vitest (unit), Playwright (E2E)
- [ ] GitHub Actions CI matrix: Windows latest, macOS latest, Ubuntu latest
- [ ] Suite launcher: single installer, three isolated Tauri processes
- [ ] Record app-shell decisions in `/docs/architecture/app-shell.md`
- [ ] Create all four app-specific CLAUDE.md files (Section 14)

### Step 2: Design system
- [ ] CSS custom properties: colour tokens (light + dark), type scale, spacing
- [ ] Base components: Button, Input, Icon (Tabler wrapper)
- [ ] Command palette: Cmd+K / Ctrl+K trigger, fuzzy search, keyboard navigation
- [ ] Confirm dark mode in all components before proceeding

### Step 3: 234 Writer minimal
- [ ] ProseMirror editor in Tauri window
- [ ] Schema: paragraph, heading h1–h3, bold, italic, ordered and unordered list
- [ ] `Style` schema node type: id, name, properties — no className-based styling
- [ ] Save/load `.fwtr` (Markdown + YAML front matter)
- [ ] 100-page render benchmark passing before moving on

### Step 4: 234 Sheet minimal
- [ ] Virtual grid: 100k rows, 60fps scroll — canvas or windowed DOM
- [ ] HyperFormula wired to grid cell model
- [ ] Translation layer scaffold in `/packages/formula-engine`:
      `name → {sheet, row, col}` registry, A1 conversion utilities
- [ ] Formula compat table at `/docs/formula-compat.md`
- [ ] Save/load `.fwsh` (CSV + sidecar meta JSON)
- [ ] 100k-row scroll benchmark passing before moving on

### Step 5: 234 Slides minimal
- [ ] Fabric.js canvas in Tauri window
- [ ] Add text object, add rectangle, add image
- [ ] Slide panel: add, reorder, delete
- [ ] `constraintCheck(objects)` stub — returns true in Phase 1, real logic Phase 2
- [ ] Save/load `.fwsl` (JSON)
- [ ] 100-slide open benchmark passing before moving on

### Step 6: Integration and CI
- [ ] All three apps launchable from suite launcher
- [ ] All benchmarks passing in CI on all three platforms
- [ ] Phase 1 sign-off recorded in `/docs/architecture/phase-1-complete.md`

---

## 16. Constraints — things never to do

- **Never store raw A1 cell notation** in the formula storage or translation
  layer in 234 Sheet. A1 is display-layer only, shown with a lint warning.
- **Never apply styles via className strings** in 234 Writer — always via
  registered Style schema nodes.
- **Never place the AI sidebar as a floating element** over document content.
- **Never make AI features mandatory** — every app must be fully usable with AI
  disabled or unavailable.
- **Never hardcode hex colours** in component styles — CSS custom properties only.
- **Never ship a component without dark mode support.**
- **Never raise a benchmark threshold** to make a test pass — fix the
  performance issue instead.
- **Never silently mangle MS Office import data** — always produce an import
  report listing fidelity losses.
- **Never add a Phase 2 feature during Phase 1** — keep the foundation lean.
- **Never store AI API keys in plaintext** — OS keychain primary, AES-256
  encrypted file fallback only.

---

## 17. Decision log

Format: `YYYY-MM-DD | Decision | Rationale | Alternatives considered`

```
2026-06-01 | App shell: suite installer (single install) with three isolated
             processes. Each app also available as standalone binary. |
             Balances user convenience (one install) with process isolation
             (a crash in Sheet does not affect Writer). Installer size is
             acceptable given users get all three apps. |
             Alternatives: three completely separate binaries (more isolated
             but worse UX for consumers); single process (simpler but no
             crash isolation).

2026-06-01 | Formula references: named refs are default and stored in a
             translation layer in /packages/formula-engine. A1 notation is
             permitted at the display layer only and surfaces a lint warning
             to the user. HyperFormula's internal A1 model is hidden behind
             the translation layer. |
             Fixes the "column insert breaks everything" pain point for the
             majority of users while not blocking power users who know A1. |
             Alternatives: named refs only with no A1 fallback (purer fix but
             higher friction for Excel migrants); A1 as default (maintains
             the exact pain point we set out to fix — rejected).

2026-06-01 | Collaboration (Phase 4): optional relay server for remote
             sessions. User can self-host or use community relay. Local
             network peer connection supported without relay. Session sharing
             via generated session code. |
             Relay enables remote collab without requiring users to be on
             the same network, while keeping it optional and self-hostable
             in keeping with the open source ethos. |
             Alternatives: LAN-only (too limiting for remote teams);
             mandatory hosted relay (introduces infrastructure dependency
             and trust concern — rejected).

2026-06-01 | AI API key storage: OS keychain (macOS Keychain, Windows
             Credential Manager, Linux Secret Service) as primary. AES-256
             encrypted file in app data directory as fallback on systems
             without keychain support. Keys never stored in plaintext. |
             OS keychain is the industry-standard secure storage for
             credentials on desktop. Encrypted file fallback ensures the
             feature works on all Linux distributions regardless of desktop
             environment. |
             Alternatives: encrypted file only (simpler but lower security
             on platforms with keychain available); plaintext config file
             (rejected — unacceptable security risk).

2026-06-01 | Slide template distribution: templates contributed via PR to
             main repository, reviewed like code, shipped with the app.
             Template structure: template.fwsl + preview.png (1280x720) +
             meta.json. CI validates all templates on every PR. |
             Keeps quality high, avoids separate distribution infrastructure
             for v1, leverages existing PR review workflow. |
             Alternatives: separate template registry with in-app download
             (better for scale but adds infrastructure complexity — defer
             to post-v1); bundled curated set only, no community contribution
             (misses community engagement opportunity — rejected).

2026-06-01 | Phase 1 app shell is built "structure-first": the pnpm workspace,
             tooling, CI, docs, and thin runnable React app placeholders are
             built first; the actual src-tauri Rust backends, the Rust
             toolchain install, and installers are deferred to later Phase 1
             steps / Phase 4 when the windows are built. |
             The Tauri window is itself a Step 3-5 deliverable (Section 9);
             front-loading it adds a heavy system dependency and conflicts with
             "keep the foundation lean" (Section 16). The scaffold still proves
             install/typecheck/lint/test on all platforms. |
             Alternatives: full Tauri+Rust scaffold up front (rejected —
             premature, heavier); no app placeholders (rejected — workspace
             would not run/test).

2026-06-01 | The command palette is custom and dependency-free; the only new
             runtime dependency added for the design system is
             @tabler/icons-react. |
             Full control over design tokens, Tabler outline icons, sentence
             case, and ARIA, and keeps the offline-first OSS suite lean. |
             Alternatives: cmdk / kbar (rejected for v1 — fights the bespoke
             design system and adds dependency surface; revisitable).

2026-06-01 | Writer "Style as a first-class schema node" is implemented as a
             named Style registry ({id,name,properties}) plus a styleId
             attribute on block nodes, rendered to an inline `style` string —
             never a className. Per-block style-assignment UI is Phase 2. |
             Faithful to "styles as named objects, no implicit cascade, no
             className" (Section 2.1, Section 16) and satisfies the post-edit
             hook; ProseMirror has no natural non-content node type for a style
             definition. |
             Alternatives: className-based styling (rejected — the exact pain
             point we fix); a literal styles-container node (rejected — awkward,
             not document content).

2026-06-01 | Performance benchmark gates measure the cost we control, in jsdom
             (Writer: Markdown->doc parse + EditorState.create ~18ms; Sheet:
             visible-window computation + row materialization across a full
             100k-row scroll ~0.017ms/frame). Real in-browser paint/FPS is
             validated once the Tauri window exists. Thresholds (<200ms;
             60fps/16ms) are never weakened. |
             jsdom has no compositor/rAF, so a full view-mount/paint timing
             would gate on jsdom overhead rather than our code; Section 8
             forbids raising thresholds, not measuring the representative,
             code-controlled operation. |
             Alternatives: gate the full jsdom mount (rejected —
             unrepresentative, ~400ms, flaky); a browser-mode benchmark runner
             (deferred until the window exists).

2026-06-01 | OPEN CONCERN — HyperFormula is GPLv3 (dual-licensed; commercial
             otherwise) while the suite is MIT (Section 1). Phase 1 proceeds
             using licenseKey 'gpl-v3'; the tension is recorded in
             docs/architecture/formula-refs.md and REQUIRES a deliberate owner
             decision before public release. |
             HyperFormula (Section 3.1) and MIT (Section 1) are both locked
             decisions, but bundling GPLv3 into an MIT-distributed app is a
             genuine license conflict that must not ship unresolved. |
             Options: accept GPL for the suite; isolate the engine in a separate
             process/package; obtain a commercial HyperFormula license; or
             adopt an MIT-licensed formula engine.

2026-06-01 | The HyperFormula compat table is kept at /docs/formula-compat.md
             (the majority path used in Sections 4, 14, 15). Section 3.3
             references /apps/sheet/docs/formula-compat.md — to be reconciled to
             a single canonical path by the owner. |
             Avoids two competing locations; most CLAUDE.md references agree on
             /docs/formula-compat.md. |
             Alternatives: the /apps/sheet/docs path (deferred to owner).

2026-06-02 | RESOLVES the 2026-06-01 GPL/MIT concern: HyperFormula (GPLv3) is
             removed and replaced by an in-house, dependency-free MIT evaluator
             in /packages/formula-engine (formula.ts + engine.ts). Phase 1 scope:
             arithmetic + SUM/AVERAGE/COUNT, with #DIV/0!/#NAME?/#CYCLE!/#VALUE!
             error codes. The public SheetEngine API is unchanged, so apps/sheet
             needed no changes; the translation layer is engine-agnostic. Sheet
             bundle dropped ~183KB→51KB gzip. |
             Keeps the suite cleanly MIT (Section 1) without a GPL dependency,
             while preserving the Phase 1 feature set. |
             Alternatives considered (and the owner's choice): isolate the engine,
             accept GPL, commercial license — all rejected in favour of an MIT
             engine. Phase 2 breadth via extending the evaluator or formula.js (MIT).

2026-06-02 | RESOLVES the compat-path item: /docs/formula-compat.md is canonical;
             Section 3.3 was updated to reference it (no longer
             /apps/sheet/docs/formula-compat.md). |
             Single source of truth for the compat table. |
             Alternatives: the /apps/sheet/docs path (rejected).

2026-06-02 | Tauri proof for 234 Writer: src-tauri scaffolded (Cargo.toml,
             tauri.conf.json v2 wired to Vite, main.rs/lib.rs, capabilities) and
             @tauri-apps/cli added; `tauri info` confirms the config is detected.
             The native compile/window is DEFERRED — this machine lacks the MSVC
             C++ Build Tools and Rust (confirmed by `tauri info`), and MSVC is a
             multi-GB admin install. |
             Delivers the runnable Tauri integration without a futile build on an
             un-tooled host; the window builds on an MSVC+Rust-equipped machine. |
             Alternatives: install rustup now (rejected — can't link without MSVC).

2026-06-03 | Phase 3 AI sidebar is offline-first: an AiProvider interface in
             /packages/ai-sidebar with a deterministic mockProvider (the default,
             no network) + a local Ollama provider (no API key). Writer features
             (rephrase/summarise/explain/continue) ship inside the docked,
             user-invoked sidebar. Cloud providers (Claude/OpenAI) and §6 API-key
             storage (OS keychain / encrypted file) are DEFERRED to the Tauri
             window — until it exists, no cloud key path ships, so no key is ever
             stored in plaintext (none is stored). |
             The §6 key-storage requirement lives in the Rust/Tauri backend that
             isn't built yet (MSVC absent — see 2026-06-02). Local Ollama needs no
             key and works in the browser dev build now; AI stays optional and
             docked. |
             Alternatives: ship a browser-only cloud key store (rejected —
             can't meet §6 secure-storage / no-plaintext rule without the backend).

2026-06-04 | Tauri build made turnkey for a tooled machine: generated 234 Writer's
             committed icon set (32x32/128x128/icon.ico/icon.icns + Windows
             Square*/StoreLogo) from a placeholder app-icon.png via `tauri icon`
             (a Node command — no Rust), removing the only non-toolchain build
             blocker; added docs/architecture/tauri-build.md (winget prerequisites
             + dev/build commands). The native compile still CANNOT run on this
             machine — Rust + MSVC C++ Build Tools are absent and installing MSVC
             needs admin/UAC, unavailable in this non-interactive, non-admin
             session (re-verified 2026-06-04: rustc/cargo/cl.exe/vswhere all
             MISSING, IsAdmin=False). |
             "Get it onto a machine with MSVC + Rust" can't be done from inside
             this un-tooled host; the next best thing is a turnkey, fully-iconed
             scaffold + an exact runbook so the window builds in a few commands on
             an MSVC+Rust machine. |
             Alternatives: blind winget MSVC install here (rejected — UAC can't be
             answered non-interactively, risks hanging); hand-roll .ico/.icns
             (rejected — `tauri icon` is the idiomatic, correct generator).

2026-06-04 | SUPERSEDES the "native compile CANNOT run here" finding above: the
             toolchain (Rust 1.96 MSVC + Visual Studio 2022 Build Tools/VCTools +
             WebView2) is now installed, so 234 Writer's native window BUILDS and
             RUNS. `tauri dev` launches the hot-reload window (Vite :5173 + debug
             cargo); `tauri build --bundles nsis` produces an optimized
             writer.exe (~8.3 MB) and an NSIS installer
             (234 Writer_0.0.0_x64-setup.exe, ~1.9 MB). The Windows bundle target
             is NSIS, NOT MSI: WiX `light.exe` fails on paths containing spaces/
             special chars (this repo is under `…\OneDrive - Architech\…`), so
             `targets:"all"` aborts at the MSI step. NSIS has no such limitation
             and is the §3.2 Windows deliverable. |
             Proves the Tauri shell end-to-end (the long-deferred window) and
             delivers the §3.2 Windows installer. NSIS is the documented Windows
             target; MSI is a bonus blocked only by the checkout path, not code. |
             Alternatives for MSI: move the checkout to a space-free path (e.g.
             C:\dev\project-234) or build MSI in CI (deferred — NSIS suffices for
             Windows). See docs/architecture/tauri-build.md.

2026-06-04 | 234 Sheet and 234 Slides now have native Tauri shells, mirroring
             Writer's proven src-tauri (Cargo.toml with sheet_lib/slides_lib,
             build.rs, main.rs/lib.rs, capabilities, tauri.conf.json v2, committed
             icon set, tracked Cargo.lock). Each app pins a fixed Vite dev port
             (Writer 5173, Sheet 5174, Slides 5175, strictPort) so its devUrl
             matches under `tauri dev`. All three release-build + bundle an NSIS
             installer (writer/sheet/slides .exe ~8 MB; *_x64-setup.exe ~1.8-1.9
             MB), verified 2026-06-04. |
             Brings the whole suite to native windows + per-app installers,
             de-risking the §3.2 single-installer suite (assembled in Phase 4). |
             Alternatives: distinct per-app icons now (deferred — shared
             placeholder app-icon.png until real branding); one shared cargo
             workspace target dir (rejected — per-app isolation matches §3.2
             "crash in Sheet does not affect Writer").

2026-06-04 | Suite shell (§3.2) built: a 234 Launcher Tauri app (apps/launcher)
             + a single Windows NSIS suite installer. The launcher window lists
             the three apps and opens each as a SEPARATE process via a Rust
             command (`launch_app` → std::process::Command), honouring "three
             isolated processes". Apps are resolved sibling-relative to the
             launcher exe (current_exe parent), so the suite installer
             (installer/234-suite.nsi, built by installer/build-suite.ps1 with
             Tauri's bundled makensis) lays all four self-contained exes into one
             per-user dir (%LOCALAPPDATA%\234 Suite), bootstraps WebView2 once,
             and writes a "234 Suite" Start-menu folder + one uninstall entry.
             Per-app standalone installers remain available. |
             Delivers the §3.2 "single installer + launcher" without a registry
             lookup or extra Rust crate; reuses Tauri's self-contained exes and
             downloaded makensis. Owner chose a real launcher app over a
             Start-menu-only folder. |
             Alternatives: wrapper that silently runs the 3 per-app installers
             (rejected — apps land in separate dirs, forcing a registry lookup);
             Start-menu shortcuts only, no launcher app (rejected by owner);
             hand-rolled launcher path via registry InstallLocation (unneeded
             given the unified layout). macOS/Linux suite installers follow the
             same pattern (deferred — Windows host).

2026-06-04 | RESOLVES the 2026-06-03 cloud/key-storage deferral: cloud AI
             (Claude/OpenAI) + §6 OS-keychain key storage are implemented now that
             the window builds. Design: the API key NEVER enters JS. A shared Rust
             crate packages/ai-backend (app234_ai, path-dep'd by each app's
             src-tauri) exposes Tauri commands ai_set_key / ai_delete_key /
             ai_has_key / ai_cloud_complete; the key is stored in the OS keychain
             (keyring → Windows Credential Manager / macOS Keychain / Linux Secret
             Service) and read only inside Rust, which performs the HTTPS call
             (ureq, native-tls). JS can set/clear/check-presence but cannot read
             the key back. Frontend: createCloudProvider (invoke wrapper),
             keychain.ts bridge, AiSettings cloud options + write-only key manager;
             keys never in localStorage/JS state. Default provider stays offline
             mock; AI stays docked/user-invoked/optional. |
             Most faithful reading of §6 ("never plaintext"; "transmitted only to
             the provider endpoint") and it sidesteps browser CORS — the key lives
             entirely in Rust/keychain. |
             Alternatives: fetch the key into JS + fetch from the webview (rejected
             — weaker, CORS issues); a Tauri secrets plugin (unneeded — keyring is
             the standard). DEFERRED: the §6 AES-256 encrypted-file fallback for
             keychain-less systems (keyring covers mainstream platforms; on
             keychain failure the command errors rather than writing plaintext).
             Cloud round-trip verified by compile + mocked-invoke unit tests; a
             real-key network call is a manual desktop step.

2026-06-05 | Collaboration (Phase 4, §3.1/§9/§17) core built in /packages/collab
             (@234/collab): CollabDoc (Y.Doc + awareness), human session codes
             (generate/parseSessionCode → 234-XXXX-XXXX room id), a CollabTransport
             abstraction with an in-process createMemoryNetwork (relays doc +
             awareness, used for deterministic convergence tests) plus lazily-
             loaded WebSocket (relay) and WebRTC (LAN peer) transports, guarded
             y-indexeddb local persistence, and a minimal ws + y-websocket relay
             (relay/server.mjs — ferries updates per room, stores nothing). All
             deps MIT → suite stays MIT. Apps are untouched (collab stays optional
             and off by default). |
             Delivers the §17 collaboration design as a verifiable, transport-
             agnostic core: 13 tests prove Y.Map/Y.Array/Y.Text convergence,
             offline-then-reconnect, awareness, and room isolation via the memory
             network; the relay boots and listens (smoke-verified). |
             Alternatives: build per-app bindings + UI in this slice (deferred —
             kept the core a clean, fully-testable unit; Sheet/Writer/Slides
             bindings are named follow-up slices in collab.md). Real cross-peer
             WebRTC/relay sync + serverless LAN (mDNS) discovery are manual/future.

2026-06-05 | Sheet collaboration binding + UI (first @234/collab consumer):
             apps/sheet/src/collab/ — bindSheet(engine, doc) mirrors cells to a
             Y.Map ("row,col" → raw text; formulas resolved locally; local edits
             carry a LOCAL txn origin so the observer applies only remote changes;
             emptied cell → delete; seedFromEngine for the host). useSheetCollab
             owns the session (start/join/leave; default WebRTC peer, relay URL →
             WebSocket; transportFactory injectable for tests). CollabPanel is the
             docked Start/Join UI. App centralises writes in commitCell (binding
             when a session is active, else engine) and FormulaBar now passes the
             value up (App owns the write). Cells-only; named-range/column/chart
             sync deferred. |
             Makes collaboration usable in Sheet while keeping it optional/off by
             default; the binding is proven deterministically via the slice-1
             in-memory network (no real network in tests). |
             Alternatives: route every engine.setCell call site individually
             (rejected — one commitCell seam is cleaner). Real two-peer live edit
             (two windows over WebRTC/relay) is a manual step.

2026-06-05 | Writer collaboration (y-prosemirror): apps/writer/src/collab/ —
             writerCollab.ts (collabEditorPlugins = ySyncPlugin/yCursorPlugin/
             yUndoPlugin + shared editing keymaps; seedFragmentFromDoc for the
             host) + useWriterCollab (session lifecycle, exposes the live
             CollabDoc). Editor.tsx reconfigures the view's plugins on enter/leave
             (solo prosemirror-history ⇄ collab y-undo; ySyncPlugin binds the doc
             to a Y.XmlFragment). CollabPanel was PROMOTED to @234/shared (§4 — no
             duplication; Sheet now imports it from shared too). y-prosemirror +
             yjs pinned to match @234/collab so Yjs is a single instance. |
             Extends collaboration to Writer with the richest model (rich text)
             while keeping it optional/off; convergence proven at the Y.XmlFragment
             level via the in-memory network (also the single-yjs dedup canary). |
             Alternatives: a permanent collab plugin slot reconfigured in place
             (rejected — recreating the state on enter/leave is simpler and
             history-correct); keep CollabPanel per-app (rejected — §4 dup). Live
             in-editor cursor presence is wired (yCursorPlugin) but cursor UI
             polish + a real two-peer edit are deferred/manual.

2026-06-05 | Slides collaboration (final app — collab now live in all three):
             apps/slides/src/collab/ — bindDeck(doc, onRemoteChange) maps the deck
             slide-granularly (a Y.Map keyed by slide id → JSON of the Slide + a
             Y.Array of ids for order; LOCAL-origin echo guard; remote detection
             via doc.onUpdate) + useSlidesCollab (session lifecycle). App syncs via
             a single [deck] effect (push) + a guarded remote setDeck — no setDeck
             call site changed. |
             Completes the collaboration workstream while keeping it optional/off;
             convergence proven deterministically (add/edit/reorder/delete +
             late-join seed) via the in-memory network. |
             Alternatives: full object-level nested CRDT within a slide (deferred —
             slide-granular is the pragmatic first cut; within-slide concurrent
             edits are last-write-wins per slide); whole-deck JSON LWW (rejected —
             no cross-slide merge). Object-level CRDT, presence cursors, and a real
             two-peer edit are deferred/manual.

2026-06-05 | RESOLVES the §6 AES-256 encrypted-file fallback deferral (from the
             2026-06-04 cloud-AI entry): packages/ai-backend is now keychain-first
             with an AES-256-GCM encrypted-file fallback for keychain-less systems
             (e.g. headless Linux w/o Secret Service). set/get/delete try the
             keychain and fall back to a JSON map (provider → nonce++ciphertext) in
             the app data dir, encrypted under a key derived from a machine id
             (SHA-256 of machine-uid). Keychain-unavailable is detected via
             NoStorageAccess/PlatformFailure; the public API is unchanged. |
             Honours §6 "never plaintext" on ALL platforms, not just keychain ones,
             without changing the apps. |
             Deps aes-gcm/sha2/machine-uid/dirs (MIT/Apache → suite stays MIT). 3
             cargo unit tests verify it (the crate has no tauri dep, so it runs
             under plain `cargo test`). The lib's standalone Cargo.lock is
             gitignored (the apps' lockfiles govern its build).

2026-06-05 | §12 hooks wired (owner choices: fast pre-commit; session-start-only
             Claude hook). scripts/checks.mjs implements the static §12 content
             rules — ERRORS (block): className in the Writer document schema, raw
             A1 in the formula-engine storage layer (each narrowly targeted at the
             one file it governs); WARNINGS: hardcoded hex in component CSS,
             component .tsx without a sibling .test. .githooks/pre-commit runs
             checks + lint + typecheck (the full test suite + validate:templates
             stay in CI); `prepare` sets core.hooksPath on install. A SessionStart
             hook in .claude/settings.json runs scripts/session-start.mjs (the §12
             reminders + phase; GH issue counts skipped — no remote). docs/
             architecture/hooks.md records what's enforced where. |
             Enforces the rules the project rests on without slowing commits to a
             crawl, and is honest that aria-label / general-className / A1-anywhere
             need AST/review rather than a brittle regex. |
             Alternatives: full §12 pre-commit running the whole test suite
             (rejected by owner — too slow per commit); Claude post-edit + session-
             end hooks (deferred by owner — post-edit rules run via pre-commit/
             `pnpm checks`); benchmark-regression commit gate (needs baselines —
             bench runs via `pnpm bench:*`/CI instead).

2026-06-05 | Slides collab upgraded to OBJECT-LEVEL CRDT (was slide-granular LWW):
             apps/slides/src/collab/bindDeck.ts now maps the deck to nested Yjs —
             order Y.Array<slideId> + slides Y.Map<slideId → slideMap{notes,
             objectOrder Y.Array, objects Y.Map<objId → JSON(object)>}>. Each object
             is its own map entry, so concurrent edits to different objects on the
             same slide MERGE instead of clobbering. The binding's public interface
             (pushDeck/readDeck/seed/destroy) is unchanged → App/useSlidesCollab/
             CollabPanel untouched. |
             Delivers backlog A4 with a contained, verifiable change (one file +
             tests); a new offline-edit-then-reconnect test proves the merge. |
             Alternatives: field-level (per-scalar Y.Map) merge within an object
             (deferred — object is a JSON blob / per-object LWW, a sensible next
             refinement); keep slide-granular (rejected — A4 goal). syncOrder only
             rewrites a Y.Array when its sequence changed, avoiding spurious order
             conflicts when peers leave ordering untouched.

2026-06-06 | Unified the Writer/Slides session hooks (backlog A7): the identical
             useWriterCollab/useSlidesCollab are replaced by a single
             useCollabSession exported from @234/collab (model-free start/join/
             leave + live CollabDoc; WebRTC default, relay URL → WebSocket). The
             collab package gains React as an OPTIONAL peerDependency + a jsdom-
             docblock hook test (its core tests stay node-env). Sheet keeps its own
             useSheetCollab (it also routes setCell through the binding). |
             Removes ~150 lines of duplication; the hook's natural home is the
             collaboration package, not the design system (which stays React-only,
             collab-free besides the dumb CollabPanel). |
             Alternatives: host it in @234/shared (rejected — would make the design
             system depend on a feature lib + yjs); a framework-agnostic
             createCollabSession + per-app useState shim (rejected — more machinery
             than the dup it removes). React peerDep is optional so non-React
             consumers (the relay) are unaffected.

2026-06-06 | Sheet collab breadth (backlog A6): bindSheet now syncs three Y.Maps —
             cells (existing), names (name → "row,col", coords NEVER A1 per §3.4/
             §16) and columnTypes (colIndex → JSON(schema)). Named refs live in the
             engine (remote names → engine.defineName, so a peer resolves
             =SUM(sales)); column types live in App state, so remote changes arrive
             via an onColumnType callback. NameBox now raises onDefineName (App owns
             the write, like FormulaBar); App.setColumnType + name definition route
             through the binding; useSheetCollab takes the columnTypes snapshot +
             onRemoteColumnType and exposes defineName/setColumnType; host seed()
             carries cells + names + column types. |
             Closes the formula-correctness gap (names) + the date-display gap
             (column types) for collaborators. Off by default; proven via the
             in-memory network (a seeded name resolves a formula on the guest;
             column-type change fires the callback). |
             Alternatives: store names as A1 (rejected — §16); move all Sheet
             metadata to an App-owned effect like Slides (rejected — the hook-owned
             binding already exists; threading columnTypes via a ref is contained).
             DEFERRED (A6b): chart sync + Writer style-registry sync (Writer images
             already sync as ProseMirror doc nodes).

2026-06-06 | Collaboration presence (backlog A5): usePresence(doc, self?) in
             @234/collab publishes a {name,color} identity on the doc's awareness
             and returns the other peers; the shared CollabPanel gained an optional
             peers prop and shows a collaborator roster (coloured dot + name) while
             active. All three apps feed usePresence(collab.doc) into CollabPanel
             (Sheet's useSheetCollab gained a `doc` field for this). Because the
             identity is the awareness `user` field, Writer's existing yCursorPlugin
             now renders remote carets with each peer's name + colour for free. |
             Delivers visible presence with a verifiable core (peer convergence +
             roster) while the actual cursor rendering stays browser/manual. |
             Alternatives: per-app location highlights now (deferred to A5b —
             Sheet cell / Slides slide are browser-coupled to verify); host the
             roster data in @234/shared (rejected — CollabPanel takes a structural
             PresencePeerLike, staying decoupled from @234/collab like
             ImportReportLike). Presence colours are identity data in presence.ts
             (a .ts, not component CSS — the §12 hex check only scans .css).

2026-06-06 | Collab breadth completed (backlog A6b): (1) Sheet CHART sync — bindSheet
             gained a `chart` Y.Map (key "value" → JSON(Chart)) + setChart/onChart +
             seed; useSheetCollab threads chart/onRemoteChart; ChartDialog onApply
             mirrors via the binding. (2) Writer STYLE-REGISTRY sync — new
             apps/writer/src/collab/bindStyles.ts (a `styles` Y.Map<styleId →
             JSON(Style)>, observed not the whole doc so text edits don't churn it),
             wired App-side like Slides' deck ([collab.doc] binding effect + host
             seed + a guarded [registry] push effect). Block styleId attrs + images
             already sync as ProseMirror nodes; this carries the Style definitions. |
             A guest now sees the host's chart and renders styled blocks with the
             right properties — collaboration breadth is complete across the suite. |
             Alternatives: observe the whole doc for styles (rejected — every remote
             keystroke would churn the registry; observe the styles map instead);
             a styleOrder array for registry list order (deferred — order is editor
             cosmetic). bindSheet 9 / bindStyles 2 tests; gates held; apps build.

2026-06-08 | Presence location highlights (backlog A5b — the last collab follow-up):
             `usePresence(doc, self?, location?)` now also publishes a per-peer
             location on the awareness (a `PresenceLocation = { cell?; slide? }`
             field, published from a second effect keyed on a JSON key so it fires
             only on a real change). Sheet passes `{ cell: active }` → `Grid` rings a
             collaborator's selected cell (inset box-shadow in the peer colour) + a
             name tag; Slides passes `{ slide: activeIndex }` → `SlidePanel` badges
             that slide with coloured peer dots. Peer colours are dynamic identity
             data via inline `style` (never component-CSS hex). Adding `Grid.test.tsx`
             also cleared the standing §12 "Grid.tsx: no sibling test" warning
             (`pnpm checks` → 0/0). |
             Completes presence (identity + roster + location) so collaborators see
             where each teammate is working; the data layer converges
             deterministically via the in-memory network. |
             Alternatives: a generic `unknown` location (rejected — a typed
             cell/slide shape is clearer and serialises cleanly); render highlights
             from a non-awareness side channel (rejected — awareness already carries
             presence and is relayed by every transport). presence 3 / Grid 2 /
             SlidePanel +1 tests; 60fps + 100-slide gates held; all three apps build.
             The live two-peer visual is a manual step. Remaining collab follow-up:
             registry `styleOrder`; follow-a-peer; field-level merge.

2026-06-08 | Plugin loader (backlog A8 — makes docs/architecture/plugin-api.md
             real): new `@234/plugin-host` (`packages/plugin-host`) ships
             `definePlugin` + a narrow `PluginHost` ({ app, registerCommand,
             registerAiProvider }) + `loadPlugins(plugins, opts)` with id-dedup,
             error isolation (a throwing `setup` is logged + rolled back; others
             load), and full teardown (returned disposer removes the plugin's own
             teardown + all auto-tracked unregisters). The host is
             dependency-inverted — the app injects `registerCommand` (@234/shared)
             + `registerAiProvider` (@234/ai-sidebar), so the package is pure logic
             with type-only `Command`/`AiProvider` imports (node-testable like
             formula-engine). New AI-provider registry in @234/ai-sidebar
             (`providerRegistry.ts`, useSyncExternalStore-friendly) so a
             plugin-registered provider is resolved by `useAiSettings` and listed
             in `AiSettings`' selector. All three apps load a `BUILTIN_PLUGINS`
             list on mount (cleanup = teardown); a shipped `sampleProviderPlugin`
             (offline echo) proves it end-to-end (selectable in each app's sidebar,
             asserted in the App tests). |
             Delivers the §9 Phase-4 plugin API as a real, in-tree loader over the
             two existing seams while honouring §6 (a provider plugin only feeds
             the docked, user-invoked sidebar — no surface of its own) and §16
             (no plaintext secrets; the host stays a narrow capability surface). |
             Alternatives: have plugin-host import the two packages' runtime
             (rejected — pulls React into a node-test pkg; dependency-inversion via
             injected register fns is cleaner); ship an empty BUILTIN list
             (rejected by owner — a shipped sample proves the loader in-app);
             per-app capability injection beyond the two seams (deferred). suite
             stays MIT (no new dep — plugin-host is in-tree). plugin-host 6 /
             ai-sidebar 29 (+3) tests; full suite green; gates held; all apps
             build; `pnpm checks` 0/0. DEFERRED (Phase-4-proper): dynamic/remote
             discovery + sandbox (needs the Tauri backend), an enable/disable
             settings UI, a host key-storage capability for cloud-provider plugins.

2026-06-08 | Docs site (backlog A9 — §9 "Docs site generated from source comments
             and architecture docs"): new dev-only `@234/docs-site`
             (`packages/docs-site`) aggregates the repo's markdown (README,
             CHANGELOG, the docs/ guides + ADRs, CODE_OF_CONDUCT, SECURITY, LICENSE
             — CLAUDE.md intentionally excluded as internal agent context) plus a
             per-package API overview (each `src/index.ts` header comment + exported
             names) into a static, offline HTML site styled with the suite's own
             inlined design tokens (dark by default). Pure, fs-free core in
             `src/site.ts` (marked→HTML, header/exports extraction, intra-repo
             `.md`→`.html` link rewriting, page shell, `buildPages`) is unit-tested
             (13 tests); the eslint-ignored `build.mjs` is the fs glue and writes to
             `dist/site/` (gitignored build artifact). `pnpm docs:build`
             (`tsc -b && node build.mjs`) generated 25 pages (18 docs + 6 packages),
             verified: index, per-doc + per-package pages, exports listed, links
             rewritten, active-nav, tokens + `data-theme="dark"` inlined. |
             Delivers the §9 docs-site deliverable on-brand (in-house Node ESM
             generator like scaffold.mjs/checks.mjs + tested pure helpers like
             validate.ts) and dependency-light — one MIT dep (`marked`) confined to
             a dev package, never in the apps' bundles, so the suite stays MIT and
             the apps stay lean. |
             Alternatives: a heavyweight generator (Docusaurus/VitePress/Starlight —
             rejected, large dep tree, fights the lean ethos); a hand-rolled markdown
             renderer (rejected by owner — fragile across tables/code/nested lists);
             committing the generated site (rejected — build artifact, generator is
             the source of truth). build.mjs imports the compiled `dist/src/site.js`
             directly (its only import is the bare `marked` — avoids Node ESM's
             extensionless-relative-import failure on `index.js`). DEFERRED: full
             per-symbol TypeScript API docs (TypeDoc), search, versioning, a hosted
             deploy/CI publish step. docs-site 13 tests; full suite green; checks 0/0.

2026-06-08 | Native file I/O (backlog B — realises §3.5 "file I/O belongs in Rust"
             for the suite's own .fwtr/.fwsh/.fwsl): new shared Rust crate
             `packages/file-io` (`app234_files`, mirroring `ai-backend`) — OS
             open/save dialogs via `rfd` (MIT — what tauri-plugin-dialog wraps) +
             text read/write via `std::fs`, as plain functions; each app's
             `src-tauri` wraps them in `#[tauri::command]`s (`fs_pick_open`/
             `fs_pick_save`/`fs_read_text`/`fs_write_text`) + `generate_handler!`.
             New JS bridge `@234/desktop` (the twin of `keychain.ts`): `isDesktop()`
             guard, granular pick/read/write + convenience `openTextFile`/
             `saveTextFile`, with a browser fallback (`<input type=file>`/`Blob`) so
             the same File menu works in the web dev build. All three apps gain
             Open/Save (header + palette) wired to their serializers — Sheet writes
             the CSV + the `.fwsh.meta` sidecar (two writes), reads both on open. |
             Owner chose a custom crate over the official Tauri dialog/fs plugins:
             consistent with the established custom-command pattern, the most
             locked-down surface (only the picked path), and a JS bridge unit-tested
             against mocked `invoke`. |
             Alternatives: tauri-plugin-dialog + -fs (rejected — adds plugin deps +
             FS-capability ACL scoping; diverges from the custom-command precedent).
             Verified: `cargo test` (read/write round-trip + missing-file error),
             `cargo check` on the Writer backend (crate + 4 commands link), desktop
             7 unit tests (mocked invoke + web-fallback), Sheet +1 app test; full
             suite green; checks 0/0; suite stays MIT (rfd is MIT). The real OS
             dialog + on-disk open/save is a manual desktop step. DEFERRED: recent
             files, auto-save, file-association/"open with", drag-and-drop open.

2026-06-08 | Cross-platform suite installers + CI release pipeline (backlog B —
             §3.2/§9): the macOS `.dmg` (`installer/build-suite-macos.sh`, via
             `hdiutil`) and Linux `.deb` (`installer/build-suite-linux.sh`, via
             `dpkg-deb`) suite installers now mirror the Windows NSIS suite, and
             the launcher's `launch_app` resolves apps per-OS — Windows/Linux spawn
             the sibling binary (suite co-locates the four in one dir), macOS opens
             the sibling `<Product>.app` via `open` (fallback `open -a` by name),
             keeping "three isolated processes" on every OS. New
             `.github/workflows/release.yml` builds all per-app bundles across a
             Win/macOS/Linux matrix — Windows incl. **MSI** (CI checkout has no
             spaces, so WiX works — the local OneDrive path was the only blocker) —
             plus the three suite scripts, and attaches everything to a GitHub
             Release on a `v*` tag. |
             Completes the §3.2 "single installer per OS + per-app" deliverable and
             resolves the MSI blocker by building where the path is clean. |
             Verified here: `cargo check` on the launcher (the non-macOS dispatch +
             sibling-binary path compile; launcher JS test green). HONEST LIMITATION:
             the macOS launcher branch is `#[cfg]`-ed out (not compiled on this
             Windows host), and the `.dmg`/`.deb` scripts + `release.yml` run only on
             their target OS / in CI — authored to run there (like the dormant
             `ci.yml`), not artifact-verified locally. DEFERRED: code signing /
             notarization / Authenticode, auto-update, a suite-level AppImage
             (per-app AppImages ship via CI), running CI (needs the public remote).

2026-06-08 | Formula breadth (extend the in-house MIT evaluator — Sheet §2): added
             text `TEXTJOIN`/`MID`/`SUBSTITUTE`/`FIND`, dates `WEEKDAY`/`EDATE`/
             `EOMONTH` + clock-backed `TODAY`/`NOW`, multi-branch lazy `IFS`, and the
             multi-criteria `SUMIFS`/`COUNTIFS`/`AVERAGEIFS` family. `evaluateFormula`
             gained an optional `now: () => number` clock (default `Date.now`, so the
             engine's 3-arg calls are unchanged; tests inject a fixed clock for
             determinism); `serialToYmd` now floors (was round) so a fractional `NOW`
             serial maps to its day. `TODAY` is a whole-day serial, `NOW` carries the
             time-of-day fraction. `IFS` short-circuits like `IF` (only the matched
             value is evaluated → no spurious errors). |
             Closes most of the compat table's "planned" list with pure, fully-tested
             engine work; the public `SheetEngine` API is unchanged so apps/sheet
             needs no changes. |
             Alternatives: implementing `NOW` as date-only (rejected — a fractional
             serial is more correct and `serialToYmd` floors cleanly); eager `IFS`
             (rejected — must short-circuit to avoid evaluating erroring branches).
             formula-engine 80 tests (+13); 10k-cell §8 gate still <500ms; 60fps held;
             Sheet builds; `pnpm checks` 0/0. Compat table updated. DEFERRED:
             `NETWORKDAYS` (holidays), dynamic arrays/spill, `XLOOKUP` wildcard modes.

2026-06-08 | Slides collab field-level CRDT merge (the last collab merge gap — the
             A4 follow-up): `bindDeck` now stores each slide object as a nested
             `Y.Map<field → value>` (was one JSON blob), so concurrent edits to
             *different fields of the same object* merge (A drags `x`, B edits
             `fontSize` → both survive) instead of per-object last-write-wins.
             Scalar fields are primitive Y.Map entries; `animations` is a single
             JSON-string field (per-field LWW). Helpers `objToFields`/`fieldsToObj`;
             `pushDeck` sets changed fields + deletes removed ones; `objectOrder`/
             `notes`/`order` unchanged. The binding's public interface
             (pushDeck/readDeck/seed/destroy) is unchanged → App/useSlidesCollab/
             CollabPanel untouched. |
             Completes Slides merge correctness with a contained, verifiable change
             (one file + a field-level offline-reconnect test). |
             Alternatives: field-level merge inside the `animations` array too
             (deferred — array stays a per-field JSON blob); cross-version doc
             migration (rejected — collab docs are ephemeral session state, the
             `.fwsl` file is the source of truth, both peers run one code version).
             Slides 80 tests (+1 field-level merge); 100-slide gate held; Slides
             builds; `pnpm checks` 0/0. Real two-peer is the manual step.

2026-06-09 | Plugin enable/disable UI (completes the A8 plugin story — the §17
             "enable/disable settings UI" follow-up): `@234/plugin-host` gains a
             `localStorage`-backed toggle store (`toggles.ts` — disabled-id set,
             default all-enabled; cached snapshot + subscribe like the command/
             provider registries) + `usePluginManager(allPlugins)` (React hook,
             optional `react` peerDep mirroring `@234/collab`; jsdom-docblock test,
             core stays node-tested). New shared `PluginManager` component
             (structural props, like `CollabPanel`) renders a "Plugins" section in
             the docked AI sidebar (owner-chosen placement). Each app calls
             `usePluginManager(BUILTIN_PLUGINS)` and keys the `loadPlugins` effect on
             `plugins.enabledPlugins`, so toggling tears down + reloads live —
             disabling the sample provider removes it from the AI selector. |
             Gives users control over which in-tree plugins load while keeping the
             loader/host design intact; persisted, docked, user-invoked (§6). |
             Alternatives: a dedicated palette-invoked "Manage plugins" panel
             (rejected by owner — sidebar section is lighter wiring); host the hook
             in @234/shared (rejected — would pull plugin-host's concerns into the
             design system; optional-React-peerDep in plugin-host matches collab).
             plugin-host 11 tests (+5) / shared PluginManager 2 / Writer +1 (toggle
             removes the provider); full suite green; gates held; all apps build;
             `pnpm checks` 0/0. Suite stays MIT (React already used). DEFERRED: a
             host key-storage capability for cloud-provider plugins; dynamic/remote
             discovery + sandbox (Phase-4-proper, needs the Tauri backend).

2026-06-09 | Recent files (native-I/O follow-up): `@234/desktop` gains a persisted,
             per-app recent list (`recents.ts` — localStorage, most-recent-first,
             dedup by path, cap 8; cached snapshot + subscribe) + `useRecentFiles`
             (React hook, optional `react` peerDep mirroring plugin-host/collab) +
             a `baseName` helper. New shared `RecentFiles` panel (structural props,
             like `PluginManager`/`CollabPanel`) — a "Recent" header button / "Open
             recent" palette command. Each app's open callback was refactored to
             `load<App>(path?)` (a `path` re-reads via `readTextFile`, skipping the
             dialog) and records the path on open + save. |
             Lets users re-open a recent document without the dialog while reusing
             the existing serializers + the `@234/desktop` bridge. |
             Recording is **`isDesktop()`-gated** — a web "path" is just a file name
             with no re-readable handle, so the web build keeps an empty list rather
             than a broken re-open (the real re-read is a desktop step). Alternatives:
             a dedicated palette-only surface (rejected — a header button + panel
             matches Open/Save); store recents in each app (rejected — the bridge
             owns file concerns, like plugin-host owns toggles). desktop 12 tests
             (+5: recents + hook) / shared RecentFiles 2 / each app +1 (Recent button
             + empty panel); full suite green; gates held; all apps build; checks
             0/0. Suite stays MIT. DEFERRED: pinned/favourite files, auto-reopen,
             web-build recents (intentionally empty).

2026-06-09 | Writer collab style-list order (the deferred A6b follow-up): `bindStyles`
             now syncs a `styleOrder` `Y.Array<styleId>` alongside the `styles`
             `Y.Map<styleId → JSON(Style)>`, so peers see the StyleEditor list in the
             same order (was `Y.Map` insertion order, which drifts after edits/
             reorders). `pushStyles` `syncOrder`s the array in the existing LOCAL txn
             (rewrite-only-on-change, copied from `bindDeck`); `readStyles` reads in
             `order` then appends any orphans (map order); a second `order.observe`
             fires on a pure reorder (still map+array observers only — never
             `doc.onUpdate`, so remote text edits don't churn the registry). |
             Closes the last collab follow-up; the binding interface
             (pushStyles/readStyles/seed/destroy) is unchanged → the Writer App is
             untouched. |
             Alternatives: per-position CRDT ordering for concurrent reorders
             (deferred — `syncOrder` is last-writer-ish, fine for the common
             one-side-reorders case); `doc.onUpdate` (rejected — would re-fire on
             every remote keystroke). Writer 45 tests (+1 reorder-propagation);
             100-page gate held; Writer builds; `pnpm checks` 0/0. Real two-peer is
             the manual step. **Collaboration follow-ups now: only presence/cursor
             polish + per-position reorder merge remain.**

2026-06-09 | Slides collab animations-array field-level merge: `bindDeck` now
             stores each object's `animations` as a nested `Y.Map<animationId →
             JSON(Animation)>` (was a single JSON-string field), so concurrent
             additions/edits to the *same object's* animation list merge (A adds an
             entrance, B adds an exit → both survive) instead of per-list LWW.
             `objToFields` emits scalars only; `fieldsToObj` reads the nested map;
             `pushDeck` upserts/deletes animations by id and excludes `animations`
             from the scalar-delete loop. The binding interface is unchanged → App
             untouched. |
             The last within-object merge gap closed — Slides now merges at object,
             field, and animation granularity. |
             Alternatives: per-position order CRDT for the animation list (deferred
             — animations read in map insertion order; concurrent reorders are
             last-writer-ish, like slide/object/styleOrder). Slides 82 tests (+1
             animations-merge); 100-slide gate held; Slides builds; `pnpm checks`
             0/0. Real two-peer is the manual step.

2026-06-10 | PUBLISHED + first release shipped: the repo is public at
             github.com/fagbo007/234-suite (renamed from Project-234; description
             + topics set; p1-p3/bug/needs-triage/blocked/good-first-issue labels
             created — the §12 issue counts are live). CI green on all three OSes.
             Release v0.1.0 (tag-driven release.yml) is published with 19 assets:
             per-app NSIS + suite NSIS (Windows), per-app .dmg + suite universal
             .dmg (macOS), per-app .deb/.AppImage + suite .deb (Linux). App
             versions bumped 0.0.0→0.1.0; build-suite.ps1 now honours $env:VERSION
             (was hardcoded 0.0.0 — the sh scripts already read it). Pipeline
             fixes found by the test: release.yml needs `permissions: contents:
             write` (default token is read-only → 403 creating the release), and
             the release-asset globs are extension-restricted (a bare dmg/* glob
             matched four identically-named Tauri helper bundle_dmg.sh files →
             the macOS attach step 404'd after the first upload). |
             Completes the §9 Phase 4 "public, installable" deliverable and proves
             the macOS/Linux suite scripts + the launcher's macOS branch (all ran
             first try in CI). |
             SUPERSEDES the 2026-06-04 "MSI builds in CI — the path was the only
             blocker" claim: WiX light.exe FAILS on the space-free CI checkout
             too (cause unknown — Tauri swallows light's stderr). MSI is disabled
             in release.yml; NSIS is the §3.2 Windows deliverable. Tracked in
             github issue #1 (bug, p2) with debugging steps (--verbose run,
             leading-digit/space productName, ICE validation). NOTE: macos-latest
             is arm64, so the per-app .dmg assets are aarch64-only (Intel macs
             unserved; an x86_64 or true-universal build is a follow-up).

2026-06-10 | RESOLVES both follow-ups from the entry above. (1) MSI root cause
             (closes github issue #1): a temporary verbose dispatch workflow
             surfaced WiX "LGHT0204 ICE39: Bad Type in Summary Information
             Stream for PID_AUTHOR" — with no bundle.publisher, Tauri derives
             the MSI Author from the identifier (app.234.writer → "234"), and a
             purely NUMERIC author is written to the MSI summary stream as an
             integer, failing ICE39 string validation at the light.exe link. The
             path (spaces or not) was never the cause — the project's numeric
             name was; it failed identically everywhere. Fix: explicit
             "publisher": "234 Suite" in all four tauri.conf.json; MSI verified
             green and re-enabled in release.yml (nsis,msi). (2) Intel macs: the
             macOS release leg now builds --target universal-apple-darwin
             (rustup x86_64+aarch64 targets on the arm64 runner — no Intel
             runner needed; GitHub is phasing those out). build-suite-macos.sh
             prefers the triple-nested bundle dir; artifact/release globs
             updated; the suite dmg's "universal" name is now true. Verified by
             a dispatched release.yml run — all three OS legs green (dispatch
             skips the attach step, so the published v0.1.0 was untouched). |
             The Windows deliverable set is now NSIS + MSI and the macOS .dmg
             assets serve both Intel and Apple Silicon — both 2026-06-10
             release-pipeline caveats are gone. |
             Alternatives: macos-13 Intel runner matrix leg (rejected —
             deprecated/being retired); skipping ICE validation for MSI
             (rejected — the publisher fix addresses the cause, not the
             messenger). The next v* tag exercises the full fixed pipeline;
             assets on the existing v0.1.0 release remain aarch64-only/no-MSI.
```

---

*End of CLAUDE.md — root context file for Project 234*

*Last updated: 2026-06-01 (renamed from Forge to Project 234)*  
*All five architecture decisions from the initial planning session are locked.
Section 17 (open questions) has been removed — there are no remaining
unresolved questions blocking Phase 1.*  
*Maintained by: project owner — update this file when any architecture decision changes.*
