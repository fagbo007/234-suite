import { Button } from '@234/shared';
import { useEffect, useRef, useState } from 'react';
import { SlideCanvas } from '../canvas/SlideCanvas';
import { type Deck } from '../model/types';
import styles from './PresenterMode.module.css';

export interface PresenterModeProps {
  deck: Deck;
  startIndex?: number;
  onExit: () => void;
}

/**
 * Fullscreen presentation overlay: the current slide, "slide N of M",
 * prev/next, and the slide's speaker notes. Keyboard: →/Space next, ← prev,
 * Esc exit. The OS Fullscreen API and Fabric entrance playback are browser-only
 * (guarded); the overlay, navigation, and notes work everywhere (incl. jsdom).
 */
export function PresenterMode({ deck, startIndex = 0, onExit }: PresenterModeProps) {
  const total = deck.slides.length;
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, total - 1)));
  const rootRef = useRef<HTMLDivElement>(null);

  const next = () => setIndex((i) => Math.min(i + 1, total - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    // Request OS fullscreen where supported (browser-only).
    const element = rootRef.current;
    if (element && typeof element.requestFullscreen === 'function') {
      void element.requestFullscreen().catch(() => {
        /* fall back to the fixed full-window overlay */
      });
    }
    return () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') next();
      else if (event.key === 'ArrowLeft') prev();
      else if (event.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const slide = deck.slides[index];

  return (
    <div className={styles.overlay} ref={rootRef} role="dialog" aria-modal="true" aria-label="Presenter mode">
      <div className={styles.stage}>
        <SlideCanvas slide={slide} animate />
      </div>
      {slide?.notes ? (
        <div className={styles.notes} aria-label="Speaker notes">
          {slide.notes}
        </div>
      ) : null}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={prev} disabled={index === 0}>
          Previous
        </Button>
        <span className={styles.counter} role="status">
          Slide {index + 1} of {total}
        </span>
        <Button variant="secondary" onClick={next} disabled={index === total - 1}>
          Next
        </Button>
        <Button variant="ghost" onClick={onExit}>
          Exit
        </Button>
      </div>
    </div>
  );
}
