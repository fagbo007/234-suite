/**
 * Animation model (pure). The simplified v1 model exposes only three categories
 * — entrance, emphasis, exit (apps/slides/CLAUDE.md §5) — each with a small
 * fixed catalog of effects. This fixes PowerPoint's "advanced animations require
 * a steep learning curve" pain (root §2.3). No Fabric here; the canvas/presenter
 * play these back in-browser.
 */

import { type Animation, type AnimationCategory, type Slide, type SlideObject } from './types';

export const ANIMATION_CATEGORIES: readonly AnimationCategory[] = ['entrance', 'emphasis', 'exit'];

/** Fixed effect catalog per category — only these are offered (keeps it simple). */
export const EFFECTS: Record<AnimationCategory, readonly string[]> = {
  entrance: ['fade', 'slide-in', 'zoom-in'],
  emphasis: ['pulse', 'spin'],
  exit: ['fade', 'slide-out', 'zoom-out'],
};

export const DEFAULT_DURATION_MS = 500;

function newId(): string {
  return `anim-${crypto.randomUUID()}`;
}

/** Build an animation; the effect must belong to the category's catalog. */
export function createAnimation(
  category: AnimationCategory,
  effect: string,
  durationMs: number = DEFAULT_DURATION_MS,
): Animation {
  if (!EFFECTS[category].includes(effect)) {
    throw new Error(`Unknown ${category} effect: ${effect}`);
  }
  return { id: newId(), category, effect, durationMs };
}

/** Immutably append an animation to an object. */
export function addAnimation(object: SlideObject, animation: Animation): SlideObject {
  return { ...object, animations: [...(object.animations ?? []), animation] };
}

/** Immutably remove an animation by id. */
export function removeAnimation(object: SlideObject, animationId: string): SlideObject {
  return {
    ...object,
    animations: (object.animations ?? []).filter((a) => a.id !== animationId),
  };
}

/** Immutably patch an animation by id (e.g. change effect or duration). */
export function updateAnimation(
  object: SlideObject,
  animationId: string,
  patch: Partial<Omit<Animation, 'id'>>,
): SlideObject {
  return {
    ...object,
    animations: (object.animations ?? []).map((a) => (a.id === animationId ? { ...a, ...patch } : a)),
  };
}

/** The animations on an object grouped by category. */
export function animationsByCategory(object: SlideObject): Record<AnimationCategory, Animation[]> {
  const grouped: Record<AnimationCategory, Animation[]> = { entrance: [], emphasis: [], exit: [] };
  for (const animation of object.animations ?? []) {
    grouped[animation.category].push(animation);
  }
  return grouped;
}

export interface PlaybackStep {
  objectId: string;
  animation: Animation;
}

/**
 * The order animations play in a slide: category-major (all entrances, then all
 * emphases, then all exits), object order within a category. A clean default
 * that reinforces the "hard to make an ugly slide" guardrail.
 */
export function playbackOrder(slide: Slide): PlaybackStep[] {
  const steps: PlaybackStep[] = [];
  for (const category of ANIMATION_CATEGORIES) {
    for (const object of slide.objects) {
      for (const animation of object.animations ?? []) {
        if (animation.category === category) steps.push({ objectId: object.id, animation });
      }
    }
  }
  return steps;
}
