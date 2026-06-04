# Project 234

Open source desktop office suite — three apps in one monorepo:

- **234 Writer** — word processor (ProseMirror)
- **234 Sheet** — spreadsheet (in-house MIT formula engine)
- **234 Slides** — presentation tool (Fabric.js)

MIT licensed, fully offline, no account required. Built on **Tauri 2 + Rust**
(desktop shell) and **React 18 + TypeScript** (UI), managed with **pnpm
workspaces**. See [`CLAUDE.md`](./CLAUDE.md) for the full architecture and the
rules every change must follow.

> **Status:** Phase 3 in progress. All three apps edit, save, and reload their
> native formats; the design system, command palette, and per-app Phase 2
> features are in place. A docked, user-invoked **AI sidebar** (offline-first:
> mock + local Ollama) and **MS Office round-trip** (`.docx`/`.xlsx`/`.pptx` with
> an import report) are live. The native **Tauri window**, cloud AI providers +
> key storage, and packaged installers are still to come. See `CLAUDE.md` §9.

## Repository layout

```
apps/
  writer/   sheet/   slides/   shared/     # three apps + shared design system
packages/
  formula-engine/                          # in-house MIT formula evaluator + translation layer
  compat/                                  # MS Office .docx/.xlsx/.pptx import/export
  ai-sidebar/                              # shared AI sidebar (provider engine + UI)
docs/
  architecture/                            # decision records (app-shell, ai-sidebar, plugin-api, …)
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
| `pnpm bench:writer` / `:sheet` / `:slides` | Per-app performance gates (root §8) |
| `pnpm validate:templates` | Validate the 234 Slides template library |
| `pnpm e2e` | Playwright E2E (placeholder until the Tauri windows exist) |
| `pnpm --filter @234/writer dev` | Run an app's Vite dev server |

## Documentation

- [Contributing guide](./docs/contributing.md) — setup, the dev loop, and the rules every change follows
- [Code of conduct](./CODE_OF_CONDUCT.md)
- [Changelog](./CHANGELOG.md)
- [Plugin / extension API sketch](./docs/architecture/plugin-api.md)
- [Architecture decision records](./docs/architecture/) — app shell, formula refs, AI sidebar, accessibility, plugin API
- [`CLAUDE.md`](./CLAUDE.md) — the single source of truth for architecture and rules

## License

MIT — see [`LICENSE`](./LICENSE).

