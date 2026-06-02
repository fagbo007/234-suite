import { describe, expect, it } from 'vitest';
import {
  addStyle,
  createStyle,
  removeStyle,
  renameStyle,
  styleToInlineCss,
  updateStyle,
  type Style,
  type StyleRegistry,
} from './styles';

describe('styleToInlineCss', () => {
  it('serialises properties to an inline CSS string', () => {
    const style: Style = {
      id: 'title',
      name: 'Title',
      properties: { fontSize: '28px', fontWeight: 500 },
    };
    const css = styleToInlineCss(style);
    expect(css).toContain('font-size: 28px');
    expect(css).toContain('font-weight: 500');
  });

  it('skips undefined properties', () => {
    const style: Style = { id: 'body', name: 'Body', properties: { fontSize: '14px' } };
    expect(styleToInlineCss(style)).toBe('font-size: 14px');
  });
});

describe('registry helpers (immutable)', () => {
  const base: StyleRegistry = [{ id: 'a', name: 'Alpha', properties: { fontSize: '14px' } }];

  it('adds, renames, updates, and removes without mutating the input', () => {
    const added = addStyle(base, createStyle('Beta'));
    expect(added).toHaveLength(2);
    expect(base).toHaveLength(1);

    const renamed = renameStyle(base, 'a', 'Alpha 2');
    expect(renamed[0]?.name).toBe('Alpha 2');
    expect(base[0]?.name).toBe('Alpha');

    const updated = updateStyle(base, 'a', { fontWeight: 500 });
    expect(updated[0]?.properties.fontWeight).toBe(500);
    expect(base[0]?.properties.fontWeight).toBeUndefined();

    expect(removeStyle(base, 'a')).toHaveLength(0);
    expect(base).toHaveLength(1);
  });
});
