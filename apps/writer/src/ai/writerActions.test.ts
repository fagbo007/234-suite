import { describe, expect, it } from 'vitest';
import { continuePrompt, explainPrompt, rephrasePrompt, summarisePrompt, writerActions } from './writerActions';

describe('writer AI prompt builders', () => {
  it('build stable, intent-specific prompts that include the input', () => {
    expect(rephrasePrompt('hi').prompt).toMatch(/^Rephrase the following text/);
    expect(rephrasePrompt('hi').prompt).toContain('hi');
    expect(summarisePrompt('hi').prompt).toMatch(/^Summarise/);
    expect(explainPrompt('hi').prompt).toMatch(/^Explain/);
    expect(continuePrompt('hi').prompt).toMatch(/^Continue writing/);
    // All carry the shared system prompt.
    expect(rephrasePrompt('hi').system).toBeTruthy();
  });
});

describe('writerActions', () => {
  it('exposes rephrase/summarise/explain/continue, all disabled without a view', () => {
    const actions = writerActions(null);
    expect(actions.map((a) => a.id)).toEqual([
      'writer.ai.rephrase',
      'writer.ai.summarise',
      'writer.ai.explain',
      'writer.ai.continue',
    ]);
    // No view → no input → the panel disables every action.
    expect(actions.every((a) => a.getInput?.() === null)).toBe(true);
  });

  it('keeps explain read-only (no document side-effect)', () => {
    const explain = writerActions(null).find((a) => a.id === 'writer.ai.explain');
    expect(explain?.onResult).toBeUndefined();
  });
});
