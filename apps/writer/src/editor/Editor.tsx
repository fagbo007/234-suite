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

Start typing. Press Ctrl+K (Cmd+K on macOS) to open the command palette for
formatting commands such as bold, italic, headings, and lists.
`;

/**
 * Mounts a ProseMirror editor and registers Writer's formatting commands into
 * the shared command palette. Editing is driven by the palette + intrinsic
 * shortcuts — there is no ribbon (root CLAUDE.md Section 5).
 */
export function Editor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const { doc } = parseFwtr(INITIAL_DOCUMENT);
    const view = new EditorView(host, {
      state: EditorState.create({ doc, plugins: buildPlugins() }),
      // The editable region is interactive with no visible label — give it an
      // accessible name and textbox semantics (root CLAUDE.md Section 12).
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document content',
      },
    });
    viewRef.current = view;

    const unregister = writerCommands(() => viewRef.current).map(registerCommand);

    return () => {
      for (const remove of unregister) remove();
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return <div className={styles.editor} ref={hostRef} />;
}
