<!-- Thanks for contributing to Project 234! Keep PRs focused. -->

## Summary

<!-- What does this change and why? -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Docs / chore
- [ ] Refactor (no behaviour change)

## Checklist

<!-- See docs/contributing.md and CLAUDE.md for the full rules. -->

- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass
- [ ] The relevant `pnpm bench:*` gate still holds (no threshold weakened — root §8)
- [ ] No hardcoded hex — CSS custom properties only; works in **light and dark** mode (§5)
- [ ] UI text is **sentence case**; icon-only controls have an `aria-label`; Tabler outline icons only (§5)
- [ ] Every new component ships a `.test.tsx` / `.test.ts` (§12)
- [ ] **234 Sheet**: formula references stored by name/coordinates, **never raw A1** (§3.4, §16)
- [ ] **AI**: lives in the docked, user-invoked sidebar only — never floats, never speaks first; AI stays optional (§6)
- [ ] **MS Office compat**: imports still complete and log fidelity losses to the import report (§7)
- [ ] `CHANGELOG.md` updated if this is user-facing
