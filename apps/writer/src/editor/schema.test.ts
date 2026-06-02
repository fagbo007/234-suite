import { DOMSerializer } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';
import { schema } from './schema';
import { setActiveStyleRegistry } from './styles';

describe('Writer schema', () => {
  it('defines the Phase 1 node and mark set', () => {
    for (const name of ['doc', 'paragraph', 'heading', 'text', 'bullet_list', 'ordered_list', 'list_item']) {
      expect(schema.nodes[name], name).toBeTruthy();
    }
    expect(schema.marks.strong).toBeTruthy();
    expect(schema.marks.em).toBeTruthy();
  });

  it('renders a referenced style as an inline style, never a className', () => {
    setActiveStyleRegistry([
      { id: 'title', name: 'Title', properties: { fontSize: '28px', fontWeight: 500 } },
    ]);
    const node = schema.nodes.heading!.create({ level: 1, styleId: 'title' }, schema.text('Hello'));
    const dom = DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement;

    expect(dom.getAttribute('style')).toContain('font-size: 28px');
    expect(dom.getAttribute('class')).toBeNull();
  });
});
