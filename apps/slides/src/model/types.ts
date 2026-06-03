/**
 * 234 Slides document model. Plain data, independent of Fabric.js so it can be
 * tested and benchmarked without a canvas 2D context. The Fabric renderer
 * (src/canvas) projects this model onto a canvas.
 *
 * Colours are CSS colour names (canvas content, not UI chrome — canvas cannot
 * resolve CSS custom properties).
 */

export type SlideObjectKind = 'text' | 'rect' | 'image';

/**
 * Simplified v1 animation model — three categories only (entrance / emphasis /
 * exit), per apps/slides/CLAUDE.md §5. The effect names per category live in
 * model/animation.ts. Stored as plain data so it round-trips through `.fwsl`.
 */
export type AnimationCategory = 'entrance' | 'emphasis' | 'exit';

export interface Animation {
  id: string;
  category: AnimationCategory;
  effect: string;
  durationMs: number;
}

interface BaseObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional per-object animations (entrance/emphasis/exit). */
  animations?: Animation[];
}

export interface TextObject extends BaseObject {
  kind: 'text';
  text: string;
  fontSize: number;
}

export interface RectObject extends BaseObject {
  kind: 'rect';
  fill: string;
}

export interface ImageObject extends BaseObject {
  kind: 'image';
  /** base64 data URL or a referenced path (root CLAUDE.md Section 7). */
  src: string;
}

export type SlideObject = TextObject | RectObject | ImageObject;

export interface Slide {
  id: string;
  objects: SlideObject[];
  /** Optional speaker notes shown in presenter mode. */
  notes?: string;
}

export interface Deck {
  slides: Slide[];
}
