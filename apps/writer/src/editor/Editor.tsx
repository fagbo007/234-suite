import { type CollabDoc } from '@234/collab';
import { registerCommand } from '@234/shared';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useEffect, useRef } from 'react';
import { collabEditorPlugins, seedFragmentFromDoc } from '../collab/writerCollab';
import { writerCommands } from './commands';
import { parseFwtr } from './fwtr';
import { buildPlugins } from './keymap';
import styles from './Editor.module.css';

const INITIAL_DOCUMENT = `---
title: Untitled document
styles: []
---

# Welcome to 234 Writer

Start typing. Press Ctrl+K (Cmd+K on macOS) for the command palette, or Ctrl+F to
find and replace. Use the Styles panel to create and apply named styles.
`;

export interface EditorProps {
  /** Called once with the live view so panels (styles, find/replace) can dispatch. */
  onReady?: (view: EditorView) => void;
  /** Called after every state update — lets panels react to selection changes. */
  onUpdate?: (view: EditorView) => void;
  /** When set, the editor reconfigures to collaborate over this shared doc. */
  collabDoc?: CollabDoc | null;
  /** Host seeds the shared fragment from the current doc; a guest does not. */
  collabRole?: 'idle' | 'host' | 'guest';
}

/**
 * Mounts a ProseMirror editor and registers Writer's formatting commands into
 * the shared command palette. Editing is driven by the palette + intrinsic
 * shortcuts — there is no ribbon (root CLAUDE.md Section 5).
 *
 * When `collabDoc` is provided, the view reconfigures to bind that shared
 * `Y.XmlFragment` via y-prosemirror (and back to solo plugins when it clears).
 */
export function Editor({ onReady, onUpdate, collabDoc, collabRole }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const enteredCollabRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onUpdateRef = useRef(onUpdate);
  onReadyRef.current = onReady;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const { doc } = parseFwtr(INITIAL_DOCUMENT);
    const view: EditorView = new EditorView(host, {
      state: EditorState.create({ doc, plugins: buildPlugins() }),
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document content',
      },
      dispatchTransaction(transaction) {
        view.updateState(view.state.apply(transaction));
        onUpdateRef.current?.(view);
      },
    });
    viewRef.current = view;
    onReadyRef.current?.(view);

    const unregister = writerCommands(() => viewRef.current).map(registerCommand);

    return () => {
      for (const remove of unregister) remove();
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Enter/leave collaboration by reconfiguring the view's plugins. ySyncPlugin
  // owns the document content (renders from the fragment), so we create the
  // collab state with no `doc`; the host seeds the fragment first.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (collabDoc) {
      if (collabRole === 'host') seedFragmentFromDoc(collabDoc, view.state.doc);
      view.updateState(
        EditorState.create({ schema: view.state.schema, plugins: collabEditorPlugins(collabDoc) }),
      );
      enteredCollabRef.current = true;
    } else if (enteredCollabRef.current) {
      view.updateState(EditorState.create({ doc: view.state.doc, plugins: buildPlugins() }));
      enteredCollabRef.current = false;
    }
  }, [collabDoc, collabRole]);

  return <div className={styles.editor} ref={hostRef} />;
}
