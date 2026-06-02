import { lintFormula, type SheetEngine } from '@234/formula-engine';
import { rankCommands } from '@234/shared';
import { useMemo, useState } from 'react';
import styles from './FormulaInput.module.css';

const FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT'];

export interface FormulaInputProps {
  engine: SheetEngine;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  onEnter?: () => void;
  onBlur?: () => void;
}

function trailingToken(value: string): string {
  const match = /[A-Za-z][A-Za-z0-9]*$/.exec(value);
  return match ? match[0] : '';
}

/**
 * Reusable formula input with token-aware autocomplete (named refs first, then
 * functions) + the A1 lint warning. Used by the formula bar and every formula
 * dialog so autocomplete is available in all contexts (root CLAUDE.md §2.2/§3.4).
 */
export function FormulaInput({ engine, value, onChange, ariaLabel, onEnter, onBlur }: FormulaInputProps) {
  const [focused, setFocused] = useState(false);

  const warnings = lintFormula(value); // empty/no-A1 → no warnings
  const token = trailingToken(value);

  const suggestions = useMemo(() => {
    if (token === '') return [];
    const names = rankCommands(
      token,
      engine.names().map((name) => ({ title: name })),
    ).map((item) => item.title);
    const fns = rankCommands(
      token,
      FUNCTIONS.map((fn) => ({ title: fn })),
    ).map((item) => item.title);
    return [...names, ...fns].slice(0, 6);
  }, [token, engine]);

  const accept = (label: string) => {
    onChange(value.slice(0, value.length - token.length) + label);
  };

  return (
    <div className={styles.field}>
      <input
        className={styles.input}
        aria-label={ariaLabel}
        value={value}
        onFocus={() => setFocused(true)}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onEnter?.();
          } else if (event.key === 'Tab' && suggestions.length > 0) {
            event.preventDefault();
            accept(suggestions[0]!);
          }
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      {focused && suggestions.length > 0 ? (
        <ul className={styles.suggestions} role="listbox" aria-label="Formula suggestions">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={false}
              className={styles.suggestion}
              onMouseDown={(event) => {
                event.preventDefault();
                accept(suggestion);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <span className={styles.warning} role="status">
          {warnings[0]?.message}
        </span>
      ) : null}
    </div>
  );
}
