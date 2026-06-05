import { type SheetEngine } from '@234/formula-engine';
import { useEffect, useState } from 'react';
import { FormulaInput } from './FormulaInput';

export interface FormulaBarProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  /** Commit the active cell's new raw content. The App owns the write so it can
   *  route through the collaboration binding when a session is active. */
  onCommit: (value: string) => void;
}

/** The cell formula bar — a `FormulaInput` bound to the active cell's raw content. */
export function FormulaBar({ engine, active, onCommit }: FormulaBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(engine.getRaw(active.row, active.col));
  }, [engine, active]);

  const commit = () => {
    onCommit(value);
  };

  return (
    <FormulaInput
      engine={engine}
      value={value}
      onChange={setValue}
      ariaLabel="Cell value or formula"
      onEnter={commit}
      onBlur={commit}
    />
  );
}
