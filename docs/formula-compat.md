# 234 Sheet — formula support table

> Canonical compat table (root `CLAUDE.md` §3.3, §4, §14, §15). 234 Sheet uses an
> **in-house, MIT-licensed evaluator** (`/packages/formula-engine`), not
> HyperFormula. Phase 1 supports a deliberately small set; broader coverage is a
> Phase 2 concern (extend the evaluator or adopt formula.js, MIT).
> **Do not implement a missing function by guessing** — the evaluator returns an
> Excel-style error code and the UI surfaces it; track planned functions here.

---

## How to read this table

- **Supported** — implemented by the evaluator and exposed in 234 Sheet.
- **Planned (Phase 2+)** — not yet implemented; the evaluator returns `#NAME?`
  (unknown function) and the UI shows a clear "not supported yet" message.

## Phase 1 supported set

| Feature | Status | Notes |
|---|---|---|
| Arithmetic `+ - * / ^`, parens, unary minus | Supported | Core Phase 1 |
| `SUM` | Supported | Ranges + arguments |
| `AVERAGE` | Supported | Ignores empty cells |
| `COUNT` | Supported | Counts numeric values |
| Cell / range references | Supported | Stored as named refs / coordinates; A1 display-only (see `formula-refs.md`) |
| Error codes | Supported | `#DIV/0!`, `#NAME?` (unknown fn), `#CYCLE!`, `#VALUE!`, `#ERROR!` |

## Planned functions (Phase 2+)

| Function group | 234 Sheet phase |
|---|---|
| `SUMIF`, `COUNTIF`, `AVERAGEIF` | Phase 2+ |
| `IF`, `AND`, `OR`, `NOT` | Phase 2+ |
| `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH`, `XLOOKUP` | Phase 2+ |
| `CONCATENATE`, `CONCAT`, `TEXTJOIN` | Phase 2+ |
| `DATE`, `TODAY`, `NOW`, `DATEDIF` | Phase 2+ (with explicit date columns — no coercion, §2.2) |
| Dynamic arrays / spill (`FILTER`, `SORT`, `UNIQUE`) | Phase 2+ |

## Maintenance

- A function is "supported" only once implemented in `formula.ts` **and** covered
  by a test. Until then it stays in the planned list and returns `#NAME?`.
- When a function is unsupported, the formula bar / dialogs must show a clear
  message — never evaluate a guess (root §3.3).
- Phase 2 may add `formula.js` (MIT) for breadth; update this table when it lands.
