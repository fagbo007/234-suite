import { cellToA1, type SheetEngine } from '@234/formula-engine';
import { useEffect, useState } from 'react';
import styles from './NameBox.module.css';

export interface NameBoxProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onCommit: () => void;
}

/**
 * Excel-style name box: shows the active cell's named reference (or its A1) and
 * lets the user name the cell. Names are the encouraged, structurally-stable
 * reference path (root CLAUDE.md §3.4). Existing names autocomplete via datalist.
 */
export function NameBox({ engine, active, onCommit }: NameBoxProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(engine.nameAt(active.row, active.col) ?? cellToA1(active));
  }, [engine, active]);

  const commit = () => {
    const name = value.trim();
    if (name !== '' && name !== cellToA1(active)) {
      engine.defineName(name, active.row, active.col);
      onCommit();
    }
  };

  return (
    <div className={styles.box}>
      <input
        className={styles.input}
        aria-label="Cell name"
        list="name-box-suggestions"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      <datalist id="name-box-suggestions">
        {engine.names().map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
