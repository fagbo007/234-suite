# @234/docs-site

A small, dependency-light **static docs-site generator** (root `CLAUDE.md` §9:
"Docs site generated from source comments and architecture docs"). It aggregates
the repository's markdown — `README`, `CHANGELOG`, the guides and architecture
decision records under `docs/`, `CODE_OF_CONDUCT`, `SECURITY`, `LICENSE` — and a
per-package **API overview** (each package's `src/index.ts` header comment + its
exported names) into a navigable, offline HTML site styled with the suite's own
design tokens (dark mode by default).

Dev-only — it is never bundled into the apps, so it has no effect on their lean,
offline-first posture. The suite stays MIT (`marked` is MIT).

## Build

```bash
pnpm docs:build        # from the repo root
# or
pnpm --filter @234/docs-site build
```

This runs `tsc -b` then `node build.mjs`, writing the site to
`packages/docs-site/dist/site/` (a build artifact, gitignored). Open
`dist/site/index.html` in a browser.

## How it works

- **`src/site.ts`** — the pure, unit-tested core: markdown→HTML (`marked`),
  package header/exports extraction, intra-repo `.md`→`.html` link rewriting, the
  page shell (inlined token CSS + sidebar nav), and `buildPages` (home + one page
  per doc + one per package). No filesystem access — fully testable.
- **`build.mjs`** — the filesystem glue: discovers the docs + packages, inlines
  `apps/shared/design-tokens/tokens.css`, calls `buildPages`, and writes the
  files. The generator is the source of truth; the output is regenerated.

## Out of scope

Full per-symbol TypeScript API docs (TypeDoc-style signatures/JSDoc), search,
versioning, and a hosted deploy step. The internal `CLAUDE.md` agent context is
intentionally excluded from the public site.
