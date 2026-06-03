import { CANVAS } from './layout';
import { type SlideObject } from './types';

/**
 * Auto-layout guardrails (root §2.3, apps/slides/CLAUDE.md §3). Phase 2: real
 * logic — flags overlapping objects and objects outside the canvas. Every object
 * placement runs `constraintCheck`; `findViolations` gives the detail for the UI.
 */
export type ViolationKind = 'overlap' | 'off-canvas';

export interface Violation {
  kind: ViolationKind;
  objectIds: string[];
}

function overlaps(a: SlideObject, b: SlideObject): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function offCanvas(o: SlideObject): boolean {
  return o.x < 0 || o.y < 0 || o.x + o.width > CANVAS.width || o.y + o.height > CANVAS.height;
}

export function findViolations(objects: SlideObject[]): Violation[] {
  const violations: Violation[] = [];
  for (const object of objects) {
    if (offCanvas(object)) violations.push({ kind: 'off-canvas', objectIds: [object.id] });
  }
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]!;
      const b = objects[j]!;
      if (overlaps(a, b)) violations.push({ kind: 'overlap', objectIds: [a.id, b.id] });
    }
  }
  return violations;
}

export function constraintCheck(objects: SlideObject[]): boolean {
  return findViolations(objects).length === 0;
}
