import { Button, Input } from '@234/shared';
import { type EditorView } from 'prosemirror-view';
import { useState } from 'react';
import styles from './FindReplace.module.css';
import {
  clearSearch,
  findMatches,
  replaceAll,
  replaceCurrent,
  searchNext,
  searchPrev,
  setSearchQuery,
} from './search';

export interface FindReplaceProps {
  view: EditorView | null;
  open: boolean;
  onClose: () => void;
}

export function FindReplace({ view, open, onClose }: FindReplaceProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [count, setCount] = useState(0);

  if (!open) return null;

  const refreshCount = (q: string) => {
    setCount(view ? findMatches(view.state.doc, q).length : 0);
  };

  const onQueryChange = (next: string) => {
    setQuery(next);
    if (view) setSearchQuery(view, next);
    refreshCount(next);
  };

  return (
    <section className={styles.panel} role="search" aria-label="Find and replace">
      <Input
        aria-label="Find"
        placeholder="Find"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <Input
        aria-label="Replace with"
        placeholder="Replace with"
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <span className={styles.count}>{count} matches</span>
      <div className={styles.actions}>
        <Button size="small" variant="secondary" onClick={() => view && searchPrev(view)}>
          Previous
        </Button>
        <Button size="small" variant="secondary" onClick={() => view && searchNext(view)}>
          Next
        </Button>
        <Button
          size="small"
          onClick={() => {
            if (view) {
              replaceCurrent(view, replacement);
              refreshCount(query);
            }
          }}
        >
          Replace
        </Button>
        <Button
          size="small"
          onClick={() => {
            if (view) {
              replaceAll(view, replacement);
              refreshCount(query);
            }
          }}
        >
          Replace all
        </Button>
        <Button
          size="small"
          variant="ghost"
          onClick={() => {
            if (view) clearSearch(view);
            onClose();
          }}
        >
          Close
        </Button>
      </div>
    </section>
  );
}
