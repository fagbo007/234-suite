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

1. **Tauri windows + Rust backends** for each app (Rust toolchain not yet
   installed). "Tauri window, React shell" is itself a Step 3–5 deliverable.
2. **Suite launcher** binary launching the three isolated processes, and the
   per-platform installers (the latter are Phase 4).
3. **CI execution on a GitHub remote** — the 3-platform matrix
   (`.github/workflows/ci.yml`) is written and the commands it runs are green
   locally, but no remote exists yet, so it has not actually run on
   Windows/macOS/Linux.
4. **In-browser/native validation** of the full render, 60fps scroll, and
   real-time canvas drag (the parts jsdom cannot measure).

## 5. Open decisions for the owner (carried forward)

- ⚠️ **HyperFormula is GPLv3 vs the suite's MIT license** — needs a deliberate
  decision (accept GPL / isolate the engine / commercial license / MIT engine).
  See `docs/architecture/formula-refs.md` §6 and the Section 17 log.
- **`formula-compat.md` path** — reconcile §3.3 (`/apps/sheet/docs/...`) vs
  §4/§14/§15 (`/docs/...`) to one canonical location.

## 6. Verdict

**Phase 1 foundation: COMPLETE and verified at the web/model layer.** Full Phase
1 sign-off is gated on the deferred native-runtime work in §4, which is the
natural next body of work (install Rust/Tauri, wrap each app in a window, wire
the launcher, and run CI on a remote). Recommend resolving the §5 decisions
before or alongside that work.
