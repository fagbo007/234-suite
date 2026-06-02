import { describe, expect, it } from 'vitest';
import { styleToInlineCss, type Style } from './styles';

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
