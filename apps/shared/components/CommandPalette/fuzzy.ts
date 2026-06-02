export interface FuzzyMatch {
  matched: boolean;
  score: number;
  /** Indices in the target that matched, for optional highlighting. */
  indices: number[];
}

/**
 * Lightweight subsequence fuzzy match. Rewards consecutive hits and
 * word-boundary starts; lightly penalises longer targets. Dependency-free.
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch {
  const q = query.trim().toLowerCase();
  if (q === '') return { matched: true, score: 0, indices: [] };

  const t = target.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let cursor = 0;
  let prev = -2;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q.charAt(qi);
    let found = -1;
    for (let j = cursor; j < t.length; j++) {
      if (t.charAt(j) === ch) {
        found = j;
        break;
      }
    }
    if (found === -1) return { matched: false, score: 0, indices: [] };

    score += found === prev + 1 ? 8 : 1;
    if (found === 0 || t.charAt(found - 1) === ' ') score += 6;

    indices.push(found);
    prev = found;
    cursor = found + 1;
  }

  score -= Math.max(0, t.length - q.length) * 0.02;
  return { matched: true, score, indices };
}

/** Filter to matching items and sort by descending score (stable). */
export function rankCommands<T extends { title: string }>(query: string, items: T[]): T[] {
  if (query.trim() === '') return items;
  return items
    .map((item) => ({ item, match: fuzzyMatch(query, item.title) }))
    .filter((entry) => entry.match.matched)
    .sort((a, b) => b.match.score - a.match.score)
    .map((entry) => entry.item);
}
