# Formula reference translation layer

> Architecture record for 234 Sheet's named-reference system. Required by root
> `CLAUDE.md` Section 3.4 **before any Sheet formula work**. Lives in
> `/packages/formula-engine`.

---

## 1. Problem

Excel stores formula references as A1 coordinates (`=SUM(B2:B10)`). Inserting a
row or column silently shifts what those coordinates mean, breaking formulas —
the documented pain point we set out to fix (root §2.2). HyperFormula, our
evaluation engine, also uses A1 internally.

## 2. Decision

References are **named by default** and stored as **structured coordinates**, not
A1 strings. A1 is permitted but is a **display-layer** concern only, and entering
it surfaces a lint warning. HyperFormula's A1 model is hidden behind this layer.

```
 storage / model           translation layer            evaluation
 ────────────────          ─────────────────            ──────────
 named refs  ─┐                                         ┌─ HyperFormula
 {sheet,row,col}├─► resolve name → {sheet,row,col} ─► A1 ┤   (A1 internal)
 (never A1)   ─┘     (registry; shifts on insert)        └─ getCellValue
                                  │
                                  └─► display: A1 shown only with a lint warning
```

### Hard rules (enforced by the §12 post-edit hook)
- The storage / translation layer **never stores raw A1 notation.** References
  are `{ sheet, row, col }` coordinates or names.
- A1 strings are produced **transiently** only (a) at the HyperFormula evaluation
  boundary and (b) for display.
- User-entered A1 surfaces the warning:
  *"Consider using a named reference for better stability."*

## 3. Components (`/packages/formula-engine`)

| Module | Responsibility |
|---|---|
| `a1.ts` | Pure conversions: `colToLabel`/`labelToCol` (0↔A, 26↔AA), `cellToA1`, `a1ToCell`, `isA1Reference`, `findA1References`. No state. |
| `namedRefs.ts` | `NamedReferenceRegistry`: `name → {sheet,row,col}`. `register/resolve/rename/remove/getName`. **`onInsertRows`/`onInsertColumns` shift stored coordinates** so named refs stay stable across structural edits. |
| `lint.ts` | `lintFormula(formula)` — flags raw A1 with the warning above. |
| `engine.ts` | `SheetEngine` — thin HyperFormula wrapper for evaluation. |

## 4. Structural stability

When a row/column is inserted at index *i*, the registry increments the `row`
(or `col`) of every stored coordinate at or after *i*. Named references
therefore keep pointing at the same logical cell — this is the whole point.
A1 references are **not** rewritten by us (they are display-only), which is
exactly why named refs are encouraged.

## 5. Phase status

- **Phase 1 (this step):** scaffold — registry + A1 utilities + lint + a basic
  HyperFormula wrapper (arithmetic, SUM/AVERAGE/COUNT). Tested in isolation.
- **Phase 2:** fully wire the layer into the grid/formula-bar UX; autocomplete
  suggests names first in every dialog; column/row insert preserves all named
  refs end-to-end.

## 6. ⚠️ HyperFormula licensing (open concern — needs owner review)

HyperFormula is **GPLv3** (dual-licensed; commercial otherwise). The suite is
**MIT** (root §1). Bundling GPLv3 code into an MIT-distributed application is a
real license tension. Both the engine choice and MIT are *locked* decisions in
CLAUDE.md, so Phase 1 proceeds using the open-source `licenseKey: 'gpl-v3'`.
**This should be reviewed deliberately by the project owner** — options include
accepting GPL for the suite, isolating the engine, negotiating a commercial
HyperFormula license, or selecting an MIT-licensed formula engine.
