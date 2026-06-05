// Session-start reminders (root CLAUDE.md §12 session-start hook). Wired as a
// Claude Code `SessionStart` hook in .claude/settings.json. Prints the standing
// reminders + phase; the GitHub bug/p1 issue counts are skipped until a public
// remote exists.
const lines = [
  '── 234 suite ──────────────────────────────────────────────',
  'Phase 4 (community / launch) — collaboration is live in all three apps.',
  '',
  'Reminders:',
  '  • AI sidebar rule: the user invokes it — it never floats, never speaks first.',
  '  • Formula refs: named refs are the default and live in the translation layer;',
  '    A1 is display-only with a lint warning. Never store raw A1 in formula-engine.',
  '',
  'Gates : `pnpm bench:writer|sheet|slides` for perf-gate status;',
  '        CI runs typecheck/lint/test on Windows / macOS / Linux.',
  'Checks: `pnpm checks` runs the §12 content rules (pre-commit runs them too).',
  'Issues: GitHub bug/p1 counts activate once a public remote exists (none yet).',
  '────────────────────────────────────────────────────────────',
];
console.log(lines.join('\n'));
