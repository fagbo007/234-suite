import { type Node as PMNode } from 'prosemirror-model';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';

export interface Match {
  from: number;
  to: number;
}

export interface SearchState {
  query: string;
  matches: Match[];
  index: number;
}

export const searchKey = new PluginKey<SearchState>('writer-search');

/** Pure case-insensitive match finder over a document's text nodes. */
export function findMatches(doc: PMNode, query: string): Match[] {
  const matches: Match[] = [];
  if (query === '') return matches;
  const needle = query.toLowerCase();
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const haystack = node.text.toLowerCase();
      let i = haystack.indexOf(needle);
      while (i !== -1) {
        matches.push({ from: pos + i, to: pos + i + query.length });
        i = haystack.indexOf(needle, i + needle.length);
      }
    }
    return true;
  });
  return matches;
}

type SearchMeta =
  | { kind: 'setQuery'; query: string }
  | { kind: 'next' }
  | { kind: 'prev' }
  | { kind: 'clear' };

export const searchPlugin = new Plugin<SearchState>({
  key: searchKey,
  state: {
    init: () => ({ query: '', matches: [], index: 0 }),
    apply(tr, prev, _old, newState) {
      const meta = tr.getMeta(searchKey) as SearchMeta | undefined;
      if (meta?.kind === 'setQuery') {
        return { query: meta.query, matches: findMatches(newState.doc, meta.query), index: 0 };
      }
      if (meta?.kind === 'clear') {
        return { query: '', matches: [], index: 0 };
      }
      if (meta?.kind === 'next' && prev.matches.length > 0) {
        return { ...prev, index: (prev.index + 1) % prev.matches.length };
      }
      if (meta?.kind === 'prev' && prev.matches.length > 0) {
        return { ...prev, index: (prev.index - 1 + prev.matches.length) % prev.matches.length };
      }
      if (tr.docChanged && prev.query !== '') {
        return { ...prev, matches: findMatches(newState.doc, prev.query), index: 0 };
      }
      return prev;
    },
  },
  props: {
    decorations(state) {
      const search = searchKey.getState(state);
      if (!search || search.matches.length === 0) return DecorationSet.empty;
      // Transient editor-chrome highlight (not document styling) — styled via
      // :global(.search-*) in Editor.module.css with tokens.
      const decorations = search.matches.map((match, i) =>
        Decoration.inline(match.from, match.to, {
          class: i === search.index ? 'search-active' : 'search-match',
        }),
      );
      return DecorationSet.create(state.doc, decorations);
    },
  },
});

function currentMatch(view: EditorView): Match | undefined {
  return searchKey.getState(view.state)?.matches[searchKey.getState(view.state)?.index ?? 0];
}

function selectCurrent(view: EditorView): void {
  const match = currentMatch(view);
  if (!match) return;
  const tr = view.state.tr
    .setSelection(TextSelection.create(view.state.doc, match.from, match.to))
    .scrollIntoView();
  view.dispatch(tr);
}

export function setSearchQuery(view: EditorView, query: string): void {
  view.dispatch(view.state.tr.setMeta(searchKey, { kind: 'setQuery', query }));
}

export function clearSearch(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(searchKey, { kind: 'clear' }));
}

export function searchNext(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(searchKey, { kind: 'next' }));
  selectCurrent(view);
}

export function searchPrev(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(searchKey, { kind: 'prev' }));
  selectCurrent(view);
}

export function replaceCurrent(view: EditorView, replacement: string): void {
  const match = currentMatch(view);
  if (!match) return;
  view.dispatch(view.state.tr.insertText(replacement, match.from, match.to));
}

export function replaceAll(view: EditorView, replacement: string): void {
  const search = searchKey.getState(view.state);
  if (!search || search.matches.length === 0) return;
  const tr = view.state.tr;
  // Apply from last to first so earlier offsets stay valid.
  for (let i = search.matches.length - 1; i >= 0; i--) {
    const match = search.matches[i]!;
    tr.insertText(replacement, match.from, match.to);
  }
  view.dispatch(tr);
}

export function searchMatchCount(view: EditorView): number {
  return searchKey.getState(view.state)?.matches.length ?? 0;
}
