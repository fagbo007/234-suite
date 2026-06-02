import { type Deck } from './types';

/**
 * `.fwsl` = JSON document model (root CLAUDE.md Section 7). Human-readable,
 * git-diffable, readable without the app installed.
 */
export function serializeFwsl(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

export function parseFwsl(json: string): Deck {
  const data = JSON.parse(json) as Partial<Deck>;
  if (!data || !Array.isArray(data.slides)) {
    throw new Error('Invalid .fwsl: missing slides array');
  }
  return { slides: data.slides };
}
