import { Button, Input } from '@234/shared';
import styles from './StyleEditor.module.css';
import {
  addStyle,
  createStyle,
  removeStyle,
  renameStyle,
  updateStyle,
  type StyleRegistry,
} from './styles';

export interface StyleEditorProps {
  registry: StyleRegistry;
  onChange: (registry: StyleRegistry) => void;
  /** Apply the given style to the current editor selection. */
  onApply: (styleId: string) => void;
}

/**
 * Visual style editor — create / rename / delete / edit named styles and apply
 * them to the selection. Styles are registered objects rendered inline by the
 * schema; this panel never sets className-based styling (root CLAUDE.md §16).
 */
export function StyleEditor({ registry, onChange, onApply }: StyleEditorProps) {
  return (
    <section className={styles.panel} aria-label="Styles">
      <div className={styles.header}>
        <span className={styles.heading}>Styles</span>
        <Button
          size="small"
          variant="secondary"
          onClick={() => onChange(addStyle(registry, createStyle('New style')))}
        >
          Add style
        </Button>
      </div>
      <ul className={styles.list}>
        {registry.map((style) => (
          <li key={style.id} className={styles.item}>
            <Input
              aria-label={`Name for ${style.name}`}
              value={style.name}
              onChange={(event) => onChange(renameStyle(registry, style.id, event.target.value))}
            />
            <Input
              aria-label={`Font size for ${style.name}`}
              value={style.properties.fontSize ?? ''}
              onChange={(event) =>
                onChange(updateStyle(registry, style.id, { fontSize: event.target.value }))
              }
            />
            <label className={styles.weight}>
              <span className={styles.weightLabel}>Weight</span>
              <select
                className={styles.select}
                aria-label={`Font weight for ${style.name}`}
                value={style.properties.fontWeight ?? 400}
                onChange={(event) =>
                  onChange(
                    updateStyle(registry, style.id, {
                      fontWeight: Number(event.target.value) as 400 | 500,
                    }),
                  )
                }
              >
                <option value={400}>Regular</option>
                <option value={500}>Medium</option>
              </select>
            </label>
            <div className={styles.actions}>
              <Button size="small" onClick={() => onApply(style.id)}>
                Apply
              </Button>
              <Button
                size="small"
                variant="ghost"
                onClick={() => onChange(removeStyle(registry, style.id))}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
