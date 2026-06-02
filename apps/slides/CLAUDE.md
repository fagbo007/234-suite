# CLAUDE.md — 234 Slides

> App-specific context for 234 Slides (presentation tool). Read this together
> with the root `/CLAUDE.md`. The root file is the single source of truth; this
> file adds Slides-specific constraints. Do not deviate from either without
> raising a question first.

Scope owner: **Slides agent** (`/apps/slides`). See root Section 13.

---

## 1. What 234 Slides is

A presentation tool that replaces Microsoft PowerPoint, targeting general
consumers. Built on **Fabric.js** for a precise, pixel-perfect object model. The
guiding principle: it should be **hard to produce an ugly slide by default** —
the auto-layout engine and design guardrails do the heavy lifting. This fixes
PowerPoint's documented pain points (root Section 2.3).

---

## 2. Fabric.js canvas model specification

- Each slide is a **Fabric.js canvas** with a precise object model
  (text objects, shapes, images). Objects have explicit coordinates and
  dimensions — no ambiguous placement.
- Phase 1 object types: **text object, rectangle, image.** Keep it minimal; do
  not add Phase 2 object types or effects during Phase 1 (root Section 16).
- Fabric.js gives pixel-perfect layout and good SVG interop — preserve that
  precision; do not introduce approximate positioning.
- Slide panel operations in Phase 1: **add, reorder, delete** slides.

---

## 3. Auto-layout engine requirement — non-negotiable

- **Every object placement triggers a constraint check.** Placing or moving an
  object runs `constraintCheck(objects)` to enforce visual hierarchy, spacing,
  and alignment.
- **Phase 1:** `constraintCheck(objects)` is a **stub that returns `true`.** The
  real constraint logic (spacing grid, smart alignment snapping, design
  guardrails) is a **Phase 2** deliverable. Wire the call site in Phase 1; do
  not implement the real logic yet (root Section 15 Step 5, Section 16).
- The engine's purpose: enforce visual hierarchy so default output looks modern,
  not dated — fixing the "design floor is low" and "manual pixel-pushing" pain
  points.

---

## 4. Template contribution format

Templates are contributed via **pull request to the main repo, reviewed like
code, and shipped with the app** (root Section 10). Full validation-script spec
must be recorded in `/apps/slides/docs/template-format.md` **before Phase 2
template work begins.**

### File structure

```
/apps/slides/templates/
└── <template-name>/
    ├── template.fwsl     ← slide template in native format
    ├── preview.png       ← exactly 1280×720 PNG preview
    └── meta.json         ← name, author, tags (array), description, license
```

### Validation requirements (CI runs on every PR touching templates)

- `template.fwsl` parses without errors
- `preview.png` is **exactly 1280×720**
- `meta.json` includes: `name`, `author`, `tags` (array), `description`,
  `license` (**must be MIT or CC0**)
- Auto-layout engine flags **no** constraint violations on the template slides

A minimum of **10 templates** is a Phase 2 deliverable. Do not author the
template library during Phase 1.

---

## 5. Animation API constraints

- v1 animation model is **simplified: entrance, emphasis, exit only** — three
  categories per object. This fixes PowerPoint's "advanced animations require a
  steep learning curve" pain point.
- An advanced panel for power users may layer on top, but the core model never
  exposes more than these three categories in v1.
- Animations are a **Phase 2** deliverable — do not build them during Phase 1.

---

## 6. Native file format

- Extension: **`.fwsl`**
- Format: **JSON document model**, assets stored as base64 or referenced paths.
- Must be human-readable, git-diffable, and readable without the app installed
  (root Section 7).

---

## 7. Performance benchmarks (gates — root Section 8)

| Benchmark | Target | Phase gate |
|---|---|---|
| Open 100-slide deck with images | < 3s | Phase 1 |
| Real-time object drag on canvas | 60fps | Phase 1 |

Never raise a threshold to pass — fix the performance issue (root Section 16).

---

## 8. Commands

```bash
pnpm test:slides     # unit / integration tests (Vitest)
pnpm bench:slides    # performance benchmarks (must pass Phase 1 gates)
```

Every new component needs a corresponding `.test.ts` / `.test.tsx` (post-edit
hook warning otherwise — root Section 12).

---

## 9. Phase 1 deliverables (root Section 9 / Section 15 Step 5)

- [ ] Fabric.js canvas in Tauri window
- [ ] Add text object, add rectangle, add image
- [ ] Slide panel: add, reorder, delete
- [ ] `constraintCheck(objects)` stub — returns `true` in Phase 1, real logic Phase 2
- [ ] Save/load `.fwsl` (JSON)
- [ ] 100-slide open benchmark passing before moving on
