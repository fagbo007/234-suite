import {
  type DOMOutputSpec,
  type MarkType,
  type Node as PMNode,
  type NodeType,
  Schema,
} from 'prosemirror-model';
import { addListNodes } from 'prosemirror-schema-list';
import { resolveStyle, styleToInlineCss } from './styles';

// Render a block node's tag, applying its referenced style as an INLINE style
// string. Never a className — that is the corruption-prone path we are avoiding
// (root CLAUDE.md Section 5/16, apps/writer/CLAUDE.md).
function styledDOM(tag: string, node: PMNode): DOMOutputSpec {
  const styleId: unknown = node.attrs.styleId;
  if (typeof styleId === 'string') {
    const style = resolveStyle(styleId);
    if (style) return [tag, { style: styleToInlineCss(style) }, 0];
  }
  return [tag, 0];
}

export type ImageAnchor = 'left' | 'center' | 'right';

/** Inline style for an image block's anchor — never a className (§16). */
export function anchorToInlineCss(anchor: ImageAnchor): string {
  const justify = anchor === 'left' ? 'flex-start' : anchor === 'right' ? 'flex-end' : 'center';
  return `display: flex; justify-content: ${justify}; margin: var(--space-3) 0`;
}

const baseSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      attrs: { styleId: { default: null } },
      parseDOM: [{ tag: 'p' }],
      toDOM: (node) => styledDOM('p', node),
    },
    heading: {
      group: 'block',
      content: 'inline*',
      defining: true,
      attrs: { level: { default: 1 }, styleId: { default: null } },
      parseDOM: [1, 2, 3].map((level) => ({ tag: `h${level}`, attrs: { level } })),
      toDOM: (node) => styledDOM(`h${node.attrs.level as number}`, node),
    },
    text: { group: 'inline' },
    image: {
      group: 'block',
      atom: true,
      draggable: false, // no float-on-drag (root §2.1, apps/writer/CLAUDE.md §3)
      selectable: true,
      attrs: { src: { default: '' }, alt: { default: '' }, anchor: { default: 'center' } },
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (dom) => ({
            src: dom instanceof HTMLElement ? (dom.getAttribute('src') ?? '') : '',
            alt: dom instanceof HTMLElement ? (dom.getAttribute('alt') ?? '') : '',
            anchor: 'center',
          }),
        },
      ],
      toDOM: (node) => [
        'figure',
        {
          'data-anchor': node.attrs.anchor as string,
          style: anchorToInlineCss(node.attrs.anchor as ImageAnchor),
        },
        ['img', { src: node.attrs.src as string, alt: node.attrs.alt as string, style: 'max-width: 100%; height: auto' }],
      ],
    },
  },
  marks: {
    strong: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
      toDOM: () => ['strong', 0],
    },
    em: {
      parseDOM: [{ tag: 'em' }, { tag: 'i' }],
      toDOM: () => ['em', 0],
    },
  },
});

/** Full Writer schema: base nodes + ordered/bullet lists (Phase 1 set). */
export const schema: Schema = new Schema({
  nodes: addListNodes(baseSchema.spec.nodes, 'paragraph block*', 'block'),
  marks: baseSchema.spec.marks,
});

// Typed accessors — the schema guarantees these exist.
function nodeType(name: string): NodeType {
  const type = schema.nodes[name];
  if (!type) throw new Error(`Missing node type: ${name}`);
  return type;
}
function markType(name: string): MarkType {
  const type = schema.marks[name];
  if (!type) throw new Error(`Missing mark type: ${name}`);
  return type;
}

export const paragraphNode = nodeType('paragraph');
export const headingNode = nodeType('heading');
export const bulletListNode = nodeType('bullet_list');
export const orderedListNode = nodeType('ordered_list');
export const listItemNode = nodeType('list_item');
export const imageNode = nodeType('image');
export const strongMark = markType('strong');
export const emMark = markType('em');
