/**
 * Binds the ProseMirror editor to a shared `Y.XmlFragment` via y-prosemirror
 * (the Writer mapping in docs/architecture/collab.md). In collaboration mode the
 * editor swaps `prosemirror-history` for y-prosemirror's `yUndoPlugin` and adds
 * `ySyncPlugin` (doc ⇄ fragment) + `yCursorPlugin` (presence). The host seeds the
 * fragment from its current document; guests receive it via sync.
 */
import { OFFICE_SHORTCUTS, toProseMirrorKey } from '@234/shared';
import { type CollabDoc } from '@234/collab';
import { keymap } from 'prosemirror-keymap';
import { type Node as PMNode } from 'prosemirror-model';
import { type Plugin } from 'prosemirror-state';
import {
  prosemirrorToYXmlFragment,
  redo as yRedo,
  undo as yUndo,
  yCursorPlugin,
  ySyncPlugin,
  yUndoPlugin,
} from 'y-prosemirror';
import { sharedEditingPlugins } from '../editor/keymap';

const FRAGMENT = 'prosemirror';

/** Host: copy the current document into the shared fragment so peers see it. */
export function seedFragmentFromDoc(doc: CollabDoc, pmDoc: PMNode): void {
  prosemirrorToYXmlFragment(pmDoc, doc.xml(FRAGMENT));
}

/** Plugin set for collaboration mode: y-prosemirror sync/cursor/undo + shared editing. */
export function collabEditorPlugins(doc: CollabDoc): Plugin[] {
  return [
    ySyncPlugin(doc.xml(FRAGMENT)),
    yCursorPlugin(doc.awareness),
    yUndoPlugin(),
    keymap({
      [toProseMirrorKey(OFFICE_SHORTCUTS.undo)]: yUndo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redo)]: yRedo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redoAlt)]: yRedo,
    }),
    ...sharedEditingPlugins(),
  ];
}
