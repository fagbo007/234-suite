import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import { type Plugin } from 'prosemirror-state';
import { emMark, listItemNode, strongMark } from './schema';

/**
 * Core editing plugins: history + intrinsic shortcuts. Mod-b / Mod-i are basic
 * editing affordances; the broader MS Office shortcut compatibility layer is a
 * Phase 2 deliverable (root CLAUDE.md Section 9).
 */
export function buildPlugins(): Plugin[] {
  return [
    history(),
    keymap({
      'Mod-b': toggleMark(strongMark),
      'Mod-i': toggleMark(emMark),
      'Mod-z': undo,
      'Mod-y': redo,
      'Shift-Mod-z': redo,
      Enter: splitListItem(listItemNode),
      'Mod-[': liftListItem(listItemNode),
      'Mod-]': sinkListItem(listItemNode),
    }),
    keymap(baseKeymap),
  ];
}
