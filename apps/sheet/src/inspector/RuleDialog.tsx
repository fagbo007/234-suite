import { type SheetEngine } from '@234/formula-engine';
import { Button } from '@234/shared';
import { useState } from 'react';
import { FormulaInput } from '../grid/FormulaInput';
import styles from './RuleDialog.module.css';

export interface RuleDialogProps {
  engine: SheetEngine;
  title: string;
  /** Apply a predicate formula (uses the `value` keyword for the cell). */
  onApply: (predicate: string) => void;
  onClose: () => void;
}

/**
 * Reusable rule dialog for conditional formatting and data validation. The
 * predicate is a full formula entered via `FormulaInput`, so it autocompletes
 * named refs/functions — the real fix for "conditional formatting dialog has no
 * formula helper" (root CLAUDE.md §2.2). Use `value` for the cell under test.
 */
export function RuleDialog({ engine, title, onApply, onClose }: RuleDialogProps) {
  const [predicate, setPredicate] = useState('');

  return (
    <section className={styles.panel} aria-label={title}>
      <span className={styles.heading}>{title}</span>
      <p className={styles.hint}>
        Use <code>value</code> for the cell, e.g. <code>value &gt; 10</code> or{' '}
        <code>AND(value &gt; 0, value &lt; A1)</code>.
      </p>
      <FormulaInput
        engine={engine}
        value={predicate}
        onChange={setPredicate}
        ariaLabel="Predicate formula"
      />
      <div className={styles.actions}>
        <Button size="small" onClick={() => onApply(predicate)}>
          Apply
        </Button>
        <Button size="small" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
