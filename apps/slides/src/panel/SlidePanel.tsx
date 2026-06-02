import { Icon } from '@234/shared';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { type Deck } from '../model/types';
import styles from './SlidePanel.module.css';

export interface SlidePanelProps {
  deck: Deck;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function SlidePanel({ deck, activeIndex, onSelect, onAdd, onDelete, onMove }: SlidePanelProps) {
  return (
    <nav className={styles.panel} aria-label="Slides">
      <div className={styles.headerRow}>
        <span className={styles.heading}>Slides</span>
        <button type="button" className={styles.iconButton} aria-label="Add slide" onClick={onAdd}>
          <Icon icon={IconPlus} size="meta" />
        </button>
      </div>
      <ol className={styles.list}>
        {deck.slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={slide.id} className={isActive ? `${styles.item} ${styles.active}` : styles.item}>
              <button
                type="button"
                className={styles.thumb}
                aria-label={`Select slide ${index + 1}`}
                aria-current={isActive}
                onClick={() => onSelect(index)}
              >
                {index + 1}
              </button>
              <div className={styles.controls}>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Move slide ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  <Icon icon={IconArrowUp} size="meta" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Move slide ${index + 1} down`}
                  disabled={index === deck.slides.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  <Icon icon={IconArrowDown} size="meta" />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Delete slide ${index + 1}`}
                  onClick={() => onDelete(index)}
                >
                  <Icon icon={IconTrash} size="meta" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
