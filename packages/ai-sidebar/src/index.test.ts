import { describe, expect, it } from 'vitest';
import { AI_SIDEBAR_PLACEHOLDER } from './index';

describe('@234/ai-sidebar', () => {
  it('exposes a placeholder until the sidebar scaffold lands in Phase 2', () => {
    expect(AI_SIDEBAR_PLACEHOLDER).toBe(true);
  });
});
