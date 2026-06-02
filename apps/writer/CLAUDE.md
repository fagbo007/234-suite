# CLAUDE.md — 234 Writer

> App-specific context for 234 Writer (word processor). Read this together with
> the root `/CLAUDE.md`. The root file is the single source of truth; this file
> adds Writer-specific constraints. Do not deviate from either without raising a
> question first.

Scope owner: **Writer agent** (`/apps/writer`). See root Section 13.

---

## 1. What 234 Writer is

A word processor that replaces Microsoft Word, targeting general consumers.
Built on **ProseMirror** for a structured, schema-first document model. The
guiding principle: the document schema is explicit and inspectable — there is no
hidden style hierarchy and no implicit CSS cascade. This directly fixes Word's
"style corruption" and "image placement chaos" pain points (root Section 2.1).

---

## 2. ProseMirror schema constraints

The ProseMirror schema is the contract for the document model. It must be
defined explicitly and reviewed before editing features are layered on top.

### Required node types (Phase 1)

- `doc` — top-level document node
- `paragraph` — default block
- `heading` — levels h1–h3 only in Phase 1 (attr: `level` ∈ {1, 2, 3})
- `text` — inline text
- `ordered_list`, `bullet_list`, `list_item`
- `Style` — **first-class style node** (see below)

### Required marks (Phase 1)

- `strong` (bold)
- `em` (italic)

> Phase 1 is intentionally minimal. Do **not** add Phase 2 nodes (image block,
> tables, etc.) during Phase 1. See root Section 15 Step 3 and Section 16.

### Styles as first-class schema nodes — non-negotiable

- Styles are **named objects in the document schema**, not CSS classes.
- A `Style` node carries: `id`, `name`, and a `properties` object (typography,
  spacing, etc.). Styles are referenced by `id` from the nodes they apply to.
- There is **no implicit CSS cascade.** A node's appearance is fully determined
  by its explicitly-referenced registered style.
- A visual style editor (create / rename / delete / apply) is a Phase 2
  deliverable, but the schema must support named styles as first-class from
  Phase 1.

This is what fixes Word's "hidden style hierarchy causes spontaneous reflow"
pain point. Do not regress it.

---

## 3. Image block model specification

(Schema must accommodate this; full UI lands in Phase 2 — do not build the
Phase 2 UI during Phase 1.)

- Images are **block-level nodes** in the ProseMirror schema. They are never
  inline floats that reflow on cursor movement.
- Image placement is set through an **explicit anchor picker UI** — the user
  chooses the anchor deliberately. There is **no float-on-drag** behaviour: a
  slight mouse movement must never reposition an image.
- An image node stores an explicit anchor/placement attribute plus its source
  reference; it does not infer position from surrounding text flow.

This fixes Word's "slight mouse movement makes images fly" pain point
(root Section 2.1).

---

## 4. Forbidden patterns

- **No className-based styling.** Never apply visual styling via a `className`
  string. All styling flows through registered `Style` schema nodes. The
  post-edit hook (root Section 12) blocks any style applied via a `className`
  without a corresponding registered `Style` schema node, raising:
  `"Style violation: all styles must be registered schema nodes"`.
- **No float-on-drag image handling.** Images are block nodes with an explicit
  anchor picker. Dragging must never reflow or "fly" an image.
- **No hardcoded hex colours** in component styles — CSS custom properties only
  (root Section 5).
- **No Phase 2 features during Phase 1** (root Section 16).

---

## 5. Native file format

- Extension: **`.fwtr`**
- Format: **Markdown-based with YAML front matter** for metadata and styles.
- Must be human-readable, git-diffable, and readable without the app installed
  (root Section 7).

---

## 6. Performance benchmarks (gates — root Section 8)

| Benchmark | Target | Phase gate |
|---|---|---|
| Render 100-page document (no media) | < 200ms | Phase 1 |
| Scroll through 100 pages | 60fps | Phase 1 |
| Memory: 100-page doc | < 200MB | Phase 3 |

Never raise a threshold to pass — fix the performance issue (root Section 16).

---

## 7. Commands

```bash
pnpm test:writer     # unit / integration tests (Vitest)
pnpm bench:writer    # performance benchmarks (must pass Phase 1 gates)
```

Every new component needs a corresponding `.test.ts` / `.test.tsx` (post-edit
hook warning otherwise — root Section 12).

---

## 8. Phase 1 deliverables (root Section 9 / Section 15 Step 3)

- [ ] Tauri window, React shell
- [ ] ProseMirror editor: bold, italic, headings h1–h3, ordered + unordered lists
- [ ] `Style` schema node (id, name, properties) — no className-based styling
- [ ] Save/load `.fwtr` (Markdown + YAML front matter)
- [ ] 100-page render benchmark passing before moving on
