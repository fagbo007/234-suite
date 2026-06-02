import { colToLabel } from '@234/formula-engine';
import { DATE_FORMATS, type DateFormat } from '../dates';
import { type ColumnType } from '../fwsh';
import styles from './ColumnInspector.module.css';

export interface ColumnSchemaValue {
  type: ColumnType;
  dateFormat?: DateFormat;
}

export interface ColumnInspectorProps {
  col: number;
  schema: ColumnSchemaValue | undefined;
  onChange: (col: number, schema: ColumnSchemaValue) => void;
}

const TYPES: ColumnType[] = ['text', 'number', 'date'];

/**
 * Declare the active column's type and (for date columns) the locked format.
 * Dates are only interpreted in declared date columns; values are never coerced
 * (root CLAUDE.md §2.2).
 */
export function ColumnInspector({ col, schema, onChange }: ColumnInspectorProps) {
  const type = schema?.type ?? 'text';
  const dateFormat: DateFormat = schema?.dateFormat ?? 'YYYY-MM-DD';

  return (
    <section className={styles.panel} aria-label="Column inspector">
      <span className={styles.heading}>Column {colToLabel(col)}</span>
      <label className={styles.field}>
        <span className={styles.label}>Type</span>
        <select
          className={styles.select}
          aria-label="Column type"
          value={type}
          onChange={(event) => {
            const nextType = event.target.value as ColumnType;
            onChange(col, {
              type: nextType,
              dateFormat: nextType === 'date' ? dateFormat : undefined,
            });
          }}
        >
          {TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {type === 'date' ? (
        <label className={styles.field}>
          <span className={styles.label}>Date format</span>
          <select
            className={styles.select}
            aria-label="Date format"
            value={dateFormat}
            onChange={(event) =>
              onChange(col, { type: 'date', dateFormat: event.target.value as DateFormat })
            }
          >
            {DATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}
