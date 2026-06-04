# Contributing to Project 234

Thanks for helping build an open, offline-first office suite. This guide gets
you set up and explains the rules every change must follow.

> **`CLAUDE.md` (root + per-app) is the single source of truth.** This guide
> links to it rather than restating it — when in doubt, that file wins. Raise a
> question before deviating from any decision recorded there.

## Prerequisites

- **Node 20+** (Node 24 recommended) with **corepack** (bundled with Node).
- **pnpm** via corepack — no separate install needed.
- Git. (The Tauri/Rust desktop build additionally needs Rust + platform C/C++
  build tools; the web dev build and the whole test suite run without them.)

## Setup

```bash
corepack enable            # one-time; on Windows may need an admin shell
pnpm install               # install workspace dependencies
```

If `corepack enable` can't write the global shim, use `corepack pnpm install`.

## The dev loop

| Command | What it does |
|---|---|
| `pnpm typecheck` | TypeScript strict build across all packages (`tsc -b`) |
| `pnpm lint` | ESLint (flat config, typescript-eslint) |
| `pnpm test` | Unit tests in every package (Vitest) |
| `pnpm test:writer` / `:sheet` / `:slides` / `:shared` | Per-package tests |
| `pnpm bench:writer` / `:sheet` / `:slides` | Per-app performance gates |
| `pnpm validate:templates` | Validate the 234 Slides template library |
| `pnpm --filter @234/writer dev` | Run an app's Vite dev server |

Before opening a PR, make sure `pnpm typecheck`, `pnpm lint`, and `pnpm test`
are all green, and the relevant `pnpm bench:*` gate still passes.

## Non-negotiable rules

These are enforced by review (and partly by the hooks in CLAUDE.md §12). Full
detail lives in `CLAUDE.md`; the essentials:

- **Design system** (root §5, `apps/shared/CLAUDE.md`): CSS custom properties
  only — **no hardcoded hex**; **dark mode** must work; **sentence case** for all
  UI text; **Tabler outline** icons only; visible focus + `aria-label` on
  icon-only controls; type scale 14/16/12, weights 400/500 only.
- **Every component ships a `.test.tsx`/`.test.ts`** (§12).
- **234 Sheet formula references** (root §3.4, §16): named references in storage
  (coordinates), **never raw A1**; A1 is display-only with a lint warning.
- **The AI sidebar rule** (root §6): AI lives in a collapsible, docked sidebar
  only — it never floats over content, never speaks first, and is only ever
  user-invoked. AI is always optional; every app is fully usable with it off.
  Changing this rule requires a recorded decision in
  `docs/architecture/ai-sidebar.md`.
- **Performance gates** (root §8): never raise a benchmark threshold to make it
  pass — fix the regression.
- **MS Office import** (root §7): never silently mangle — every import completes
  and logs fidelity losses to the user-visible import report.

## Workflow

- Branch from `main`; keep changes focused. Sub-agents/contributors push to
  feature branches; the lead reviews the diff and merges (root §13).
- **Commit messages**: a concise imperative summary line, optionally
  `area: summary` (e.g. `feat(sheet): …`), with a body explaining what and why.
- Keep PRs green: typecheck, lint, test, and the relevant benchmark gate.

## Contributing a 234 Slides template

Templates are reviewed like code (root §10, `apps/slides/docs/template-format.md`):
add a folder under `apps/slides/templates/<name>/` with `template.fwsl`,
`preview.png` (exactly 1280×720), and `meta.json` (`name`, `author`, `tags[]`,
`description`, `license` ∈ {MIT, CC0}). Run `pnpm validate:templates` — CI runs
it on every PR touching templates.

## Code of conduct

By participating you agree to uphold our [Code of Conduct](../CODE_OF_CONDUCT.md).
