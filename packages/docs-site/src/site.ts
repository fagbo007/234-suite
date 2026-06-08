/**
 * Docs-site core (root §9: "Docs site generated from source comments and
 * architecture docs"). Pure, fs-free building blocks — markdown→HTML, package
 * header/exports extraction, intra-repo link rewriting, the page shell, and the
 * full page set — so they are deterministically unit-testable. The thin
 * `build.mjs` glues these to the filesystem.
 */
import { marked } from 'marked';

export interface DocPage {
  /** Repo-relative source path, e.g. "docs/architecture/collab.md". */
  srcPath: string;
  /** Flattened site filename, e.g. "docs-architecture-collab.html". */
  href: string;
  title: string;
  /** Sidebar group label, e.g. "Guides" / "Architecture". */
  group: string;
  md: string;
}

export interface PackageInfo {
  name: string;
  /** Leading doc-comment of the package's src/index.ts. */
  headerDoc: string;
  /** Exported identifier names. */
  exports: string[];
}

export interface BuildInput {
  docs: DocPage[];
  packages: PackageInfo[];
  /** Design-token CSS to inline (the suite's own tokens). */
  css: string;
  /** Optional intro markdown for the home page. */
  intro?: string;
}

export interface RenderedPage {
  href: string;
  html: string;
}

