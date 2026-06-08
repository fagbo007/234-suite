import { AiActionPanel, AiSettings, AiSidebar, useAiSettings, useAiSidebar } from '@234/ai-sidebar';
import { exportPptx, importPptx, type ImportReport } from '@234/compat';
import {
  Button,
  CollabPanel,
  CommandPalette,
  ImportReportPanel,
  registerCommand,
  toggleTheme,
  useCommandPalette,
} from '@234/shared';
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { slidesActions } from './ai/slidesActions';
import { AnimationPanel } from './anim/AnimationPanel';
import { useCollabSession, usePresence } from '@234/collab';
import { bindDeck, type DeckBinding } from './collab/bindDeck';
import { modelToPptxDeck, pptxDeckToModel } from './compat/pptxMap';
import styles from './App.module.css';
import { SlideCanvas } from './canvas/SlideCanvas';
import { compressImage, fileToDataUrl } from './canvas/imageImport';
import { findViolations } from './model/constraints';
import {
  addObject,
  addSlide,
  createDeck,
  deleteSlide,
  reorderSlide,
  setSlideNotes,
  tidySlide,
  updateObject,
} from './model/deck';
import { type Deck, type SlideObject } from './model/types';
import { NotesPanel } from './notes/NotesPanel';
import { SlidePanel } from './panel/SlidePanel';
import { PresenterMode } from './presenter/PresenterMode';

function makeText(): SlideObject {
  return { id: crypto.randomUUID(), kind: 'text', x: 80, y: 80, width: 320, height: 60, text: 'New text', fontSize: 28 };
}
function makeRect(): SlideObject {
  return { id: crypto.randomUUID(), kind: 'rect', x: 120, y: 160, width: 240, height: 140, fill: 'cornflowerblue' };
}
function makeImage(src: string): SlideObject {
  return { id: crypto.randomUUID(), kind: 'image', x: 120, y: 120, width: 320, height: 240, src };
}
function makeAiText(text: string): SlideObject {
  return { id: crypto.randomUUID(), kind: 'text', x: 80, y: 80, width: 640, height: 360, text, fontSize: 20 };
}

