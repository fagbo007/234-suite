import { type SheetEngine } from '@234/formula-engine';
import { Button } from '@234/shared';
import { useState } from 'react';
import { FormulaInput } from '../grid/FormulaInput';
import { COMPARISON_OPS, type ComparisonOp } from '../rules';
import styles from './RuleDialog.module.css';

export interface RuleDraft {
  op: ComparisonOp;
  threshold: string;
}

export interface RuleDialogProps {
  engine: SheetEngine;
  title: string;
  onApply: (rule: RuleDraft) => void;
  onClose: () => void;
}

/**
 * Reusable rule dialog for conditional formatting and data validation. The
 * threshold uses `FormulaInput`, so it autocompletes named refs/functions —
 * satisfying "autocomplete in every formula dialog" (root CLAUDE.md §2.2).
 */
export function RuleDialog({ engine, title, onApply, onClose }: RuleDialogProps) {
  const [op, setOp] = useState<ComparisonOp>('>');
  const [threshold, setThreshold] = useState('');

  return (
    <section className={styles.panel} aria-label={title}>
      <span className={styles.heading}>{title}</span>
      <div className={styles.row}>
        <span className={styles.label}>Cell value</span>
        <select
          className={styles.select}
          aria-label="Operator"
          value={op}
          onChange={(event) => setOp(event.target.value as ComparisonOp)}
        >
          {COMPARISON_OPS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FormulaInput
          engine={engine}
          value={threshold}
          onChange={setThreshold}
          ariaLabel="Threshold"
        />
      </div>
      <div className={styles.actions}>
        <Button size="small" onClick={() => onApply({ op, threshold })}>
          Apply
        </Button>
        <Button size="small" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
