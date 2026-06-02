import {
  Button,
  CommandPalette,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { useEffect } from 'react';
import styles from './App.module.css';
import { Editor } from './editor';

export default function App() {
  const palette = useCommandPalette();

  useEffect(() => {
    const unregister = [
      registerCommand({
        id: 'writer.toggle-theme',
        title: 'Toggle theme',
        group: 'View',
        run: () => toggleTheme(),
      }),
      registerCommand({
        id: 'writer.about',
        title: 'About 234 Writer',
        group: 'Help',
        run: () => console.info('234 Writer — Phase 1'),
      }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, []);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Writer</h1>
        <Button variant="secondary" onClick={palette.open}>
          Command palette
        </Button>
      </header>
      <Editor />
      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.close}
        context={{ app: 'writer' }}
      />
    </div>
  );
}
