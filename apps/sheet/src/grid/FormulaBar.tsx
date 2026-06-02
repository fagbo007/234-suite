import { lintFormula, type SheetEngine } from '@234/formula-engine';
import { rankCommands } from '@234/shared';
import { useEffect, useMemo, useState } from 'react';
import styles from './FormulaBar.module.css';

const FUNCTIONS = ['SUM', 'AVERAGE', 'COUNT'];

export interface FormulaBarProps {
  engine: SheetEngine;
  active: { row: number; col: number };
  onCommit: () => void;
}

function trailingToken(value: string): string {
  const match = /[A-Za-z][A-Za-z0-9]*$/.exec(value);
  return match ? match[0] : '';
}

export function FormulaBar({ engine, active, onCommit }: FormulaBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setValue(engine.getRaw(active.row, active.col));
  }, [engine, active]);

  // A1 is permitted but discouraged — surface the lint warning (root §3.4).
  const warnings = value.startsWith('=') ? lintFormula(value) : [];
  const token = value.startsWith('=') ? trailingToken(value) : '';

  // Autocomplete: named references first (encouraged), then functions.
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

  const commit = () => {
    engine.setCell(active.row, active.col, value);
    onCommit();
  };

  const accept = (label: string) => {
    setValue((current) => current.slice(0, current.length - token.length) + label);
  };

  return (
    <div className={styles.bar}>
      <input
        className={styles.input}
        aria-label="Cell value or formula"
        value={value}
        onFocus={() => setFocused(true)}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
          } else if (event.key === 'Tab' && suggestions.length > 0) {
            event.preventDefault();
            accept(suggestions[0]!);
          }
        }}
        onBlur={() => {
          setFocused(false);
          commit();
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
