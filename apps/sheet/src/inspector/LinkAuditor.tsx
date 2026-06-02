import { cellToA1, type SheetEngine } from '@234/formula-engine';
import styles from './LinkAuditor.module.css';

export interface LinkAuditorProps {
  engine: SheetEngine;
  /** Re-audit when this changes (after edits). */
  revision: number;
}

/**
 * Surfaces external references (URLs / workbook / cross-sheet) per cell so
 * "ghost" external links are never invisible (root CLAUDE.md §2.2).
 */
export function LinkAuditor({ engine, revision }: LinkAuditorProps) {
  const links = engine.auditExternalLinks();

  return (
    <section className={styles.panel} aria-label="External links" data-revision={revision}>
      <span className={styles.heading}>External links</span>
      {links.length === 0 ? (
        <p className={styles.empty}>No external references found.</p>
      ) : (
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={`${link.row},${link.col}`} className={styles.item}>
              <span className={styles.ref}>{cellToA1(link)}</span>
              <span className={styles.refs}>{link.refs.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
