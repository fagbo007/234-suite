import { OFFICE_SHORTCUTS, toProseMirrorKey } from '@234/shared';
import { undo } from 'prosemirror-history';
import { EditorState } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';
import { buildPlugins } from './keymap';
import { schema } from './schema';

describe('editor shortcut catalog', () => {
  it('derives the bold binding from the shared MS Office catalog (Mod-b)', () => {
    expect(toProseMirrorKey(OFFICE_SHORTCUTS.bold)).toBe('Mod-b');
    expect(buildPlugins().length).toBeGreaterThan(0);
  });
});

describe('editor history', () => {
  it('undo reverts an edit (history plugin is wired)', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('a')])]);
    let state = EditorState.create({ doc, plugins: buildPlugins() });

    state = state.apply(state.tr.insertText('b', 1));
    expect(state.doc.textContent).toBe('ba');

    undo(state, (tr) => {
      state = state.apply(tr);
    });
    expect(state.doc.textContent).toBe('a');
  });
});
