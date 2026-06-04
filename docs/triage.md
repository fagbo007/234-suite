# Issue triage workflow

How incoming issues move from reported to resolved during the beta. Lightweight
on purpose — the goal is that nothing sits unlooked-at and that the most
important bugs are easy to find.

## Labels

**Kind** (one):
- `bug` — something is broken
- `enhancement` — a new capability or improvement
- `docs` — documentation only
- `question` — support / clarification

**Severity** (bugs; one):
- `p1` — critical: data loss, crash, a core flow broken, or a Section 8
  performance gate regressed
- `p2` — significant but with a workaround
- `p3` — minor / cosmetic

**Status / flow:**
- `needs-triage` — newly filed, not yet reviewed (issue templates apply this
  automatically)
- `blocked` — waiting on something (e.g. the Tauri window, an upstream fix)
- `good-first-issue` — well-scoped and approachable for new contributors

App scope is captured by the issue form's "Which app?" field; add an `app:*`
label if you prefer label-based filtering.

## Flow

1. **Incoming** — a new issue arrives with `needs-triage` (+ `bug` or
   `enhancement` from the template).
2. **Triage** — a maintainer confirms it's reproducible/valid, sets severity
   (`p1`/`p2`/`p3` for bugs), removes `needs-triage`, and adds `blocked` /
   `good-first-issue` if relevant.
3. **Assigned** — picked up; the contributor opens a PR that `Closes #` the issue
   (PR template checklist must pass).
4. **Closed** — merged fix (or declined with a reason).

## Connection to the session-start hook

The Claude Code **session-start hook** (root `CLAUDE.md` §12) prints the count of
open issues labelled **`bug`** and **`p1`** at the start of every session — so
applying those labels accurately during triage keeps that signal meaningful.

## Beta programme

During beta, do a triage pass on new `needs-triage` issues at least weekly, and
keep the open `p1` count at zero before cutting a release.
