import { type Command } from '@234/shared';
import { setBlockType, toggleMark } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { wrapInList } from 'prosemirror-schema-list';
import { type Node as PMNode } from 'prosemirror-model';
import { type Command as PMCommand, NodeSelection, type EditorState } from 'prosemirror-state';
import { type EditorView } from 'prosemirror-view';
import {
  bulletListNode,
  emMark,
  headingNode,
  type ImageAnchor,
  imageNode,
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

// --- Selection helpers (Phase 3 AI) ---

/** The plain text of the current selection (blocks joined by a space). */
export function selectedText(state: EditorState): string {
  const { from, to } = state.selection;
  return state.doc.textBetween(from, to, ' ');
}

/** Replace the current selection with plain text (e.g. an AI rephrase result). */
export function replaceSelection(view: EditorView, text: string): void {
  view.dispatch(view.state.tr.insertText(text));
  view.focus();
}

/** Insert plain text at the cursor / end of selection (e.g. AI continuation). */
export function insertText(view: EditorView, text: string): void {
  const { to } = view.state.selection;
  view.dispatch(view.state.tr.insertText(text, to));
  view.focus();
}

// --- Image block (Phase 2 part 2) ---

export interface SelectedImage {
  node: PMNode;
  pos: number;
}

/** The currently selected image, if the selection is a NodeSelection on one. */
export function selectedImage(state: EditorState): SelectedImage | null {
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.node.type === imageNode) {
    return { node: selection.node, pos: selection.from };
  }
  return null;
}

/** Insert a block image at the selection. Images never float (draggable:false). */
export function insertImage(
  view: EditorView,
  attrs: { src: string; alt?: string; anchor?: ImageAnchor },
): void {
  const node = imageNode.create({
    src: attrs.src,
    alt: attrs.alt ?? '',
    anchor: attrs.anchor ?? 'center',
  });
  view.dispatch(view.state.tr.replaceSelectionWith(node));
  view.focus();
}

/** Set the anchor (left/center/right) of the selected image — the anchor picker. */
export function setImageAnchor(view: EditorView, anchor: ImageAnchor): void {
  const selected = selectedImage(view.state);
  if (!selected) return;
  view.dispatch(
    view.state.tr.setNodeMarkup(selected.pos, undefined, { ...selected.node.attrs, anchor }),
  );
  view.focus();
}
