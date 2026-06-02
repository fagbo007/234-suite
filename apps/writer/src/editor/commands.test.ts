import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyStyleToSelection,
  insertImage,
  selectedImage,
  setImageAnchor,
  writerCommands,
} from './commands';
import { schema, strongMark } from './schema';

let view: EditorView | null = null;

afterEach(() => {
  view?.destroy();
  view = null;
});

function mountHello(): EditorView {
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hello')])]);
  let state = EditorState.create({ doc, plugins: [keymap(baseKeymap)] });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const mounted = new EditorView(host, {
    state,
    dispatchTransaction(tr) {
      state = state.apply(tr);
      mounted.updateState(state);
    },
  });
  // Select all of the paragraph's text.
  mounted.dispatch(
    mounted.state.tr.setSelection(
      TextSelection.create(mounted.state.doc, 1, mounted.state.doc.content.size - 1),
    ),
  );
  return mounted;
}

describe('writerCommands', () => {
  it('applies the strong mark across the selection', () => {
    view = mountHello();
    const bold = writerCommands(() => view).find((command) => command.id === 'writer.bold');
    expect(bold).toBeTruthy();
    bold?.run({});

    let hasStrong = false;
    view.state.doc.descendants((node) => {
      if (node.isText && node.marks.some((mark) => mark.type === strongMark)) hasStrong = true;
    });
    expect(hasStrong).toBe(true);
  });

  it('marks commands unavailable when there is no view', () => {
    const bold = writerCommands(() => null).find((command) => command.id === 'writer.bold');
    expect(bold?.isAvailable?.({})).toBe(false);
  });

  it('exposes undo/redo palette commands', () => {
    const ids = writerCommands(() => null).map((command) => command.id);
    expect(ids).toContain('writer.undo');
    expect(ids).toContain('writer.redo');
  });

  it('applyStyleToSelection sets styleId on the selected block', () => {
    view = mountHello();
    applyStyleToSelection(view, 'title');
    expect(view.state.doc.firstChild?.attrs.styleId).toBe('title');
  });

  it('inserts a block image and sets its anchor via the picker', () => {
    view = mountHello();
    insertImage(view, { src: 'data:image/png;base64,AAA' });

    let imagePos = -1;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') imagePos = pos;
    });
    expect(imagePos).toBeGreaterThanOrEqual(0);

    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, imagePos)));
    setImageAnchor(view, 'right');
    expect(selectedImage(view.state)?.node.attrs.anchor).toBe('right');
  });
});
