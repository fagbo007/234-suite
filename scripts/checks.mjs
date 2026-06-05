// Project 234 content checks (root CLAUDE.md §12 post-edit rules) — a runnable,
// review-friendly scanner used by `pnpm checks` and the git pre-commit hook.
//
// Severities follow §12: className-in-document-schema and raw-A1-in-storage are
// ERRORS (exit non-zero / block the commit); hardcoded-hex and missing-test are
// WARNINGS (printed, non-blocking). The two error checks are narrowly targeted at
// the one file each rule governs, so they stay precise and never false-block.
// The AST-dependent rules (icon-only aria-label, general className) are
// review-enforced — see docs/architecture/hooks.md.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'target',
  'gen',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
]);

const rel = (p) => relative(ROOT, p).split('\\').join('/');
const errors = [];
const warnings = [];

function walk(dir, match, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(name)) walk(full, match, out);
    } else if (match(full)) {
      out.push(full);
    }
  }
  return out;
}

// Strip // and /* */ comments so prose mentioning "className"/"A1" never trips the
// error scans (best-effort — fine for these targeted checks).
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

// ── Error 1: className-based styling in the Writer document schema (§4/§16) ──
const schemaPath = join(ROOT, 'apps/writer/src/editor/schema.ts');
if (existsSync(schemaPath)) {
  const code = stripComments(readFileSync(schemaPath, 'utf8'));
  if (/\bclassName\b/.test(code) || /["']?\bclass\b["']?\s*:/.test(code)) {
    errors.push(
      `${rel(schemaPath)}: document schema applies a class for styling — node styling must be inline (root §4/§16).`,
    );
  }
}

// ── Error 2: raw A1 stored in the formula-engine translation layer (§3.4/§16) ──
const namedRefsPath = join(ROOT, 'packages/formula-engine/src/namedRefs.ts');
if (existsSync(namedRefsPath)) {
  const code = stripComments(readFileSync(namedRefsPath, 'utf8'));
  const hits = code.match(/(['"])[A-Z]{1,2}[0-9]{1,7}\1/g);
  if (hits) {
    errors.push(
      `${rel(namedRefsPath)}: A1-shaped string literal(s) ${[...new Set(hits)].join(', ')} — storage must use {sheet,row,col}, never A1 (root §3.4/§16).`,
    );
  }
}

// ── Warning 1: hardcoded hex in component styles (§5) ──
const TOKENS = 'apps/shared/design-tokens/tokens.css';
for (const file of walk(join(ROOT, 'apps'), (f) => f.endsWith('.css'))) {
  if (rel(file) === TOKENS) continue;
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (/#[0-9a-fA-F]{3,8}\b/.test(line)) {
        warnings.push(`${rel(file)}:${i + 1}: hardcoded hex — use a CSS custom property (root §5).`);
      }
    });
}

// ── Warning 2: a component .tsx with no sibling .test.tsx (§12 hook 5) ──
// Component convention: PascalCase-named .tsx (skips main.tsx, lowercase helpers).
for (const file of walk(join(ROOT, 'apps'), (f) => /[/\\][A-Z][A-Za-z0-9]*\.tsx$/.test(f))) {
  const name = basename(file);
  if (name.endsWith('.test.tsx')) continue;
  if (!existsSync(file.replace(/\.tsx$/, '.test.tsx'))) {
    warnings.push(`${rel(file)}: no sibling .test.tsx (root §12 hook 5).`);
  }
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`\nchecks: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
