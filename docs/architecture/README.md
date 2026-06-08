# Architecture decision records

Design decisions and architecture notes for Project 234. The **canonical
decision log** is root [`CLAUDE.md`](../../CLAUDE.md) §17 — these documents
expand on individual decisions.

## Records

| Document | What it covers |
|---|---|
| [`app-shell.md`](./app-shell.md) | Suite installer + three isolated processes; structure-first build order |
| [`tauri-build.md`](./tauri-build.md) | Turnkey runbook for building the native Tauri window (toolchain prerequisites) |
| [`formula-refs.md`](./formula-refs.md) | 234 Sheet named-reference translation layer; the engine-agnostic boundary (MIT engine) |
| [`ai-sidebar.md`](./ai-sidebar.md) | The AI sidebar rule (§6); offline-first scaffold; cloud/key-storage deferral |
| [`accessibility.md`](./accessibility.md) | The Phase 2 accessibility audit + checklist |
| [`plugin-api.md`](./plugin-api.md) | Plugin / extension API **sketch** (command + AI-provider seams) |
| [`collab.md`](./collab.md) | Real-time collaboration (Yjs + optional relay) — core implemented in `@234/collab`; per-app bindings in progress |
| [`hooks.md`](./hooks.md) | §12 enforcement — `pnpm checks` content rules, the fast git pre-commit, the SessionStart hook |
| [`phase-1-complete.md`](./phase-1-complete.md) | Phase 1 sign-off and verification record |

> Docs marked **sketch** are design-only (Phase 4 prep); the implementation
> lands later with the Tauri window.

## Related docs (outside this folder)

- [`../contributing.md`](../contributing.md) — how to contribute + the repo rules
- [`../triage.md`](../triage.md) — issue triage workflow and label scheme
- [`../formula-compat.md`](../formula-compat.md) — 234 Sheet formula support table

## Generated docs site

These docs (plus the root guides and a per-package API overview) are aggregated
into a static, offline HTML site by **`@234/docs-site`** (root §9). Build it with
`pnpm docs:build` → open `packages/docs-site/dist/site/index.html`. The generator
(`packages/docs-site/`) is the source of truth; the site is a build artifact.
