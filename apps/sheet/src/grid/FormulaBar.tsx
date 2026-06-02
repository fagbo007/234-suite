import { type SheetEngine } from '@234/formula-engine';
import { useEffect, useState } from 'react';
import { FormulaInput } from './FormulaInput';

export interface FormulaBarProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onCommit: () => void;
}

/** The cell formula bar — a `FormulaInput` bound to the active cell's raw content. */
export function FormulaBar({ engine, active, onCommit }: FormulaBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(engine.getRaw(active.row, active.col));
  }, [engine, active]);

  const commit = () => {
    engine.setCell(active.row, active.col, value);
    onCommit();
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
