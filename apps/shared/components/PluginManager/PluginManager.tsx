import styles from './PluginManager.module.css';

/** Structural shape of a plugin row (avoids a `@234/plugin-host` dependency). */
export interface PluginManagerItemLike {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PluginManagerProps {
  items: PluginManagerItemLike[];
  onToggle: (id: string, enabled: boolean) => void;
}

/**
 * Shared docked "Plugins" section: one row per in-tree plugin with an
 * enable/disable toggle. App-agnostic (structural props, like `CollabPanel`).
 * Renders nothing when there are no plugins to manage.
 */
export function PluginManager({ items, onToggle }: PluginManagerProps) {
  if (items.length === 0) return null;
  return (
    <section className={styles.panel} aria-label="Plugins">
      <h2 className={styles.title}>Plugins</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={item.enabled}
                aria-label={item.name}
                onChange={(event) => onToggle(item.id, event.target.checked)}
              />
              {item.name}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