export default function App() {
  const palette = useCommandPalette();
  const [deck, setDeck] = useState(() => createDeck());
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAnimations, setShowAnimations] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const ai = useAiSidebar('slides');
  const { settings: aiSettings, setSettings: setAiSettings, provider: aiProvider } = useAiSettings();
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collab = useCollabSession();
  const peers = usePresence(collab.doc, undefined, { slide: activeIndex });
  const [collabOpen, setCollabOpen] = useState(false);
  const bindingRef = useRef<DeckBinding | null>(null);
  const applyingRemoteRef = useRef(false);

  // Latest state for palette command closures (registered once on mount).
  const stateRef = useRef({ deck, activeIndex });
  stateRef.current = { deck, activeIndex };

  // Collaboration: bind the deck to the shared doc while a session is active.
  // Remote changes apply via setDeck behind a guard; local changes are pushed by
  // the [deck] effect below. Off by default — solo editing is unchanged.
  const collabDoc = collab.doc;
  const collabRole = collab.role;
  useEffect(() => {
    if (!collabDoc) return;
    const binding = bindDeck(collabDoc, (remote: Deck) => {
      applyingRemoteRef.current = true;
      setDeck(remote);
      setActiveIndex((i) => (remote.slides.length === 0 ? 0 : Math.min(i, remote.slides.length - 1)));
    });
    bindingRef.current = binding;
    if (collabRole === 'host') binding.seed(stateRef.current.deck);
    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [collabDoc, collabRole]);

  useEffect(() => {
    if (!bindingRef.current) return;
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    bindingRef.current.pushDeck(deck);
  }, [deck]);

  const insert = useCallback((factory: () => SlideObject) => {
    setDeck((current) => {
      const slide = current.slides[stateRef.current.activeIndex];
      if (!slide) return current;
      return addObject(current, slide.id, factory());
    });
  }, []);

  const importImage = useCallback(() => fileInputRef.current?.click(), []);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const src = await compressImage(await fileToDataUrl(file));
    setDeck((current) => {
      const slide = current.slides[stateRef.current.activeIndex];
      if (!slide) return current;
      return addObject(current, slide.id, makeImage(src));
    });
  };

  const tidy = useCallback(() => {
    setDeck((current) => {
      const slide = current.slides[stateRef.current.activeIndex];
      if (!slide) return current;
      return tidySlide(current, slide.id);
    });
  }, []);

  // Open a .pptx → replace the deck (via @234/compat) + show the import report.
  const openPptx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.arrayBuffer().then((buffer) => {
        const { deck: pptx, report } = importPptx(new Uint8Array(buffer));
        const model = pptxDeckToModel(pptx);
        if (model.slides.length > 0) {
          setActiveIndex(0);
          setDeck(model);
        }
        setImportReport(report);
      });
    };
    input.click();
  }, []);

  // Export the deck to a downloadable .pptx.
  const handleExportPptx = useCallback(() => {
    const bytes = exportPptx(modelToPptxDeck(stateRef.current.deck));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'presentation.pptx';
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const unregister = [
      registerCommand({ id: 'slides.add-text', title: 'Add text', group: 'Insert', run: () => insert(makeText) }),
      registerCommand({ id: 'slides.add-rect', title: 'Add rectangle', group: 'Insert', run: () => insert(makeRect) }),
      registerCommand({ id: 'slides.import-image', title: 'Import image', group: 'Insert', run: () => importImage() }),
      registerCommand({ id: 'slides.open-pptx', title: 'Open .pptx', group: 'File', run: openPptx }),
      registerCommand({ id: 'slides.export-pptx', title: 'Export .pptx', group: 'File', run: handleExportPptx }),
      registerCommand({ id: 'slides.tidy', title: 'Tidy slide', group: 'Arrange', run: () => tidy() }),
      registerCommand({
        id: 'slides.animate',
        title: 'Animate objects',
        group: 'Animate',
        run: () => setShowAnimations((value) => !value),
      }),
      registerCommand({
        id: 'slides.present',
        title: 'Start presentation',
        group: 'View',
        run: () => setPresenting(true),
      }),
      registerCommand({
        id: 'slides.collaborate',
        title: 'Collaborate',
        group: 'Collaborate',
        run: () => setCollabOpen(true),
      }),
      registerCommand({ id: 'slides.ai', title: 'Toggle AI assistant', group: 'AI', run: () => ai.toggle() }),
      registerCommand({ id: 'slides.toggle-theme', title: 'Toggle theme', group: 'View', run: () => toggleTheme() }),
      registerCommand({ id: 'slides.about', title: 'About 234 Slides', group: 'Help', run: () => console.info('234 Slides — Phase 2') }),
    ];
    return () => {
      for (const remove of unregister) remove();
    };
  }, [insert, tidy, importImage, ai, openPptx, handleExportPptx]);

  const handleAdd = () => {
    setActiveIndex(deck.slides.length);
    setDeck((current) => addSlide(current));
  };
  const handleDelete = (index: number) => {
    setActiveIndex((i) => Math.max(0, Math.min(i, deck.slides.length - 2)));
    setDeck((current) => deleteSlide(current, index));
  };
  const handleMove = (from: number, to: number) => {
    setActiveIndex(to);
    setDeck((current) => reorderSlide(current, from, to));
  };

  const activeSlide = deck.slides[activeIndex];
  const issueCount = activeSlide ? findViolations(activeSlide.objects).length : 0;

  const handleNotesChange = (notes: string) => {
    if (!activeSlide) return;
    setDeck((current) => setSlideNotes(current, activeSlide.id, notes));
  };
  const handleUpdateObject = (objectId: string, updater: (object: SlideObject) => SlideObject) => {
    if (!activeSlide) return;
    setDeck((current) => updateObject(current, activeSlide.id, objectId, updater));
  };
  const handleAddText = (text: string) => {
    if (!activeSlide) return;
    setDeck((current) => addObject(current, activeSlide.id, makeAiText(text)));
  };

  if (presenting) {
    return <PresenterMode deck={deck} startIndex={activeIndex} onExit={() => setPresenting(false)} />;
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>234 Slides</h1>
        {issueCount > 0 ? (
          <span className={styles.issues} role="status">
            {issueCount} layout {issueCount === 1 ? 'issue' : 'issues'}
          </span>
        ) : null}
        <Button variant="secondary" onClick={importImage}>
          Import image
        </Button>
        <Button variant="secondary" onClick={() => setPresenting(true)}>
          Present
        </Button>
        <Button variant="ghost" onClick={openPptx}>
          Open .pptx
        </Button>
        <Button variant="ghost" onClick={handleExportPptx}>
          Export .pptx
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
      </header>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Import image file"
        hidden
        onChange={onFileChange}
      />
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
        <SlidePanel
          deck={deck}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onMove={handleMove}
          peers={peers}
        />
        <div className={styles.editor}>
          <SlideCanvas slide={activeSlide} />
          <NotesPanel notes={activeSlide?.notes ?? ''} onChange={handleNotesChange} />
        </div>
        {showAnimations ? <AnimationPanel slide={activeSlide} onUpdateObject={handleUpdateObject} /> : null}
        <AiSidebar open={ai.isOpen} onClose={ai.close} app="slides">
          <AiSettings settings={aiSettings} onChange={setAiSettings} />
          <AiActionPanel
            actions={slidesActions({
              slide: activeSlide,
              onAddText: handleAddText,
              onSetNotes: handleNotesChange,
            })}
            provider={aiProvider}
          />
        </AiSidebar>
      </div>
      <CommandPalette isOpen={palette.isOpen} onClose={palette.close} context={{ app: 'slides' }} />
    </div>
  );
}
