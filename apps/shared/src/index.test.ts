import { describe, expect, it } from 'vitest';
import { Button, CommandPalette, Icon, Input, applyTheme, registerCommand } from './index';

describe('@234/shared public API', () => {
  it('exports the base components and palette', () => {
    expect(typeof Button).toBe('object'); // forwardRef component
    expect(typeof Input).toBe('object');
    expect(typeof Icon).toBe('function');
    expect(typeof CommandPalette).toBe('function');
  });

  it('exports theme and command registry helpers', () => {
    expect(typeof applyTheme).toBe('function');
    expect(typeof registerCommand).toBe('function');
  });
});
