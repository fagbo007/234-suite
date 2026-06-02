import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, it } from 'vitest';
import { schema } from './schema';
import { findMatches, replaceAll, searchKey, searchPlugin, setSearchQuery } from './search';

let view: EditorView | null = null;

afterEach(() => {
  view?.destroy();
  view = null;
});

function docOf(text: string) {
  return schema.node('doc', null, [schema.node('paragraph', null, [schema.text(text)])]);
}

function mount(text: string): EditorView {
  const state = EditorState.create({ doc: docOf(text), plugins: [searchPlugin] });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const mounted = new EditorView(host, {
    state,
    dispatchTransaction(tr) {
      mounted.updateState(mounted.state.apply(tr));
    },
  });
  return mounted;
}

describe('findMatches', () => {
  it('finds case-insensitive matches', () => {
    expect(findMatches(docOf('foo Foo foo'), 'foo')).toHaveLength(3);
  });

  it('returns nothing for an empty query', () => {
    expect(findMatches(docOf('abc'), '')).toHaveLength(0);
  });
});

describe('search plugin + replace', () => {
  it('tracks matches in plugin state', () => {
    view = mount('alpha beta alpha');
    setSearchQuery(view, 'alpha');
    expect(searchKey.getState(view.state)?.matches).toHaveLength(2);
  });

  it('replaceAll replaces every match', () => {
    view = mount('cat cat cat');
    setSearchQuery(view, 'cat');
    replaceAll(view, 'dog');
    expect(view.state.doc.textContent).toBe('dog dog dog');
  });
});
