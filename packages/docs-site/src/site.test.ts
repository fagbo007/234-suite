import { describe, expect, it } from 'vitest';
import {
  buildPages,
  extractHeaderDoc,
  listExports,
  mdToHtml,
  pathToHref,
  resolveDocLink,
  rewriteMdLinks,
  slug,
} from './site';

describe('extractHeaderDoc', () => {
  it('reads a run of // line comments and strips the scope label', () => {
    const src = '// @234/formula-engine — in-house MIT evaluator.\n// See formula-refs.md.\n\nexport const x = 1;\n';
    expect(extractHeaderDoc(src)).toBe('@234/formula-engine — in-house MIT evaluator.\nSee formula-refs.md.');
  });

  it('reads a /** */ block comment and strips the leading stars', () => {
    const src = '/**\n * AI provider engine.\n * Offline-first.\n */\nexport interface AiProvider {}\n';
    expect(extractHeaderDoc(src)).toBe('AI provider engine.\nOffline-first.');
  });

  it('returns empty when there is no leading comment', () => {
    expect(extractHeaderDoc('export const x = 1;\n')).toBe('');
  });
});

describe('listExports', () => {
  it('lists names from export blocks (dropping the type keyword + aliases) and declarations', () => {
    const src = `export { type CellValue, SheetEngine, lintFormula as lint } from './engine';
export function definePlugin() {}
export const mockProvider = {};
export type ProviderId = string;`;
    const names = listExports(src);
    expect(names).toContain('CellValue');
    expect(names).toContain('SheetEngine');
    expect(names).toContain('lint'); // alias target
    expect(names).toContain('definePlugin');
    expect(names).toContain('mockProvider');
    expect(names).toContain('ProviderId');
  });
});

describe('slug / pathToHref', () => {
  it('slugs and flattens repo paths collision-free', () => {
    expect(slug('docs/architecture/Collab')).toBe('docs-architecture-collab');
    expect(pathToHref('docs/architecture/collab.md')).toBe('docs-architecture-collab.html');
    // The two README.md files do not collide.
    expect(pathToHref('README.md')).toBe('readme.html');
    expect(pathToHref('docs/architecture/README.md')).toBe('docs-architecture-readme.html');
  });
});

describe('mdToHtml', () => {
  it('renders a table to HTML', () => {
    const html = mdToHtml('| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });
});

describe('resolveDocLink / rewriteMdLinks', () => {
  const map = new Map<string, string>([
    ['docs/architecture/collab.md', 'docs-architecture-collab.html'],
    ['docs/contributing.md', 'docs-contributing.html'],
  ]);

  it('resolves a relative .md link against the source dir', () => {
    expect(resolveDocLink('docs/architecture/README.md', './collab.md', map)).toBe(
      'docs-architecture-collab.html',
    );
    expect(resolveDocLink('docs/architecture/README.md', '../contributing.md', map)).toBe(
      'docs-contributing.html',
    );
  });

  it('preserves an anchor and ignores external/unknown links', () => {
    expect(resolveDocLink('docs/architecture/README.md', './collab.md#goal', map)).toBe(
      'docs-architecture-collab.html#goal',
    );
    expect(resolveDocLink('docs/x.md', 'https://example.com', map)).toBeNull();
    expect(resolveDocLink('docs/x.md', '#section', map)).toBeNull();
    expect(resolveDocLink('docs/x.md', './missing.md', map)).toBeNull();
  });

  it('rewrites links inside rendered HTML', () => {
    const html = '<a href="../contributing.md">Contributing</a> <a href="https://x.com">x</a>';
    const out = rewriteMdLinks(html, 'docs/architecture/README.md', map);
    expect(out).toContain('href="docs-contributing.html"');
    expect(out).toContain('href="https://x.com"');
  });
});

describe('buildPages', () => {
  const css = ':root{--color-bg-base:#fff}';
  const docs = [
    { srcPath: 'README.md', href: 'readme.html', title: 'Overview', group: 'Guides', md: '# Overview\n\nHi.' },
    {
      srcPath: 'docs/architecture/collab.md',
      href: 'docs-architecture-collab.html',
      title: 'Collaboration',
      group: 'Architecture',
      md: '# Collaboration\n\nSee [contributing](../contributing.md).',
    },
    {
      srcPath: 'docs/contributing.md',
      href: 'docs-contributing.html',
      title: 'Contributing',
      group: 'Guides',
      md: '# Contributing',
    },
  ];
  const packages = [
    { name: '@234/formula-engine', headerDoc: 'In-house MIT evaluator.', exports: ['SheetEngine', 'lintFormula'] },
  ];

  it('emits a home page, one per doc, and one per package', () => {
    const pages = buildPages({ docs, packages, css });
    const hrefs = pages.map((p) => p.href);
    expect(hrefs).toContain('index.html');
    expect(hrefs).toContain('readme.html');
    expect(hrefs).toContain('docs-architecture-collab.html');
    expect(hrefs).toContain('package-234-formula-engine.html');
    expect(pages).toHaveLength(1 + docs.length + packages.length);
  });

  it('inlines the token CSS and defaults to dark mode', () => {
    const home = buildPages({ docs, packages, css }).find((p) => p.href === 'index.html')!;
    expect(home.html).toContain('--color-bg-base:#fff');
    expect(home.html).toContain('data-theme="dark"');
  });

  it('marks the active nav item and groups packages', () => {
    const collab = buildPages({ docs, packages, css }).find(
      (p) => p.href === 'docs-architecture-collab.html',
    )!;
    expect(collab.html).toContain('href="docs-architecture-collab.html" aria-current="page"');
    expect(collab.html).toContain('@234/formula-engine');
    // The intra-doc link was rewritten to the site href.
    expect(collab.html).toContain('href="docs-contributing.html"');
  });

  it('renders a package page with its header doc and exports', () => {
    const pkg = buildPages({ docs, packages, css }).find(
      (p) => p.href === 'package-234-formula-engine.html',
    )!;
    expect(pkg.html).toContain('In-house MIT evaluator.');
    expect(pkg.html).toContain('SheetEngine');
    expect(pkg.html).toContain('lintFormula');
  });
});
