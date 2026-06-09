import { Button } from '../Button';
import styles from './RecentFiles.module.css';

/** Structural shape of a recent file (avoids a `@234/desktop` dependency). */
export interface RecentFileLike {
  path: string;
  name: string;
}

export interface RecentFilesProps {
  items: RecentFileLike[];
  onOpen: (path: string) => void;
  onClear: () => void;
}

/**
 * Shared docked "Recent files" panel: re-open a recently used document without
 * the dialog. App-agnostic (structural props, like `CollabPanel`).
 */
export function RecentFiles({ items, onOpen, onClear }: RecentFilesProps) {
  return (
    <section className={styles.panel} aria-label="Recent files">
      <h2 className={styles.title}>Recent files</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>No recent files</p>
      ) : (
        <>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.path}>
                <button
                  type="button"
                  className={styles.entry}
                  title={item.path}
                  onClick={() => onOpen(item.path)}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </>
      )}
    </section>
  );
}
