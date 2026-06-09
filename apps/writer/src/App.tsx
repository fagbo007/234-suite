import {
  AiActionPanel,
  AiSettings,
  AiSidebar,
  registerProvider,
  useAiSettings,
  useAiSidebar,
} from '@234/ai-sidebar';
import { exportDocx, importDocx, type ImportReport } from '@234/compat';
import { openTextFile, saveTextFile } from '@234/desktop';
import { loadPlugins, sampleProviderPlugin, usePluginManager, type Plugin } from '@234/plugin-host';
import {
  Button,
  CollabPanel,
  CommandPalette,
  ImportReportPanel,
  OFFICE_SHORTCUTS,
  PluginManager,
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
import { docToMarkdown, markdownToDoc, parseFwtr, serializeFwtr } from './editor/fwtr';
import { Editor } from './editor/Editor';
import { FindReplace } from './editor/FindReplace';
import { ImagePanel } from './editor/ImagePanel';
import { StyleEditor } from './editor/StyleEditor';
import { defaultStyleRegistry, setActiveStyleRegistry, type StyleRegistry } from './editor/styles';
import { writerActions } from './ai/writerActions';
import { useCollabSession, usePresence } from '@234/collab';
import { bindStyles, type StylesBinding } from './collab/bindStyles';

// In-tree, opt-in plugins loaded through the plugin host (root §9; plugin-api.md).
// Append further in-tree plugins here; dynamic/remote loading is Phase-4-proper.
const BUILTIN_PLUGINS: Plugin[] = [sampleProviderPlugin];

const FWTR_FILTER = { name: '234 Writer', extensions: ['fwtr'] };

export default function App() {
  const palette = useCommandPalette();
  const [registry, setRegistry] = useState<StyleRegistry>(defaultStyleRegistry);
  const [view, setView] = useState<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(true);
  const [imageSel, setImageSel] = useState<SelectedImage | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const ai = useAiSidebar('writer');
  const { settings: aiSettings, setSettings: setAiSettings, provider: aiProvider } = useAiSettings();
  const collab = useCollabSession();
  const peers = usePresence(collab.doc);
  const [collabOpen, setCollabOpen] = useState(false);
  const plugins = usePluginManager(BUILTIN_PLUGINS);

  const viewRef = useRef<EditorView | null>(null);
  viewRef.current = view;
  const registryRef = useRef(registry);
  registryRef.current = registry;
  const stylesBindingRef = useRef<StylesBinding | null>(null);
  const applyingRemoteStylesRef = useRef(false);

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

  // Open a .docx → Markdown (via @234/compat) → replace the editor doc + report.
  const openDocx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then((buffer) => {
        const { markdown, report } = importDocx(new Uint8Array(buffer));
        const current = viewRef.current;
        if (current) {
          const doc = markdownToDoc(markdown);
          current.dispatch(current.state.tr.replaceWith(0, current.state.doc.content.size, doc.content));
          current.focus();
        }
        setImportReport(report);
      });
    };
    input.click();
  }, []);

  // Save the document to a native .fwtr (OS dialog on desktop; download on web).
  const saveFwtr = useCallback(() => {
    const current = viewRef.current;
    if (!current) return;
    const text = serializeFwtr({
      title: 'Untitled document',
      styles: registryRef.current,
      doc: current.state.doc,
    });
    void saveTextFile({ defaultName: 'document.fwtr', contents: text, filter: FWTR_FILTER });
  }, []);

  // Open a native .fwtr → replace the editor doc + style registry.
  const openFwtr = useCallback(() => {
    void openTextFile({ filter: FWTR_FILTER }).then((result) => {
      if (!result) return;
      const { doc, styles } = parseFwtr(result.contents);
      const current = viewRef.current;
      if (current) {
        current.dispatch(current.state.tr.replaceWith(0, current.state.doc.content.size, doc.content));
        current.focus();
      }
      setRegistry(styles);
    });
  }, []);

  // Export the current document to a downloadable .docx.
  const handleExportDocx = useCallback(() => {
    const current = viewRef.current;
    if (!current) return;
    const bytes = exportDocx(docToMarkdown(current.state.doc));
    // Copy into a concrete ArrayBuffer (Uint8Array is generic over ArrayBufferLike).
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'document.docx';
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    setActiveStyleRegistry(registry);
    if (view) refreshStyledBlocks(view);
  }, [registry, view]);

  // Load the enabled in-tree plugins through the host (commands + AI providers).
  // Re-runs when the user toggles a plugin: cleanup tears down the old set, the
  // rerun registers the new one (so disabling a provider removes it live).
  useEffect(
    () =>
      loadPlugins(plugins.enabledPlugins, {
        app: 'writer',
        registerCommand,
        registerAiProvider: registerProvider,
      }),
    [plugins.enabledPlugins],
  );

  // Collaboration: sync the style registry (definitions) over the shared doc.
  // Block styleId attrs + images already sync as ProseMirror nodes; this carries
  // the Style definitions so a peer renders styled blocks correctly. Off by
  // default — solo editing is unchanged.
  useEffect(() => {
    const doc = collab.doc;
    if (!doc) return;
    const binding = bindStyles(doc, (remoteRegistry) => {
      applyingRemoteStylesRef.current = true;
      setRegistry(remoteRegistry);
    });
    stylesBindingRef.current = binding;
    if (collab.role === 'host') binding.seed(registryRef.current);
    return () => {
      binding.destroy();
      stylesBindingRef.current = null;
    };
  }, [collab.doc, collab.role]);

  useEffect(() => {
    if (!stylesBindingRef.current) return;
    if (applyingRemoteStylesRef.current) {
      applyingRemoteStylesRef.current = false;
      return;
    }
    stylesBindingRef.current.pushStyles(registry);
  }, [registry]);

  // MS Office shortcut compat (root §9): Ctrl/Cmd+F opens find. Bold/italic/undo/
  // redo are bound in the editor keymap from the same OFFICE_SHORTCUTS catalog.
  useShortcuts({ [OFFICE_SHORTCUTS.find]: () => setFindOpen(true) });

  useEffect(() => {
    const unregister = [
      registerCommand({ id: 'writer.open', title: 'Open', group: 'File', run: openFwtr }),
      registerCommand({ id: 'writer.save', title: 'Save', group: 'File', run: saveFwtr }),
      registerCommand({ id: 'writer.find', title: 'Find and replace', group: 'Edit', run: () => setFindOpen(true) }),
      registerCommand({ id: 'writer.insert-image', title: 'Insert image', group: 'Insert', run: pickImage }),
      registerCommand({ id: 'writer.open-docx', title: 'Open .docx', group: 'File', run: openDocx }),
      registerCommand({ id: 'writer.export-docx', title: 'Export .docx', group: 'File', run: handleExportDocx }),
      registerCommand({ id: 'writer.edit-styles', title: 'Edit styles', group: 'Format', run: () => setStylesOpen(true) }),
      registerCommand({ id: 'writer.collaborate', title: 'Collaborate', group: 'Collaborate', run: () => setCollabOpen(true) }),
      registerCommand({ id: 'writer.ai', title: 'Toggle AI assistant', group: 'AI', run: () => ai.toggle() }),
      registerCommand({ id: 'writer.toggle-theme', title: 'Toggle theme', group: 'View', run: () => toggleTheme() }),
      registerCommand({ id: 'writer.about', title: 'About 234 Writer', group: 'Help', run: () => console.info('234 Writer — Phase 2') }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, [pickImage, openDocx, handleExportDocx, openFwtr, saveFwtr, ai]);

  const applyStyle = (styleId: string) => {
    if (view) applyStyleToSelection(view, styleId);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Writer</h1>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={openFwtr}>
            Open
          </Button>
          <Button variant="ghost" onClick={saveFwtr}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setStylesOpen((open) => !open)}>
            Styles
          </Button>
          <Button variant="ghost" onClick={() => setFindOpen(true)}>
            Find
          </Button>
          <Button variant="ghost" onClick={pickImage}>
            Insert image
          </Button>
          <Button variant="ghost" onClick={openDocx}>
            Open .docx
          </Button>
          <Button variant="ghost" onClick={handleExportDocx}>
            Export .docx
          </Button>
          <Button variant="ghost" onClick={ai.toggle}>
            AI assistant
          </Button>
          <Button variant="ghost" onClick={() => setCollabOpen((open) => !open)}>
            Collaborate
          </Button>
          <Button variant="secondary" onClick={palette.open}>
            Command palette
          </Button>
        </div>
      </header>

      {findOpen ? <FindReplace view={view} open={findOpen} onClose={() => setFindOpen(false)} /> : null}

      {importReport ? (
        <ImportReportPanel report={importReport} onClose={() => setImportReport(null)} />
      ) : null}

      {collabOpen ? (
        <CollabPanel
          active={collab.active}
          code={collab.code}
          onStart={collab.start}
          onJoin={collab.join}
          onLeave={collab.leave}
          peers={peers}
        />
      ) : null}

      <div className={styles.workspace}>
        <div className={styles.editorArea}>
          <Editor
            onReady={handleReady}
            onUpdate={handleUpdate}
            collabDoc={collab.doc}
            collabRole={collab.role}
          />
        </div>
        {imageSel && view ? (
          <ImagePanel view={view} image={imageSel} />
        ) : stylesOpen ? (
          <StyleEditor registry={registry} onChange={setRegistry} onApply={applyStyle} />
        ) : null}
        <AiSidebar open={ai.isOpen} onClose={ai.close} app="writer">
          <AiSettings settings={aiSettings} onChange={setAiSettings} />
          <AiActionPanel actions={writerActions(view)} provider={aiProvider} />
          <PluginManager items={plugins.items} onToggle={plugins.setEnabled} />
        </AiSidebar>
      </div>

      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'writer' }} />
    </div>
  );
}
