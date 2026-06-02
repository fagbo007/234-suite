import { type Command } from '@234/shared';
import { setBlockType, toggleMark } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { wrapInList } from 'prosemirror-schema-list';
import { type Command as PMCommand } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
import {
  bulletListNode,
  emMark,
  headingNode,
  orderedListNode,
  paragraphNode,
  strongMark,
} from './schema';

/**
 * Build the palette commands for the active editor. Editing is exposed through
 * the context-adaptive command palette (root CLAUDE.md Section 5) — there is no
 * ribbon. Each command is available only when an editor view is mounted.
 */
export function writerCommands(getView: () => EditorView | null): Command[] {
  const apply = (pmCommand: PMCommand) => () => {
    const view = getView();
    if (!view) return;
    pmCommand(view.state, view.dispatch, view);
    view.focus();
  };
  const hasView = () => getView() !== null;

  const command = (
    id: string,
    title: string,
    pmCommand: PMCommand,
    group = 'Format',
  ): Command => ({
    id,
    title,
    group,
    isAvailable: hasView,
    run: apply(pmCommand),
  });

  return [
    command('writer.bold', 'Bold', toggleMark(strongMark)),
    command('writer.italic', 'Italic', toggleMark(emMark)),
    command('writer.heading-1', 'Heading 1', setBlockType(headingNode, { level: 1 })),
    command('writer.heading-2', 'Heading 2', setBlockType(headingNode, { level: 2 })),
    command('writer.heading-3', 'Heading 3', setBlockType(headingNode, { level: 3 })),
    command('writer.paragraph', 'Paragraph', setBlockType(paragraphNode)),
    command('writer.bullet-list', 'Bullet list', wrapInList(bulletListNode)),
    command('writer.ordered-list', 'Ordered list', wrapInList(orderedListNode)),
    command('writer.undo', 'Undo', undo, 'Edit'),
    command('writer.redo', 'Redo', redo, 'Edit'),
  ];
}

/**
 * Apply a registered style (or clear it with `null`) to every top-level block
 * touched by the selection, by setting the `styleId` node attribute. The schema
 * renders that style inline — never via a className (root CLAUDE.md Section 16).
 */
export function applyStyleToSelection(view: EditorView, styleId: string | null): void {
  const { state } = view;
  const { from, to } = state.selection;
  const tr = state.tr;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type === paragraphNode || node.type === headingNode) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, styleId });
      return false;
    }
    return true;
  });
  if (tr.docChanged) {
    view.dispatch(tr);
    view.focus();
  }
}

/**
 * Force styled blocks to re-render after a style's *properties* change (the
 * schema's `toDOM` re-reads the active registry). Not added to undo history.
 */
export function refreshStyledBlocks(view: EditorView): void {
  const { state } = view;
  const tr = state.tr;
  state.doc.descendants((node, pos) => {
    const styleId: unknown = node.attrs.styleId;
    if ((node.type === paragraphNode || node.type === headingNode) && styleId) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs });
      return false;
    }
    return true;
  });
  if (tr.steps.length > 0) view.dispatch(tr.setMeta('addToHistory', false));
}
