import {
  Button,
  CommandPalette,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { useEffect } from 'react';

export default function App() {
  const palette = useCommandPalette();

  useEffect(() => {
    const unregister = [
      registerCommand({
        id: 'slides.toggle-theme',
        title: 'Toggle theme',
        group: 'View',
        run: () => toggleTheme(),
      }),
      registerCommand({
        id: 'slides.about',
        title: 'About 234 Slides',
        group: 'Help',
        run: () => console.info('234 Slides — Phase 1 scaffold'),
      }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, []);

  return (
    <main>
      <h1>234 Slides — Phase 1 scaffold</h1>
      <p>Presentation shell. The Fabric.js canvas arrives in Phase 1, Step 5.</p>
      <Button variant="secondary" onClick={palette.open}>
        Open command palette
      </Button>
      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.close}
        context={{ app: 'slides' }}
      />
    </main>
  );
}
