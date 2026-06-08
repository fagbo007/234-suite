// Docs-site generator (author tooling — plain Node ESM, run via `pnpm docs:build`).
// Discovers the repo's markdown docs + each package's index header/exports and
// writes a static HTML site to dist/site/. The pure logic lives in (and is tested
// from) ./src/site.ts; this file is just the filesystem glue. Output is a build
// artifact (gitignored). Run `tsc -b` first — `pnpm build` does both.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Import the compiled core directly (site.js only imports the bare `marked`
// specifier — no extensionless relative imports for Node ESM to choke on).
import { buildPages, extractHeaderDoc, listExports, pathToHref } from './dist/src/site.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const outDir = join(here, 'dist', 'site');

const read = (p) => readFileSync(join(repoRoot, p), 'utf8');
const exists = (p) => existsSync(join(repoRoot, p));

function firstHeading(md, fallback) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].trim() : fallback;
}

/** Recursively collect *.md under a repo-relative dir (posix-separated paths). */
function walkMd(relDir) {
  const out = [];
  const abs = join(repoRoot, relDir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    const relPath = `${relDir}/${entry}`;
    const st = statSync(join(repoRoot, relPath));
    if (st.isDirectory()) out.push(...walkMd(relPath));
    else if (entry.toLowerCase().endsWith('.md')) out.push(relPath);
  }
  return out;
}

// --- Docs ---------------------------------------------------------------------
const docs = [];

// Root guide docs (CLAUDE.md is intentionally excluded — internal agent context).
const rootGuides = ['README.md', 'CHANGELOG.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md'];
for (const srcPath of rootGuides) {
  if (!exists(srcPath)) continue;
  const md = read(srcPath);
  docs.push({ srcPath, href: pathToHref(srcPath), title: firstHeading(md, srcPath), group: 'Guides', md });
}

// LICENSE is plain text — wrap it as a code block so it renders cleanly.
if (exists('LICENSE')) {
  docs.push({
    srcPath: 'LICENSE',
    href: 'license.html',
    title: 'License',
    group: 'Guides',
    md: '# License\n\n```\n' + read('LICENSE').trim() + '\n```\n',
  });
}

// docs/** — architecture/* → "Architecture", the rest → "Guides".
for (const srcPath of walkMd('docs')) {
  const md = read(srcPath);
  const group = srcPath.startsWith('docs/architecture/') ? 'Architecture' : 'Guides';
  docs.push({ srcPath, href: pathToHref(srcPath), title: firstHeading(md, srcPath), group, md });
}

// --- Packages (header doc + exports from each src/index.ts) -------------------
const packages = [];
const candidates = [];
for (const dir of readdirSync(join(repoRoot, 'packages'))) {
  candidates.push(`packages/${dir}`);
}
candidates.push('apps/shared');
for (const pkgDir of candidates.sort()) {
  const indexPath = `${pkgDir}/src/index.ts`;
  const pkgJsonPath = `${pkgDir}/package.json`;
  if (!exists(indexPath) || !exists(pkgJsonPath)) continue;
  const name = JSON.parse(read(pkgJsonPath)).name ?? pkgDir;
  if (name === '@234/docs-site') continue; // don't document the generator itself
  const source = read(indexPath);
  packages.push({ name, headerDoc: extractHeaderDoc(source), exports: listExports(source) });
}

// --- Render + write -----------------------------------------------------------
const css = exists('apps/shared/design-tokens/tokens.css')
  ? read('apps/shared/design-tokens/tokens.css')
  : ':root{}';

const intro =
  '# 234 suite documentation\n\n' +
  'Open source office suite — **234 Writer**, **234 Sheet**, **234 Slides**. ' +
  'MIT, offline-first, no account required. This site is generated from the ' +
  "repository's architecture docs, guides, and package source comments.";

const pages = buildPages({ docs, packages, css, intro });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const page of pages) writeFileSync(join(outDir, page.href), page.html);

console.log(
  `docs-site: wrote ${pages.length} page(s) (${docs.length} docs + ${packages.length} packages) → ${relative(repoRoot, outDir)}`,
);
