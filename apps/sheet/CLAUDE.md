# CLAUDE.md — 234 Sheet

> App-specific context for 234 Sheet (spreadsheet). Read this together with the
> root `/CLAUDE.md`. The root file is the single source of truth; this file adds
> Sheet-specific constraints. Do not deviate from either without raising a
> question first.

Scope owner: **Sheet agent** (`/apps/sheet`). See root Section 13.

---

## 1. What 234 Sheet is

A spreadsheet that replaces Microsoft Excel, targeting general consumers. Built
on an **in-house, MIT-licensed formula evaluator** (`/packages/formula-engine`).
The guiding principles: references survive structural edits, data is never
silently coerced, and formula help is available in every input context. These
directly fix Excel's documented pain points (root Section 2.2).

> The engine was HyperFormula until 2026-06-02; it was swapped for an in-house
> MIT evaluator to keep the suite MIT (HyperFormula is GPLv3). See CLAUDE.md §17.

---

## 2. Formula engine specification

- The MIT evaluator (`formula.ts`) covers Phase 1: arithmetic + `SUM` /
  `AVERAGE` / `COUNT`, with Excel-style error codes (`#DIV/0!`, `#NAME?`,
  `#CYCLE!`, `#VALUE!`, `#ERROR!`).
- It uses **A1 notation only at its evaluation boundary.** That A1 model
  **must stay hidden behind the translation layer** (see Section 3). The rest of
  the app and the storage layer never see raw A1.
- Per the Tauri/Electron trade-off (root Section 3.5), CPU-intensive evaluation
  belongs in the Rust backend. Ask before adding a Node.js subprocess that
  could be handled in Rust.
- **Do not implement missing functions by guessing.** Before adding any formula
  feature, check the compat table (see Section 7). Unsupported functions return
  `#NAME?` and must be surfaced in the UI clearly — never silently approximated.
  Broader coverage in Phase 2 comes via extending the evaluator or formula.js (MIT).

### Phase 1 scope

Basic arithmetic and `SUM` / `AVERAGE` / `COUNT` only. The translation layer is
**scaffolded** in Phase 1; it is fully wired in Phase 2. Do not build Phase 2
formula features (full autocomplete, charting, date schema UI) during Phase 1
(root Section 16).

---

## 3. Translation layer rules — non-negotiable

The named-reference translation layer lives in **`/packages/formula-engine`**.
Its architecture must be recorded in `/docs/architecture/formula-refs.md` before
any Sheet formula work begins (root Section 3.4).

- **Named references are the default and encouraged path.** Autocomplete always
  suggests names first.
- The layer stores a `name → {sheet, row, col}` registry. When a column or row
  is inserted, the registry updates coordinates automatically — named refs are
  therefore **structurally stable.** This fixes Excel's "inserting a column
  breaks formula references silently" pain point.
- **A1 notation is permitted but display-layer only.** When a user enters an A1
  ref, surface a lint warning in the formula bar:
  *"Consider using a named reference for better stability."*
- **Never store raw A1 notation** in the formula storage or translation layer.
  Storage uses named references or UUIDs. The post-edit hook (root Section 12)
  blocks any raw A1 in the storage layer, raising:
  `"Formula ref violation: storage layer must use named references or UUIDs.
  A1 notation is only permitted in the display layer with a lint warning."`

> Mental model: **named/UUID in storage → translate → A1 only at the
> HyperFormula boundary → A1 shown to user only with a lint warning.**

---

## 4. Date column schema specification

- **No automatic type coercion.** Data is never silently mutated. This fixes
  Excel's "date auto-coercion mutates data silently" pain point.
- Dates require an **explicit date column declaration.** A column is declared as
  a date column in the schema; only then are its values treated as dates.
- The **date format is locked to the column schema.** Values in a non-date
  column are never auto-interpreted as dates.
- Column type lives in the `.fwsh.meta` sidecar schema (see Section 5).

(Full date column declaration UI is a Phase 2 deliverable — root Section 9.)

---

## 5. Native file format

- Extension: **`.fwsh`**
- Format: **CSV** with a sidecar **`.fwsh.meta` JSON** holding schema, column
  types, and named ranges.
- Must be human-readable, git-diffable, and readable without the app installed
  (root Section 7).

---

## 6. Autocomplete requirement — all dialog input contexts

Formula autocomplete and preview are required in **every** input context, not
just the formula bar. This fixes Excel's "no autocomplete in dialogs" and
"conditional formatting dialog has no formula helper" pain points. Contexts:

- Formula bar
- Conditional formatting dialog
- Data validation dialog
- Chart data dialog

Autocomplete always suggests **named references first** (Section 3).

(Full autocomplete across all dialogs is a Phase 2 deliverable — root Section 9.
Do not build it during Phase 1.)

---

## 7. Formula support table — required reading before formula work

The formula support table is the canonical **`/docs/formula-compat.md`** (root
Section 3.3, Section 4, Section 15 Step 4).

Before adding any formula feature, consult this table. Functions the evaluator
does not implement return `#NAME?` and are surfaced in the UI as unsupported —
never implemented by guessing (root Section 3.3).

External-reference / ghost-link auditing (surfacing external refs in the
inspector panel) is a Phase 2 deliverable.

---

## 8. Performance benchmarks (gates — root Section 8)

| Benchmark | Target | Phase gate |
|---|---|---|
| Scroll 100,000-row sheet | 60fps | Phase 1 |
| Evaluate 10,000 formula cells | < 500ms | Phase 2 |
| Memory: 100k rows | < 500MB | Phase 3 |

Never raise a threshold to pass — fix the performance issue (root Section 16).

---

## 9. Commands

```bash
pnpm test:sheet      # unit / integration tests (Vitest)
pnpm bench:sheet     # performance benchmarks (must pass Phase 1 gates)
```

Every new component needs a corresponding `.test.ts` / `.test.tsx` (post-edit
hook warning otherwise — root Section 12).

---

## 10. Phase 1 deliverables (root Section 9 / Section 15 Step 4)

- [ ] Virtual grid: 100k rows, 60fps scroll (canvas or windowed DOM)
- [ ] HyperFormula wired to grid cell model
- [ ] Translation layer scaffold in `/packages/formula-engine`:
      `name → {sheet, row, col}` registry + A1 conversion utilities
- [ ] Formula compat table at `/docs/formula-compat.md`
- [ ] Save/load `.fwsh` (CSV + sidecar meta JSON)
- [ ] 100k-row scroll benchmark passing before moving on