interface NavItem {
  href: string;
  title: string;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Slug a string for a filename/anchor. */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Repo-relative source path → flattened site href (collision-free). */
export function pathToHref(srcPath: string): string {
  const noExt = srcPath.replace(/\.md$/i, '');
  return `${slug(noExt)}.html`;
}

/**
 * The leading doc-comment of a source file: either a run of `//` lines or a
 * single `/** … *␞/` block at the top. Markers and a leading `@scope/name —`
 * label are stripped. Returns '' when there is none.
 */
export function extractHeaderDoc(source: string): string {
  const text = source.replace(/^\s+/, ''); // \s also strips a leading BOM (U+FEFF)
  let body = '';
  const block = /^\/\*\*?([\s\S]*?)\*\//.exec(text);
  if (block) {
    body = (block[1] ?? '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*?\s?/, ''))
      .join('\n');
  } else {
    const lines = text.split('\n');
    const collected: string[] = [];
    for (const line of lines) {
      const m = /^\s*\/\/\s?(.*)$/.exec(line);
      if (m) collected.push(m[1] ?? '');
      else break;
    }
    body = collected.join('\n');
  }
  return body.trim();
}

/** Exported identifier names from an index/source file (best-effort, regex). */
export function listExports(source: string): string[] {
  const names = new Set<string>();

  // export { a, type B, c as d } [from '…']
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const raw of (m[1] ?? '').split(',')) {
      const part = raw.trim();
      if (!part) continue;
      // Drop a leading `type ` marker and any ` as alias`.
      const cleaned = part.replace(/^type\s+/, '');
      const name = (cleaned.split(/\s+as\s+/).pop() ?? cleaned).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  // export (default?) function|const|class|interface|type|enum Name
  for (const m of source.matchAll(
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    if (m[1]) names.add(m[1]);
  }

  return [...names];
}

/** marked → HTML (synchronous). */
export function mdToHtml(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/**
 * Resolve an intra-repo markdown link (as written, relative to `fromSrcPath`'s
 * directory) to the site href, or null when it is not a known local doc.
 */
export function resolveDocLink(
  fromSrcPath: string,
  href: string,
  bySrcPath: Map<string, string>,
): string | null {
  if (/^[a-z]+:|^#|^\/\//i.test(href)) return null; // external / anchor / protocol-relative
  const [pathPart = '', hash = ''] = href.split(/(?=#)/);
  if (!/\.md$/i.test(pathPart)) return null;

  const fromDir = fromSrcPath.includes('/') ? fromSrcPath.replace(/\/[^/]*$/, '') : '';
  const segments = (fromDir ? `${fromDir}/${pathPart}` : pathPart).split('/');
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') stack.pop();
    else stack.push(seg);
  }
  const normalized = stack.join('/');
  const target = bySrcPath.get(normalized);
  return target ? `${target}${hash}` : null;
}

/** Rewrite intra-repo `.md` links in rendered HTML to site `.html` hrefs. */
export function rewriteMdLinks(
  html: string,
  fromSrcPath: string,
  bySrcPath: Map<string, string>,
): string {
  return html.replace(/href="([^"]+)"/g, (whole, href: string) => {
    const resolved = resolveDocLink(fromSrcPath, href, bySrcPath);
    return resolved ? `href="${resolved}"` : whole;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The full HTML page: inlined token CSS, sidebar nav, main content. */
export function renderShell({
  title,
  bodyHtml,
  nav,
  activeHref,
  css,
}: {
  title: string;
  bodyHtml: string;
  nav: NavGroup[];
  activeHref: string;
  css: string;
}): string {
  const navHtml = nav
    .map((group) => {
      const items = group.items
        .map((item) => {
          const current = item.href === activeHref ? ' aria-current="page"' : '';
          return `<li><a href="${item.href}"${current}>${escapeHtml(item.title)}</a></li>`;
        })
        .join('');
      return `<div class="nav-group"><p class="nav-label">${escapeHtml(group.label)}</p><ul>${items}</ul></div>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — 234 suite docs</title>
<style>
${css}
${SITE_CSS}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="layout">
<aside class="sidebar" aria-label="Documentation navigation">
<a class="brand" href="index.html">234 suite docs</a>
${navHtml}
</aside>
<main id="main" class="content">
${bodyHtml}
</main>
</div>
</body>
</html>
`;
}

// Layout CSS (tokens only — colours come from the inlined suite tokens above).
const SITE_CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;font-size:var(--font-size-body);
  color:var(--color-fg-primary);background:var(--color-bg-base);line-height:1.6}
.skip-link{position:absolute;left:-999px}
.skip-link:focus{left:var(--space-2);top:var(--space-2);background:var(--color-bg-surface);
  padding:var(--space-2);border-radius:var(--radius-interactive)}
.layout{display:flex;align-items:flex-start;gap:var(--space-6);max-width:1100px;margin:0 auto;padding:var(--space-6)}
.sidebar{flex:none;width:240px;position:sticky;top:var(--space-6)}
.brand{display:block;font-weight:var(--font-weight-medium);color:var(--color-fg-primary);
  text-decoration:none;margin-bottom:var(--space-4)}
.nav-group{margin-bottom:var(--space-4)}
.nav-label{font-size:var(--font-size-meta);color:var(--color-fg-secondary);
  text-transform:none;margin:0 0 var(--space-1)}
.sidebar ul{list-style:none;margin:0;padding:0}
.sidebar li{margin:var(--space-1) 0}
.sidebar a{color:var(--color-fg-muted);text-decoration:none;font-size:var(--font-size-body)}
.sidebar a:hover{color:var(--color-fg-primary)}
.sidebar a[aria-current=page]{color:var(--color-accent);font-weight:var(--font-weight-medium)}
.content{flex:1;min-width:0}
.content h1,.content h2,.content h3{font-weight:var(--font-weight-medium);line-height:1.3}
.content a{color:var(--color-accent)}
.content code{background:var(--color-bg-surface);padding:0 var(--space-1);border-radius:var(--radius-interactive)}
.content pre{background:var(--color-bg-surface);padding:var(--space-3);border-radius:var(--radius-card);overflow:auto}
.content pre code{background:none;padding:0}
.content table{border-collapse:collapse}
.content th,.content td{border:1px solid var(--color-border);padding:var(--space-1) var(--space-2);text-align:left}
.content :focus-visible{outline:2px solid var(--color-focus-ring);outline-offset:2px}
.exports{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-2);padding:0;list-style:none}
.exports li code{font-size:var(--font-size-body)}
`;

function packageMarkdown(pkg: PackageInfo): string {
  const header = pkg.headerDoc ? `${pkg.headerDoc}\n\n` : '';
  const exportList =
    pkg.exports.length > 0
      ? `## Exports\n\n${pkg.exports.map((name) => `- \`${name}\``).join('\n')}\n`
      : '_No public exports._\n';
  return `# ${pkg.name}\n\n${header}${exportList}`;
}

/** Build every page (home + one per doc + one per package). Pure — no fs. */
export function buildPages({ docs, packages, css, intro }: BuildInput): RenderedPage[] {
  const bySrcPath = new Map<string, string>();
  for (const doc of docs) bySrcPath.set(doc.srcPath, doc.href);

  // Sidebar nav: doc groups in first-seen order, then a Packages group.
  const groupOrder: string[] = [];
  const grouped = new Map<string, NavItem[]>();
  for (const doc of docs) {
    if (!grouped.has(doc.group)) {
      grouped.set(doc.group, []);
      groupOrder.push(doc.group);
    }
    grouped.get(doc.group)!.push({ href: doc.href, title: doc.title });
  }
  const nav: NavGroup[] = groupOrder.map((label) => ({ label, items: grouped.get(label)! }));
  if (packages.length > 0) {
    nav.push({
      label: 'Packages',
      items: packages.map((pkg) => ({ href: `package-${slug(pkg.name)}.html`, title: pkg.name })),
    });
  }

  const pages: RenderedPage[] = [];

  // Home.
  const homeMd =
    (intro ?? '# 234 suite documentation\n\nOpen source office suite — Writer, Sheet, Slides.') +
    '\n\n' +
    nav
      .map(
        (group) =>
          `## ${group.label}\n\n${group.items.map((i) => `- [${i.title}](${i.href})`).join('\n')}`,
      )
      .join('\n\n');
  pages.push({
    href: 'index.html',
    html: renderShell({ title: 'Home', bodyHtml: mdToHtml(homeMd), nav, activeHref: 'index.html', css }),
  });

  // One page per doc (with intra-repo links rewritten to site hrefs).
  for (const doc of docs) {
    const body = rewriteMdLinks(mdToHtml(doc.md), doc.srcPath, bySrcPath);
    pages.push({
      href: doc.href,
      html: renderShell({ title: doc.title, bodyHtml: body, nav, activeHref: doc.href, css }),
    });
  }

  // One overview page per package (header doc + exports).
  for (const pkg of packages) {
    const href = `package-${slug(pkg.name)}.html`;
    pages.push({
      href,
      html: renderShell({ title: pkg.name, bodyHtml: mdToHtml(packageMarkdown(pkg)), nav, activeHref: href, css }),
    });
  }

  return pages;
}
