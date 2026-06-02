import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, getTheme, toggleTheme } from './theme';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('theme helpers', () => {
  it('applies light and dark themes to the root element', () => {
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to dark when unset', () => {
    expect(getTheme()).toBe('dark');
  });

  it('toggles between light and dark', () => {
    applyTheme('dark');
    expect(toggleTheme()).toBe('light');
    expect(toggleTheme()).toBe('dark');
  });

  it('can target a specific element', () => {
    const el = document.createElement('div');
    applyTheme('light', el);
    expect(getTheme(el)).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
