/**
 * Theme helpers for Project 234.
 *
 * Theme is controlled by the `data-theme` attribute on the document root (or any
 * given element). Tokens for each theme are defined in `tokens.css`. Dark is the
 * suite default (root CLAUDE.md Section 5).
 */
export type ThemeName = 'light' | 'dark';

const ATTR = 'data-theme';

function resolveRoot(root?: HTMLElement): HTMLElement {
  if (root) return root;
  return document.documentElement;
}

/** Apply a theme by setting `data-theme` on the root element. */
export function applyTheme(name: ThemeName, root?: HTMLElement): void {
  resolveRoot(root).setAttribute(ATTR, name);
}

/** Read the current theme; defaults to `dark` when unset (the suite default). */
export function getTheme(root?: HTMLElement): ThemeName {
  return resolveRoot(root).getAttribute(ATTR) === 'light' ? 'light' : 'dark';
}

/** Flip between light and dark; returns the newly applied theme. */
export function toggleTheme(root?: HTMLElement): ThemeName {
  const next: ThemeName = getTheme(root) === 'dark' ? 'light' : 'dark';
  applyTheme(next, root);
  return next;
}
