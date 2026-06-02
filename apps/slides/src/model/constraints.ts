import { type SlideObject } from './types';

/**
 * Auto-layout constraint check. **Phase 1 stub — always returns `true`.**
 *
 * Every object placement triggers this check (root CLAUDE.md Section 3,
 * apps/slides/CLAUDE.md Section 3). The real logic — spacing grid, smart
 * alignment snapping, design guardrails — is a Phase 2 deliverable. The call
 * site is wired now; the logic is intentionally not implemented yet (Section 16).
 */
export function constraintCheck(_objects: SlideObject[]): boolean {
  return true;
}
