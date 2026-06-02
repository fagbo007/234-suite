# HyperFormula compatibility table

> Required by root `CLAUDE.md` Section 3.3: built in Phase 1 **before any formula
> feature work**. HyperFormula implements ~90% of Excel functions but not all.
> **Do not implement a missing function by guessing** — surface it in the UI as
> unsupported with a clear message, and track it here.

> Path note: root §3.3 references `/apps/sheet/docs/formula-compat.md` while §4,
> §14, and §15 reference `/docs/formula-compat.md`. This file uses the
> majority path. Confirm the canonical location with the owner and keep one.

---

## How to read this table

- **Supported** — implemented by HyperFormula and exposed in 234 Sheet.
- **Supported (Phase 2+)** — HyperFormula supports it; UI not surfaced yet.
- **Unsupported** — not implemented by HyperFormula; the UI must show a clear
  "function not supported" error rather than silently returning a wrong value.

## Phase 1 supported set

| Feature | Status | Notes |
|---|---|---|
| Arithmetic `+ - * / ^` | Supported | Core Phase 1 |
| `SUM` | Supported | Core Phase 1 |
| `AVERAGE` | Supported | Core Phase 1 |
| `COUNT` | Supported | Core Phase 1 |
| Cell/range references | Supported | Stored as named refs / coordinates; A1 display-only (see `formula-refs.md`) |

## Common functions — support status (starter; extend as features land)

| Function | HyperFormula | 234 Sheet phase |
|---|---|---|
| `SUMIF`, `COUNTIF`, `AVERAGEIF` | Supported | Phase 2+ |
| `IF`, `AND`, `OR`, `NOT` | Supported | Phase 2+ |
| `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH` | Supported | Phase 2+ |
| `XLOOKUP` | **Unsupported** | Show unsupported message |
| `CONCATENATE`, `CONCAT`, `TEXTJOIN` | Supported | Phase 2+ |
| `DATE`, `TODAY`, `NOW`, `DATEDIF` | Supported | Phase 2+ (with explicit date columns — no coercion, §2.2) |
| `LET`, `LAMBDA` | **Unsupported** | Show unsupported message |
| `DYNAMIC ARRAYS` / spill (`FILTER`, `SORT`, `UNIQUE`) | Partial / version-dependent | Verify against installed HyperFormula version before exposing |

## Maintenance

- Verify each function against the **installed** HyperFormula version (its support
  matrix changes between releases) before exposing it in the UI.
- When marking a function unsupported, the formula bar / dialogs must show:
  *"This function isn't supported yet."* — never evaluate a guess.
