import { OFFICE_SHORTCUTS, toProseMirrorKey } from '@234/shared';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { type Plugin } from 'prosemirror-state';
import { emMark, listItemNode, strongMark } from './schema';
import { searchPlugin } from './search';

/**
 * Core editing plugins: history + intrinsic shortcuts. The formatting/history
 * bindings are derived from the shared MS Office shortcut catalog
 * (`OFFICE_SHORTCUTS`, root CLAUDE.md §9) so a shortcut is defined once and the
 * editor stays consistent with app-level bindings.
 */
export function buildPlugins(): Plugin[] {
  return [
    // Unlimited undo within a session (root CLAUDE.md Section 9).
    history({ depth: Infinity }),
    searchPlugin,
    keymap({
      [toProseMirrorKey(OFFICE_SHORTCUTS.bold)]: toggleMark(strongMark),
      [toProseMirrorKey(OFFICE_SHORTCUTS.italic)]: toggleMark(emMark),
      [toProseMirrorKey(OFFICE_SHORTCUTS.undo)]: undo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redo)]: redo,
      [toProseMirrorKey(OFFICE_SHORTCUTS.redoAlt)]: redo,
      Enter: splitListItem(listItemNode),
      'Mod-[': liftListItem(listItemNode),
      'Mod-]': sinkListItem(listItemNode),
    }),
    keymap(baseKeymap),
  ];
}
