# Hooks & checks

How `CLAUDE.md` §12 is enforced. The §12 rules span three surfaces; this records
what runs where, and (honestly) which rules are static-checkable vs. review-
enforced.

## `pnpm checks` — content rules (`scripts/checks.mjs`)

A dependency-free Node scanner implementing the reliably-static §12 post-edit
rules. Severities follow §12 — **errors block, warnings don't**:

| Rule | Severity | How |
|---|---|---|
| className-based styling in the Writer **document schema** | **error** | scans `apps/writer/src/editor/schema.ts` (the node `toDOM` path must emit inline `style`, never a class — §4/§16) |
| raw **A1** stored in the formula-engine translation layer | **error** | scans `packages/formula-engine/src/namedRefs.ts` for A1-shaped string literals (storage uses `{sheet,row,col}` — §3.4/§16) |
| hardcoded **hex** in component styles | warning | scans `**/*.css` except `apps/shared/design-tokens/tokens.css` (§5) |
| component `.tsx` with no sibling `.test.tsx` | warning | PascalCase components under `apps/*/src` + `apps/shared/components` (§12 hook 5) |

Run any time: `pnpm checks` (exit non-zero only on an error).

**Review-enforced (not faked with a brittle scanner):** the icon-only
`aria-label` rule and the *general* className rule need real JSX/AST analysis to
avoid false positives, so they're enforced by code review + the established
component patterns rather than a regex. The two error checks above are deliberately
narrow (one target file each) so they stay precise and never wrongly block a commit.

## Git pre-commit (`.githooks/pre-commit`) — fast gates

Runs on every `git commit` (wired via `core.hooksPath = .githooks`, set
automatically by the `prepare` script on `pnpm install`):

```
node scripts/checks.mjs   # §12 content rules — errors block
pnpm lint
pnpm typecheck
```

Kept **fast** (~25s) so commits stay quick. The **full unit-test suite +
`validate:templates`** are the heavier gates and run in **CI** (the GitHub Actions
matrix on Windows / macOS / Linux), not on every local commit. Bypass in an
emergency with `git commit --no-verify` (discouraged).

> §12 pre-commit also lists "benchmark regresses > 10%". That needs stored
> baselines; for now the perf gates run via `pnpm bench:*` and in CI rather than
> as a commit gate.

## Claude Code SessionStart hook (`.claude/settings.json`)

A `SessionStart` hook runs `node scripts/session-start.mjs`, which prints the §12
session-start reminders (the AI-sidebar rule, the formula-ref rule), the current
phase, and where to find gate/check status. The GitHub `bug`/`p1` issue counts are
**skipped until a public remote exists**. (The post-edit and session-end Claude
hooks from §12 are intentionally not wired — the post-edit content rules run via
the git pre-commit + `pnpm checks` instead.)

`.claude/settings.json` is shared/version-controlled; `.claude/settings.local.json`
holds personal permission overrides and is git-ignored.
