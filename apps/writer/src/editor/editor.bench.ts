import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { bench, describe } from 'vitest';
import { buildHundredPageMarkdown } from './benchDoc';
import { parseFwtr } from './fwtr';
import { buildPlugins } from './keymap';

describe('Writer render', () => {
  const markdown = buildHundredPageMarkdown();

  bench('parse + EditorState.create (100-page document)', () => {
    const { doc } = parseFwtr(markdown);
    EditorState.create({ doc, plugins: buildPlugins() });
  });

  bench('parse + mount EditorView (100-page document)', () => {
    const { doc } = parseFwtr(markdown);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = new EditorView(host, {
      state: EditorState.create({ doc, plugins: buildPlugins() }),
    });
    view.destroy();
    host.remove();
  });
});
