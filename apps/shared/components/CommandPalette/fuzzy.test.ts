import { describe, expect, it } from 'vitest';
import { fuzzyMatch, rankCommands } from './fuzzy';

describe('fuzzyMatch', () => {
  it('matches everything for an empty query', () => {
    expect(fuzzyMatch('', 'Toggle theme').matched).toBe(true);
  });

  it('matches a subsequence', () => {
    expect(fuzzyMatch('tgm', 'Toggle theme').matched).toBe(true);
  });

  it('rejects a non-subsequence', () => {
    expect(fuzzyMatch('zzz', 'Toggle theme').matched).toBe(false);
  });

  it('scores word-start / consecutive matches higher', () => {
    const strong = fuzzyMatch('tog', 'Toggle theme').score;
    const weak = fuzzyMatch('tem', 'Toggle theme').score;
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('rankCommands', () => {
  it('filters and ranks by relevance', () => {
    const items = [{ title: 'New document' }, { title: 'Toggle theme' }];
    const ranked = rankCommands('toggle', items);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe('Toggle theme');
  });

  it('returns all items for an empty query', () => {
    const items = [{ title: 'Alpha' }, { title: 'Beta' }];
    expect(rankCommands('', items)).toHaveLength(2);
  });
});
