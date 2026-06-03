import { Button, Icon } from '@234/shared';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  addAnimation,
  ANIMATION_CATEGORIES,
  createAnimation,
  DEFAULT_DURATION_MS,
  EFFECTS,
  removeAnimation,
} from '../model/animation';
import { type AnimationCategory, type Slide, type SlideObject } from '../model/types';
import styles from './AnimationPanel.module.css';

export interface AnimationPanelProps {
  slide: Slide | undefined;
  onUpdateObject: (objectId: string, updater: (object: SlideObject) => SlideObject) => void;
}

function objectLabel(object: SlideObject, index: number): string {
  return `${index + 1}. ${object.kind}`;
}

/**
 * Edits per-object animations on the active slide. Object selection is model
 * driven (a list of the slide's objects) rather than Fabric-canvas selection,
 * so the panel is fully testable without a 2D context. Only the three v1
 * categories are offered (apps/slides/CLAUDE.md §5).
 */
export function AnimationPanel({ slide, onUpdateObject }: AnimationPanelProps) {
  const objects = slide?.objects ?? [];
  const [selectedId, setSelectedId] = useState<string>(objects[0]?.id ?? '');
  const [category, setCategory] = useState<AnimationCategory>('entrance');
  const [effect, setEffect] = useState<string>(EFFECTS.entrance[0]!);
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_MS);

  const selected = objects.find((o) => o.id === selectedId) ?? objects[0];

  const changeCategory = (next: AnimationCategory) => {
    setCategory(next);
    setEffect(EFFECTS[next][0]!);
  };

  const add = () => {
    if (!selected) return;
    onUpdateObject(selected.id, (o) => addAnimation(o, createAnimation(category, effect, duration)));
  };

  const remove = (animationId: string) => {
    if (!selected) return;
    onUpdateObject(selected.id, (o) => removeAnimation(o, animationId));
  };

  if (objects.length === 0) {
    return (
      <section className={styles.panel} aria-label="Animations">
        <h2 className={styles.heading}>Animations</h2>
        <p className={styles.empty}>Add an object to the slide to animate it.</p>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="Animations">
      <h2 className={styles.heading}>Animations</h2>

      <label className={styles.field}>
        <span className={styles.label}>Object</span>
        <select
          className={styles.select}
          aria-label="Object to animate"
          value={selected?.id ?? ''}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {objects.map((object, index) => (
            <option key={object.id} value={object.id}>
              {objectLabel(object, index)}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select
            className={styles.select}
            aria-label="Animation category"
            value={category}
            onChange={(event) => changeCategory(event.target.value as AnimationCategory)}
          >
            {ANIMATION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Effect</span>
          <select
            className={styles.select}
            aria-label="Animation effect"
            value={effect}
            onChange={(event) => setEffect(event.target.value)}
          >
            {EFFECTS[category].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Duration (ms)</span>
          <input
            className={styles.number}
            type="number"
            min={0}
            step={50}
            aria-label="Animation duration in milliseconds"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </label>
      </div>

      <Button variant="secondary" onClick={add}>
        Add animation
      </Button>

      <ul className={styles.list}>
        {(selected?.animations ?? []).map((animation) => (
          <li key={animation.id} className={styles.item}>
            <span className={styles.itemText}>
              {animation.category} · {animation.effect} · {animation.durationMs}ms
            </span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Remove ${animation.category} ${animation.effect} animation`}
              onClick={() => remove(animation.id)}
            >
              <Icon icon={IconTrash} size="meta" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
