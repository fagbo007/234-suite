# Accessibility audit (Phase 2)

Records the Phase 2 accessibility sweep (root CLAUDE.md §5, §12). Goal: **every
interactive element is keyboard-navigable**, has a visible focus state, and
carries an accessible name. Re-run this checklist whenever a new interactive
component lands.

## Checklist (root §5 / §12)

- [x] **Visible focus on every interactive element.** Components use
      `:focus-visible { outline: 2px solid var(--color-focus-ring) }`. No
      interactive element ships `outline: none` without an equivalent indicator.
- [x] **Accessible names.** Every icon-only control has an `aria-label`; inputs
      have an associated label or `aria-label`.
- [x] **Keyboard operability.** Dialogs, panels, the command palette, and the AI
      sidebar are reachable and operable by keyboard.
- [x] **Sentence case** for all UI text; **no hardcoded hex** (tokens only) — so
      colour contrast is defined once per theme and consistent in light + dark.

## `outline: none` audit

One match in the codebase: `apps/writer/src/editor/Editor.module.css`
`.ProseMirror { outline: none }`. **Compliant** — it is immediately paired with
`.ProseMirror:focus-visible { outline: 2px solid var(--color-focus-ring);
outline-offset: 4px }`, i.e. a visible focus indicator replaces the default
(satisfies §5: never `outline: none` without an equivalent).

## Per-surface findings

| Surface | Keyboard / a11y notes | Status |
|---|---|---|
| **Command palette** (`@234/shared`) | `role="dialog"`/`aria-modal`; combobox + listbox; ArrowUp/Down move, Enter runs, Esc closes; focus moves to input on open, restores on close. Covered by `CommandPalette.test.tsx`. | ✓ |
| **Button / Input / Icon** (`@234/shared`) | Token focus ring; `Input` requires a label or `aria-label`; `Icon` sets `aria-label`+`role="img"` when named, else `aria-hidden`. | ✓ |
| **Keyboard shortcuts** (`@234/shared`) | `useShortcuts` matches only modifier combos — plain typing is never hijacked (`shortcuts.test.ts`). Cross-platform Mod (Cmd/Ctrl). | ✓ |
| **AI sidebar** (`@234/ai-sidebar`) | `role="complementary"`, labelled; close button has `aria-label`; user-invoked, docked (not a focus-trapping overlay). | ✓ |
| **Writer** — StyleEditor / FindReplace / ImagePanel / Editor | Labelled regions/inputs; icon controls labelled; editor focus ring (see above). | ✓ |
| **Sheet** — Grid / FormulaBar / FormulaInput / NameBox / dialogs / ChartView | Grid uses `role="grid"`/`row`/`columnheader`/`gridcell` with per-cell `aria-label` + `aria-selected`; inputs labelled; autocomplete is an accessible listbox; charts are `role="img"` with an accessible title. | ✓ |
| **Slides** — SlidePanel / SlideCanvas / AnimationPanel / NotesPanel / PresenterMode | Icon buttons labelled; canvas labelled; selects/textarea labelled; presenter is a labelled `dialog` with keyboard nav (←/→/Space/Esc) and a `role="status"` counter. | ✓ |

## Conclusion

No outstanding gaps found in the Phase 2 surfaces. Accessibility is enforced
going forward by the post-edit hook (root §12: warns on missing `aria-label`
and on hardcoded hex) and by the per-component `.test` requirement. Automated
axe-style scans are intentionally deferred (the suite stays dependency-free);
keyboard operability is covered by targeted component tests instead.
