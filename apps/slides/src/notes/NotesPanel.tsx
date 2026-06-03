import styles from './NotesPanel.module.css';

export interface NotesPanelProps {
  notes: string;
  onChange: (notes: string) => void;
}

/**
 * Speaker notes for the active slide (shown large in presenter mode). A plain
 * tokenised textarea — the shared Input is single-line, notes are multi-line.
 */
export function NotesPanel({ notes, onChange }: NotesPanelProps) {
  return (
    <section className={styles.panel}>
      <label className={styles.label} htmlFor="speaker-notes">
        Speaker notes
      </label>
      <textarea
        id="speaker-notes"
        className={styles.textarea}
        aria-label="Speaker notes"
        placeholder="Notes for this slide…"
        value={notes}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
