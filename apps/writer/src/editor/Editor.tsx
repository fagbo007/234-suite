import { registerCommand } from '@234/shared';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useEffect, useRef } from 'react';
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
}

/**
 * Mounts a ProseMirror editor and registers Writer's formatting commands into
 * the shared command palette. Editing is driven by the palette + intrinsic
 * shortcuts — there is no ribbon (root CLAUDE.md Section 5).
 */
export function Editor({ onReady, onUpdate }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
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

  return <div className={styles.editor} ref={hostRef} />;
}
