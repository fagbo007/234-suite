// @234/docs-site — static docs-site generator (root §9). Pure building blocks
// (markdown→HTML, package header/exports extraction, link rewriting, page shell,
// full page set); the thin build.mjs glues them to the filesystem. Dev-only —
// never shipped in the apps' bundles. See packages/docs-site/README.md.
export {
  type DocPage,
  type PackageInfo,
  type BuildInput,
  type RenderedPage,
  slug,
  pathToHref,
  extractHeaderDoc,
  listExports,
  mdToHtml,
  resolveDocLink,
  rewriteMdLinks,
  renderShell,
  buildPages,
} from './site';
