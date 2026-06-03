import { describe, expect, it } from 'vitest';
import { AiSidebar, useAiSidebar } from './index';

describe('@234/ai-sidebar', () => {
  it('exports the sidebar component and its hook', () => {
    expect(typeof AiSidebar).toBe('function');
    expect(typeof useAiSidebar).toBe('function');
  });
});
