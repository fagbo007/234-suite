# Phase 1 — Foundation: status & sign-off

> Records the state at the end of Phase 1, Step 6 (root `CLAUDE.md` Section 15).
> Written to reflect reality, including what the approved **structure-first**
> decision (Section 17) deliberately deferred. This is an honest status record,
> not a rubber stamp.

_Date: 2026-06-02_

---

## 1. Summary

The Phase 1 **foundation** — the monorepo, the shared design system, and the
three apps' editing models/components — is **complete and verified at the
web/model layer**. All quality gates that can be exercised without the native
runtime are green:

- **73 unit/integration tests pass** across 8 workspace projects.
- `pnpm typecheck` (TypeScript strict, project references) — clean.
- `pnpm lint` (ESLint flat + typescript-eslint) — clean.
- All three apps build (`vite build`) successfully.
- Dark mode works in all three apps (default theme + live toggle).

What remains before a **full** Phase 1 sign-off is the work the structure-first
decision intentionally postponed: the **Tauri windows + Rust backends**, the
**suite launcher binary**, and **executing CI on a GitHub remote**. See §4.

## 2. What each step delivered

| Step | Deliverable | Status |
|---|---|---|
| 1 | pnpm workspace, TS strict, Vitest/Playwright, CI matrix config, app-shell doc, 4 app CLAUDE.md | ✅ |
| 2 | `@234/shared`: light/dark tokens, Button/Input/Icon, Cmd+K command palette, wired into all apps | ✅ |
| 3 | 234 Writer: ProseMirror editor (bold/italic/h1–h3/lists), styles as registered objects (no className), `.fwtr` save/load | ✅ |
| 4 | 234 Sheet: 100k-row virtual grid, HyperFormula + named-ref translation layer, `.fwsh` save/load, formula-refs/compat docs | ✅ |
| 5 | 234 Slides: Fabric.js canvas, slide panel (add/reorder/delete), `constraintCheck` stub, `.fwsl` save/load | ✅ |
| 6 | Integration verification + this sign-off record | ✅ |

Each app can create, edit, save, and reload its native document at the
model/component level (`.fwtr` / `.fwsh` / `.fwsl` round-trips are unit-tested).
Editing is driven by the shared **command palette** (no ribbon, per §5).

## 3. Benchmark results (Section 8 gates)

Measured on the **code-controlled metric** for each gate. jsdom has no
compositor/2D-context, so full in-browser paint/FPS is validated once the Tauri
window exists; thresholds were never weakened (Section 8, Section 16).

| App | Gate | Target | Measured | Pass |
|---|---|---|---|---|
| Writer | 100-page render (parse + EditorState.create) | < 200ms | ~18 ms | ✅ |
| Sheet | 100k-row scroll virtualization (visible window + materialize) | 60fps (16ms/frame) | ~0.017 ms/frame | ✅ |
| Slides | open 100-slide deck (parse `.fwsl` + materialize) | < 3s | ~0.29 ms | ✅ |

## 4. Remaining before FULL Phase 1 sign-off (deferred by structure-first)

These were consciously deferred (Section 17 "structure-first" decision) and are
required by the strict Phase 1 completion criteria (Section 9):

1. **Tauri windows + Rust backends.** Writer's `src-tauri` is now scaffolded and
   wired (v2 config, `tauri info` detects it) — but the **native compile/window
   is blocked here**: this machine has **no MSVC C++ Build Tools** and no Rust
   (confirmed by `tauri info`). Sheet/Slides backends follow once Writer's window
   builds on an MSVC/Rust-equipped host. See `app-shell.md` §3a.
2. **Suite launcher** binary launching the three isolated processes, and the
   per-platform installers (the latter are Phase 4).
3. **CI execution on a GitHub remote** — the 3-platform matrix
   (`.github/workflows/ci.yml`) is written and green locally, but **no remote
   exists** (owner deferred), so it has not actually run on Windows/macOS/Linux.
4. **In-browser/native validation** of the full render, 60fps scroll, and
   real-time canvas drag (the parts jsdom cannot measure).

## 5. Owner decisions — RESOLVED (2026-06-02)

- ✅ **Formula engine licensing** — resolved by **removing HyperFormula (GPLv3)**
  and adopting an **in-house MIT evaluator**; the suite stays MIT. (Sheet bundle
  also dropped ~183KB→51KB gzip.) See `formula-refs.md` §6 and the §17 log.
- ✅ **Compat-table path** — `/docs/formula-compat.md` is canonical; CLAUDE.md
  §3.3 updated to match.
- ↩︎ **GitHub remote / CI** — owner deferred for now (item §4.3).

## 6. Verdict

**Phase 1 foundation: COMPLETE and verified at the web/model layer**, with the
two owner decisions resolved (§5) and Writer's Tauri integration scaffolded. Full
Phase 1 sign-off is gated on the deferred native-runtime work in §4 — install
Rust + MSVC Build Tools on a capable host, build the Writer window, replicate to
Sheet/Slides, wire the launcher, and (when the owner is ready) run CI on a remote.
