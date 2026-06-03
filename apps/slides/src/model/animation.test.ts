import { describe, expect, it } from 'vitest';
import {
  addAnimation,
  ANIMATION_CATEGORIES,
  animationsByCategory,
  createAnimation,
  EFFECTS,
  playbackOrder,
  removeAnimation,
  updateAnimation,
} from './animation';
import { type Slide, type SlideObject } from './types';

function rect(id: string): SlideObject {
  return { id, kind: 'rect', x: 0, y: 0, width: 100, height: 40, fill: 'black' };
}

describe('animation model', () => {
  it('exposes only the three v1 categories', () => {
    expect(ANIMATION_CATEGORIES).toEqual(['entrance', 'emphasis', 'exit']);
  });

  it('creates an animation from the category catalog', () => {
    const anim = createAnimation('entrance', 'fade', 300);
    expect(anim.category).toBe('entrance');
    expect(anim.effect).toBe('fade');
    expect(anim.durationMs).toBe(300);
    expect(anim.id).toMatch(/^anim-/);
  });

  it('rejects an effect not in the category catalog', () => {
    expect(() => createAnimation('emphasis', 'fade')).toThrow();
    expect(EFFECTS.emphasis).not.toContain('fade');
  });

  it('adds, updates, and removes animations immutably', () => {
    const base = rect('a');
    const anim = createAnimation('entrance', 'fade');
    const added = addAnimation(base, anim);
    expect(base.animations).toBeUndefined(); // original untouched
    expect(added.animations).toHaveLength(1);

    const updated = updateAnimation(added, anim.id, { durationMs: 999 });
    expect(updated.animations?.[0]?.durationMs).toBe(999);

    const removed = removeAnimation(updated, anim.id);
    expect(removed.animations).toHaveLength(0);
  });

  it('groups an object animations by category', () => {
    let obj = rect('a');
    obj = addAnimation(obj, createAnimation('entrance', 'fade'));
    obj = addAnimation(obj, createAnimation('exit', 'zoom-out'));
    const grouped = animationsByCategory(obj);
    expect(grouped.entrance).toHaveLength(1);
    expect(grouped.exit).toHaveLength(1);
    expect(grouped.emphasis).toHaveLength(0);
  });

  it('orders playback category-major across objects', () => {
    const a = addAnimation(rect('a'), createAnimation('exit', 'fade'));
    const b = addAnimation(
      addAnimation(rect('b'), createAnimation('entrance', 'fade')),
      createAnimation('emphasis', 'pulse'),
    );
    const slide: Slide = { id: 's1', objects: [a, b] };
    const order = playbackOrder(slide).map((step) => step.animation.category);
    expect(order).toEqual(['entrance', 'emphasis', 'exit']);
  });
});
