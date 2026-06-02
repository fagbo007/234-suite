import { describe, expect, it } from 'vitest';
import { COMPAT_PLACEHOLDER } from './index';

describe('@234/compat', () => {
  it('exposes a placeholder until the compat layer lands in Phase 3', () => {
    expect(COMPAT_PLACEHOLDER).toBe(true);
  });
});
