import { type SheetEngine } from '@234/formula-engine';
import { Button, Input } from '@234/shared';
import { useState } from 'react';
import { FormulaInput } from '../grid/FormulaInput';
import { type Chart, type ChartType } from './chart';
import styles from './ChartDialog.module.css';

const TYPES: ChartType[] = ['bar', 'line', 'pie'];

export interface ChartDialogProps {
  engine: SheetEngine;
  onApply: (chart: Chart) => void;
  onClose: () => void;
}

export function ChartDialog({ engine, onApply, onClose }: ChartDialogProps) {
  const [type, setType] = useState<ChartType>('bar');
  const [range, setRange] = useState('');
  const [title, setTitle] = useState('Chart');

  return (
    <section className={styles.panel} aria-label="Chart">
      <span className={styles.heading}>Insert chart</span>
      <label className={styles.field}>
        <span className={styles.label}>Type</span>
        <select
          className={styles.select}
          aria-label="Chart type"
          value={type}
          onChange={(event) => setType(event.target.value as ChartType)}
        >
          {TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <Input
        aria-label="Chart title"
        placeholder="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className={styles.rangeField}>
        <span className={styles.label}>Data range</span>
        <FormulaInput engine={engine} value={range} onChange={setRange} ariaLabel="Data range" />
      </div>
      <div className={styles.actions}>
        <Button size="small" onClick={() => onApply({ type, range, title })}>
          Apply
        </Button>
        <Button size="small" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
