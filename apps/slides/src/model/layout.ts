/**
 * Auto-layout engine (pure). Spacing grid + smart alignment snapping +
 * guardrails — the "hard to make an ugly slide" logic (root §2.3,
 * apps/slides/CLAUDE.md §3). No Fabric here; the canvas wires snap-on-drag.
 */

export const CANVAS = { width: 960, height: 540 };
export const GRID = 8;
export const SNAP = 6;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Guide {
  axis: 'x' | 'y';
  position: number;
}

export function snapToGrid(value: number, grid = GRID): number {
  return Math.round(value / grid) * grid;
}

/**
 * Snap one axis: align the object's start/centre/end to the nearest candidate
 * line within SNAP; otherwise fall back to the spacing grid.
 */
function snapAxis(
  start: number,
  size: number,
  candidates: number[],
): { value: number; guide: number | null } {
  const lines = [start, start + size / 2, start + size];
  let best: { delta: number; guide: number } | null = null;
  for (const line of lines) {
    for (const candidate of candidates) {
      const delta = candidate - line;
      if (Math.abs(delta) <= SNAP && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, guide: candidate };
      }
    }
  }
  if (best) return { value: start + best.delta, guide: best.guide };
  return { value: snapToGrid(start), guide: null };
}

/** Snap an object's position to neighbours' edges/centres, the canvas centre, or the grid. */
export function snapPosition(obj: Bounds, others: Bounds[]): { x: number; y: number; guides: Guide[] } {
  const xCandidates = [0, CANVAS.width / 2, CANVAS.width];
  const yCandidates = [0, CANVAS.height / 2, CANVAS.height];
  for (const other of others) {
    xCandidates.push(other.x, other.x + other.width / 2, other.x + other.width);
    yCandidates.push(other.y, other.y + other.height / 2, other.y + other.height);
  }

  const sx = snapAxis(obj.x, obj.width, xCandidates);
  const sy = snapAxis(obj.y, obj.height, yCandidates);
  const guides: Guide[] = [];
  if (sx.guide !== null) guides.push({ axis: 'x', position: sx.guide });
  if (sy.guide !== null) guides.push({ axis: 'y', position: sy.guide });
  return { x: sx.value, y: sy.value, guides };
}

/** The alignment guide lines that would show for an object being moved. */
export function alignmentGuides(obj: Bounds, others: Bounds[]): Guide[] {
  return snapPosition(obj, others).guides;
}
