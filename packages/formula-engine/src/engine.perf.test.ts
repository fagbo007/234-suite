import { describe, expect, it } from 'vitest';
import { SheetEngine } from './engine';

/**
 * Section 8 Phase 2 gate: evaluate 10,000 formula cells in under 500ms. Measures
 * the cost we control (tokenize + parse + resolve + arithmetic) over 10k
 * independent formula cells; best-of-5 to avoid CI noise. The threshold is never
 * weakened — fix the engine if it regresses (root §16).
 */
describe('formula engine performance (Section 8 gate)', () => {
  it('evaluates 10,000 formula cells in under 500ms', () => {
    const N = 10_000;
    const engine = new SheetEngine();
    for (let r = 0; r < N; r++) {
      engine.setCell(r, 0, String(r)); // A<r+1> = r
      engine.setCell(r, 1, `=A${r + 1}*2+1`); // B<r+1> = 2r + 1
    }

    const measure = () => {
      const start = performance.now();
      let acc = 0;
      for (let r = 0; r < N; r++) acc += Number(engine.getValue(r, 1));
      return { elapsed: performance.now() - start, acc };
    };

    let best = Infinity;
    let acc = 0;
    for (let i = 0; i < 5; i++) {
      const run = measure();
      best = Math.min(best, run.elapsed);
      acc = run.acc;
    }

    // sum of (2r+1) for r in [0, N) = N^2 — proves it actually computed.
    expect(acc).toBe(N * N);
    expect(best).toBeLessThan(500);
    engine.destroy();
  });
});
