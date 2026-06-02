import { cellToA1, lintFormula, type SheetEngine } from '@234/formula-engine';
import { useEffect, useState } from 'react';
import styles from './FormulaBar.module.css';

export interface FormulaBarProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onCommit: () => void;
}

export function FormulaBar({ engine, active, onCommit }: FormulaBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(engine.getRaw(active.row, active.col));
  }, [engine, active]);

  // A1 is permitted but discouraged — surface the lint warning (root §3.4).
  const warnings = value.startsWith('=') ? lintFormula(value) : [];

  const commit = () => {
    engine.setCell(active.row, active.col, value);
    onCommit();
  };

  return (
    <div className={styles.bar}>
      <span className={styles.ref}>{cellToA1(active)}</span>
      <input
        className={styles.input}
        aria-label="Cell value or formula"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
        onBlur={commit}
      />
      {warnings.length > 0 ? (
        <span className={styles.warning} role="status">
          {warnings[0]?.message}
        </span>
      ) : null}
    </div>
  );
}
