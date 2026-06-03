import { Button } from '../Button';
import styles from './ImportReportPanel.module.css';

/**
 * Structural shape of a compat ImportReport — kept local so @234/shared stays
 * dependency-free (the @234/compat ImportReport is structurally compatible).
 */
export interface ImportReportLike {
  ok: boolean;
  losses: { feature: string; detail: string }[];
}

export interface ImportReportPanelProps {
  report: ImportReportLike;
  onClose: () => void;
}

/**
 * Surfaces an MS Office import's fidelity report (root §7): the import always
 * completes; anything simplified or dropped is listed here, never hidden. Shared
 * across apps (Writer, Sheet, …) — never duplicated (root §4).
 */
export function ImportReportPanel({ report, onClose }: ImportReportPanelProps) {
  return (
    <section className={styles.panel} aria-label="Import report">
      <div className={styles.head}>
        <span className={styles.title}>Import report</span>
        <Button variant="ghost" onClick={onClose}>
          Dismiss
        </Button>
      </div>
      {report.ok ? (
        <p className={styles.ok}>Imported with no fidelity loss.</p>
      ) : (
        <ul className={styles.losses}>
          {report.losses.map((loss, index) => (
            <li key={index} className={styles.loss}>
              <span className={styles.feature}>{loss.feature}:</span> {loss.detail}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
