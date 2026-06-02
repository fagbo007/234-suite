# Project 234

Open source desktop office suite — three apps in one monorepo:

- **234 Writer** — word processor (ProseMirror)
- **234 Sheet** — spreadsheet (HyperFormula)
- **234 Slides** — presentation tool (Fabric.js)

MIT licensed, fully offline, no account required. Built on **Tauri 2 + Rust**
(desktop shell) and **React 18 + TypeScript** (UI), managed with **pnpm
workspaces**. See [`CLAUDE.md`](./CLAUDE.md) for the full architecture and the
rules every change must follow.

> **Status:** Phase 1, Step 1 — repository scaffold. The app packages are thin
> runnable placeholders. Editors, the design system, and the Tauri/Rust backends
> are built in later Phase 1 steps. See `CLAUDE.md` Section 15.

## Repository layout

```
apps/
  writer/   sheet/   slides/   shared/     # three apps + shared design system
packages/
  formula-engine/   compat/   ai-sidebar/  # reserved (scaffolded in later steps)
docs/
  architecture/                            # app-shell.md and other decision records
```

## Getting started

This project uses pnpm via Node's built-in corepack.

```bash
corepack enable            # one-time; on Windows may need an admin shell
pnpm install               # install workspace dependencies
```

If `corepack enable` cannot write the global shim (e.g. Node installed under
`C:\Program Files` without admin rights), invoke pnpm through corepack instead:
`corepack pnpm install`.

## Common commands

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm typecheck` | TypeScript strict build across all packages (`tsc -b`) |
| `pnpm lint` | ESLint (flat config, typescript-eslint) |
| `pnpm test` | Run unit tests in every package |
| `pnpm test:writer` / `:sheet` / `:slides` / `:shared` | Per-package unit tests |
| `pnpm bench:writer` / `:sheet` / `:slides` | Per-app benchmarks (placeholders until Steps 3-5) |
| `pnpm e2e` | Playwright E2E (placeholder until windows exist) |
| `pnpm --filter @234/writer dev` | Run an app's Vite dev server |

## License

MIT
