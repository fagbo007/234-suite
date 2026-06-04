import { Button, Icon } from '@234/shared';
import {
  IconFileText,
  IconPresentation,
  IconTable,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import styles from './App.module.css';

type AppId = 'writer' | 'sheet' | 'slides';

interface SuiteApp {
  id: AppId;
  name: string;
  description: string;
  icon: TablerIcon;
}

const APPS: SuiteApp[] = [
  { id: 'writer', name: '234 Writer', description: 'Word processor', icon: IconFileText },
  { id: 'sheet', name: '234 Sheet', description: 'Spreadsheet', icon: IconTable },
  { id: 'slides', name: '234 Slides', description: 'Presentations', icon: IconPresentation },
];

// True only inside the Tauri desktop shell; false in the plain web dev build.
function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export default function App() {
  const [message, setMessage] = useState<string | null>(null);

  async function launch(app: SuiteApp) {
    if (!isDesktop()) {
      setMessage('Launching apps is available in the desktop suite.');
      return;
    }
    try {
      await invoke('launch_app', { app: app.id });
      setMessage(null);
    } catch (err) {
      setMessage(`Could not open ${app.name}: ${String(err)}`);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 suite</h1>
        <p className={styles.subtitle}>Open an app to get started.</p>
      </header>

      <ul className={styles.grid}>
        {APPS.map((app) => (
          <li key={app.id} className={styles.card}>
            <Icon icon={app.icon} size={32} />
            <span className={styles.cardName}>{app.name}</span>
            <span className={styles.cardDesc}>{app.description}</span>
            <Button onClick={() => void launch(app)} aria-label={`Open ${app.name}`}>
              Open
            </Button>
          </li>
        ))}
      </ul>

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}
    </main>
  );
}
