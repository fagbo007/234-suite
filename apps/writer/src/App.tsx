import {
  Button,
  CommandPalette,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { type EditorView } from 'prosemirror-view';
import { useCallback, useEffect, useState } from 'react';
import styles from './App.module.css';
import { applyStyleToSelection, refreshStyledBlocks } from './editor/commands';
import { Editor } from './editor/Editor';
import { FindReplace } from './editor/FindReplace';
import { StyleEditor } from './editor/StyleEditor';
import { defaultStyleRegistry, setActiveStyleRegistry, type StyleRegistry } from './editor/styles';

export default function App() {
  const palette = useCommandPalette();
  const [registry, setRegistry] = useState<StyleRegistry>(defaultStyleRegistry);
  const [view, setView] = useState<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(true);

  const handleReady = useCallback((nextView: EditorView) => setView(nextView), []);

  // Keep the schema's active registry in sync and re-render styled blocks when a
  // style's properties change.
  useEffect(() => {
    setActiveStyleRegistry(registry);
    if (view) refreshStyledBlocks(view);
  }, [registry, view]);

  // Ctrl/Cmd+F opens find & replace.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setFindOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const unregister = [
      registerCommand({
        id: 'writer.find',
        title: 'Find and replace',
        group: 'Edit',
        run: () => setFindOpen(true),
      }),
      registerCommand({
        id: 'writer.edit-styles',
        title: 'Edit styles',
        group: 'Format',
        run: () => setStylesOpen(true),
      }),
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
        run: () => console.info('234 Writer — Phase 2'),
      }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, []);

  const applyStyle = (styleId: string) => {
    if (view) applyStyleToSelection(view, styleId);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Writer</h1>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setStylesOpen((open) => !open)}>
            Styles
          </Button>
          <Button variant="ghost" onClick={() => setFindOpen(true)}>
            Find
          </Button>
          <Button variant="secondary" onClick={palette.open}>
            Command palette
          </Button>
        </div>
      </header>

      {findOpen ? <FindReplace view={view} open={findOpen} onClose={() => setFindOpen(false)} /> : null}

      <div className={styles.workspace}>
        <div className={styles.editorArea}>
          <Editor onReady={handleReady} />
        </div>
        {stylesOpen ? (
          <StyleEditor registry={registry} onChange={setRegistry} onApply={applyStyle} />
        ) : null}
      </div>

      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'writer' }} />
    </div>
  );
}
