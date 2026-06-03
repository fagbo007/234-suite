import {
  Button,
  CommandPalette,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './App.module.css';
import { SlideCanvas } from './canvas/SlideCanvas';
import { PLACEHOLDER_IMAGE } from './model/assets';
import { findViolations } from './model/constraints';
import { addObject, addSlide, createDeck, deleteSlide, reorderSlide, tidySlide } from './model/deck';
import { type SlideObject } from './model/types';
import { SlidePanel } from './panel/SlidePanel';

function makeText(): SlideObject {
  return { id: crypto.randomUUID(), kind: 'text', x: 80, y: 80, width: 320, height: 60, text: 'New text', fontSize: 28 };
}
function makeRect(): SlideObject {
  return { id: crypto.randomUUID(), kind: 'rect', x: 120, y: 160, width: 240, height: 140, fill: 'cornflowerblue' };
}
function makeImage(): SlideObject {
  return { id: crypto.randomUUID(), kind: 'image', x: 120, y: 120, width: 160, height: 120, src: PLACEHOLDER_IMAGE };
}

export default function App() {
  const palette = useCommandPalette();
  const [deck, setDeck] = useState(() => createDeck());
  const [activeIndex, setActiveIndex] = useState(0);

  // Latest state for palette command closures (registered once on mount).
  const stateRef = useRef({ deck, activeIndex });
  stateRef.current = { deck, activeIndex };

  const insert = useCallback((factory: () => SlideObject) => {
    setDeck((current) => {
      const slide = current.slides[stateRef.current.activeIndex];
      if (!slide) return current;
      return addObject(current, slide.id, factory());
    });
  }, []);

  const tidy = useCallback(() => {
    setDeck((current) => {
      const slide = current.slides[stateRef.current.activeIndex];
      if (!slide) return current;
      return tidySlide(current, slide.id);
    });
  }, []);

  useEffect(() => {
    const unregister = [
      registerCommand({ id: 'slides.add-text', title: 'Add text', group: 'Insert', run: () => insert(makeText) }),
      registerCommand({ id: 'slides.add-rect', title: 'Add rectangle', group: 'Insert', run: () => insert(makeRect) }),
      registerCommand({ id: 'slides.add-image', title: 'Add image', group: 'Insert', run: () => insert(makeImage) }),
      registerCommand({ id: 'slides.tidy', title: 'Tidy slide', group: 'Arrange', run: () => tidy() }),
      registerCommand({ id: 'slides.toggle-theme', title: 'Toggle theme', group: 'View', run: () => toggleTheme() }),
      registerCommand({ id: 'slides.about', title: 'About 234 Slides', group: 'Help', run: () => console.info('234 Slides — Phase 1') }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, [insert, tidy]);

  const handleAdd = () => {
    setActiveIndex(deck.slides.length);
    setDeck((current) => addSlide(current));
  };
  const handleDelete = (index: number) => {
    setActiveIndex((i) => Math.max(0, Math.min(i, deck.slides.length - 2)));
    setDeck((current) => deleteSlide(current, index));
  };
  const handleMove = (from: number, to: number) => {
    setActiveIndex(to);
    setDeck((current) => reorderSlide(current, from, to));
  };

  const activeSlide = deck.slides[activeIndex];
  const issueCount = activeSlide ? findViolations(activeSlide.objects).length : 0;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Slides</h1>
        {issueCount > 0 ? (
          <span className={styles.issues} role="status">
            {issueCount} layout {issueCount === 1 ? 'issue' : 'issues'}
          </span>
        ) : null}
        <Button variant="secondary" onClick={palette.open}>
          Command palette
        </Button>
      </header>
      <div className={styles.workspace}>
        <SlidePanel
          deck={deck}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onMove={handleMove}
        />
        <SlideCanvas slide={activeSlide} />
      </div>
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'slides' }} />
    </div>
  );
}
