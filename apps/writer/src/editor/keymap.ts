import { OFFICE_SHORTCUTS, toProseMirrorKey } from '@234/shared';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { type Plugin } from 'prosemirror-state';
import { emMark, listItemNode, strongMark } from './schema';
import { searchPlugin } from './search';

/**
 * Formatting + list keymaps, search, and the base keymap — the editing plugins
 * shared by solo mode and collaboration mode. Undo/redo is layered separately
 * (prosemirror-history in solo, y-prosemirror's yUndo in collab) so the two
 * modes don't fight over the history stack.
 */
export function sharedEditingPlugins(): Plugin[] {
  return [
    searchPlugin,
    keymap({
      [toProseMirrorKey(OFFICE_SHORTCUTS.bold)]: toggleMark(strongMark),
      [toProseMirrorKey(OFFICE_SHORTCUTS.italic)]: toggleMark(emMark),
      Enter: splitListItem(listItemNode),
      'Mod-[': liftListItem(listItemNode),
      'Mod-]': sinkListItem(listItemNode),
    }),
    keymap(baseKeymap),
  ];
}

/**
 * Solo-mode plugins: unlimited-depth history + the shared editing plugins. The
 * bindings come from the shared MS Office shortcut catalog (`OFFICE_SHORTCUTS`,
 * root CLAUDE.md §9). Collaboration mode swaps history for y-prosemirror's undo
 * (see `collab/writerCollab.ts`).
 */
export function buildPlugins(): Plugin[] {
  return [
    // Unlimited undo within a session (root CLAUDE.md Section 9).
    history({ depth: Infinity }),
    keymap({
      [toProseMirrorKey(OFFICE_SHORTCUTS.undo)]: undo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redo)]: redo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redoAlt)]: redo,
    }),
    ...sharedEditingPlugins(),
  ];
}
