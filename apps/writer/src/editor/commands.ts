import { type Command } from '@234/shared';
import { setBlockType, toggleMark } from 'prosemirror-commands';
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

  const command = (id: string, title: string, pmCommand: PMCommand): Command => ({
    id,
    title,
    group: 'Format',
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
  ];
}
