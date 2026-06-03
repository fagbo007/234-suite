import { Button } from '@234/shared';
import { type ImportReport } from '@234/compat';
import styles from './ImportReportPanel.module.css';

export interface ImportReportPanelProps {
  report: ImportReport;
  onClose: () => void;
}

/**
 * Surfaces an MS Office import's fidelity report (root §7): the import always
 * completes; anything simplified or dropped is listed here, never hidden.
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
