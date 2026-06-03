import { Icon } from '@234/shared';
import { IconLayoutSidebarRightCollapse } from '@tabler/icons-react';
import { type ReactNode } from 'react';
import styles from './AiSidebar.module.css';

export interface AiSidebarProps {
  /** Open/closed — controlled by the host app via useAiSidebar. */
  open: boolean;
  /** Collapse the sidebar (user-invoked). */
  onClose: () => void;
  /** App id (writer/sheet/slides) — for per-app copy. */
  app: string;
  /** Phase 3 fills this with AI features; empty in the Phase 2 scaffold. */
  children?: ReactNode;
}

/**
 * The shared AI sidebar — root CLAUDE.md §6, the single most important design
 * principle: AI lives in a **collapsible, docked sidebar only**. It never floats
 * over content, never speaks first, and is only ever user-invoked. This Phase 2
 * scaffold carries **no AI content** — no inputs, no network, nothing runs
 * automatically. AI features arrive (opt-in, optional) in Phase 3. See
 * /docs/architecture/ai-sidebar.md.
 */
export function AiSidebar({ open, onClose, app, children }: AiSidebarProps) {
  if (!open) return null; // docked panel hidden when closed — never floats

  return (
    <aside className={styles.sidebar} role="complementary" aria-label="AI assistant">
      <header className={styles.header}>
        <span className={styles.title}>AI assistant</span>
        <button
          type="button"
          className={styles.collapse}
          aria-label="Close AI assistant"
          onClick={onClose}
        >
          <Icon icon={IconLayoutSidebarRightCollapse} size="emphasis" />
        </button>
      </header>
      <div className={styles.body}>
        {children ?? (
          <p className={styles.placeholder}>
            AI features are optional and arrive in a later release. Nothing here runs
            automatically — you stay in control, and {app} works fully with AI turned off.
          </p>
        )}
      </div>
    </aside>
  );
}
