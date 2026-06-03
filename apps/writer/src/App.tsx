import { AiSidebar, useAiSidebar } from '@234/ai-sidebar';
import {
  Button,
  CommandPalette,
  OFFICE_SHORTCUTS,
  registerCommand,
  toggleTheme,
  useCommandPalette,
  useShortcuts,
} from '@234/shared';
import { type EditorView } from 'prosemirror-view';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './App.module.css';
import {
  applyStyleToSelection,
  insertImage,
  refreshStyledBlocks,
  selectedImage,
  type SelectedImage,
} from './editor/commands';
import { Editor } from './editor/Editor';
import { FindReplace } from './editor/FindReplace';
import { ImagePanel } from './editor/ImagePanel';
import { StyleEditor } from './editor/StyleEditor';
import { defaultStyleRegistry, setActiveStyleRegistry, type StyleRegistry } from './editor/styles';

export default function App() {
  const palette = useCommandPalette();
  const [registry, setRegistry] = useState<StyleRegistry>(defaultStyleRegistry);
  const [view, setView] = useState<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [imageSel, setImageSel] = useState<SelectedImage | null>(null);
  const ai = useAiSidebar('writer');

  const viewRef = useRef<EditorView | null>(null);
  viewRef.current = view;

  const handleReady = useCallback((nextView: EditorView) => setView(nextView), []);
  const handleUpdate = useCallback((updated: EditorView) => {
    setImageSel(selectedImage(updated.state));
  }, []);

  // Insert an image via a file picker → data URL (no Tauri file API yet).
  const pickImage = useCallback(() => {
    const current = viewRef.current;
    if (!current) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (viewRef.current && typeof reader.result === 'string') {
          insertImage(viewRef.current, { src: reader.result });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  useEffect(() => {
    setActiveStyleRegistry(registry);
    if (view) refreshStyledBlocks(view);
  }, [registry, view]);

  // MS Office shortcut compat (root §9): Ctrl/Cmd+F opens find. Bold/italic/undo/
  // redo are bound in the editor keymap from the same OFFICE_SHORTCUTS catalog.
  useShortcuts({ [OFFICE_SHORTCUTS.find]: () => setFindOpen(true) });

  useEffect(() => {
    const unregister = [
      registerCommand({ id: 'writer.find', title: 'Find and replace', group: 'Edit', run: () => setFindOpen(true) }),
      registerCommand({ id: 'writer.insert-image', title: 'Insert image', group: 'Insert', run: pickImage }),
      registerCommand({ id: 'writer.edit-styles', title: 'Edit styles', group: 'Format', run: () => setStylesOpen(true) }),
      registerCommand({ id: 'writer.ai', title: 'Toggle AI assistant', group: 'AI', run: () => ai.toggle() }),
      registerCommand({ id: 'writer.toggle-theme', title: 'Toggle theme', group: 'View', run: () => toggleTheme() }),
      registerCommand({ id: 'writer.about', title: 'About 234 Writer', group: 'Help', run: () => console.info('234 Writer — Phase 2') }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, [pickImage, ai]);

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
          <Button variant="ghost" onClick={pickImage}>
            Insert image
          </Button>
          <Button variant="ghost" onClick={ai.toggle}>
            AI assistant
          </Button>
          <Button variant="secondary" onClick={palette.open}>
            Command palette
          </Button>
        </div>
      </header>

      {findOpen ? <FindReplace view={view} open={findOpen} onClose={() => setFindOpen(false)} /> : null}

      <div className={styles.workspace}>
        <div className={styles.editorArea}>
          <Editor onReady={handleReady} onUpdate={handleUpdate} />
        </div>
        {imageSel && view ? (
          <ImagePanel view={view} image={imageSel} />
        ) : stylesOpen ? (
          <StyleEditor registry={registry} onChange={setRegistry} onApply={applyStyle} />
        ) : null}
        <AiSidebar open={ai.isOpen} onClose={ai.close} app="writer" />
      </div>

      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'writer' }} />
    </div>
  );
}
