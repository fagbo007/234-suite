import { Fragment, type Node as PMNode } from 'prosemirror-model';
import {
  MarkdownParser,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { headingNode, type ImageAnchor, imageNode, paragraphNode, schema } from './schema';
import { type StyleRegistry } from './styles';

// Reuse the default Markdown tokenizer, but only the token specs whose node /
// mark types exist in our minimal schema. (Constructing a MarkdownParser
// validates each spec against the schema, so unsupported tokens must be omitted.)
const SUPPORTED_TOKENS = [
  'paragraph',
  'heading',
  'bullet_list',
  'ordered_list',
  'list_item',
  'em',
  'strong',
] as const;

type ParseTokens = typeof defaultMarkdownParser.tokens;
const tokens: ParseTokens = {};
for (const key of SUPPORTED_TOKENS) {
  const spec = defaultMarkdownParser.tokens[key];
  if (spec) tokens[key] = spec;
}

const parser = new MarkdownParser(schema, defaultMarkdownParser.tokenizer, tokens);

interface ImageEntry {
  at: number;
  src: string;
  alt: string;
  anchor: ImageAnchor;
}

export interface FwtrDocument {
  title: string;
  styles: StyleRegistry;
  doc: PMNode;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Split a document's top-level blocks into Markdown-serialisable text blocks and
 * front-matter image entries. `images` and `blockStyles` are indexed by the
 * FINAL block position so the body (text only) and metadata stay aligned.
 */
function splitBlocks(doc: PMNode): {
  textBlocks: PMNode[];
  images: ImageEntry[];
  blockStyles: (string | null)[];
} {
  const textBlocks: PMNode[] = [];
  const images: ImageEntry[] = [];
  const blockStyles: (string | null)[] = [];

  doc.forEach((block, _offset, index) => {
    if (block.type === imageNode) {
      images.push({
        at: index,
        src: String(block.attrs.src ?? ''),
        alt: String(block.attrs.alt ?? ''),
        anchor: (block.attrs.anchor as ImageAnchor | undefined) ?? 'center',
      });
      blockStyles.push(null);
    } else {
      textBlocks.push(block);
      const styleId: unknown = block.attrs.styleId;
      blockStyles.push(typeof styleId === 'string' ? styleId : null);
    }
  });

  while (blockStyles.length > 0 && blockStyles[blockStyles.length - 1] === null) blockStyles.pop();
  return { textBlocks, images, blockStyles };
}

/** Rebuild the final block list: splice images at their `at`, fill text in order, apply styles. */
function reconstruct(
  textBlocks: PMNode[],
  images: ImageEntry[],
  blockStyles: (string | null)[],
): PMNode {
  const total = textBlocks.length + images.length;
  const imageAt = new Map<number, ImageEntry>();
  for (const image of images) imageAt.set(image.at, image);

  const blocks: PMNode[] = [];
  let textIndex = 0;
  for (let i = 0; i < total; i++) {
    const image = imageAt.get(i);
    if (image) {
      blocks.push(imageNode.create({ src: image.src, alt: image.alt, anchor: image.anchor }));
      continue;
    }
    const block = textBlocks[textIndex++];
    if (!block) continue;
    const styleId = blockStyles[i];
    if (styleId && (block.type === paragraphNode || block.type === headingNode)) {
      blocks.push(block.type.create({ ...block.attrs, styleId }, block.content, block.marks));
    } else {
      blocks.push(block);
    }
  }
  return schema.topNodeType.create(null, Fragment.fromArray(blocks));
}

/** Serialise a document to `.fwtr` (YAML front matter + Markdown body; images in front matter). */
export function serializeFwtr(input: {
  title: string;
  styles: StyleRegistry;
  doc: PMNode;
}): string {
  const { textBlocks, images, blockStyles } = splitBlocks(input.doc);
  const textDoc = schema.topNodeType.create(null, Fragment.fromArray(textBlocks));
  const body = defaultMarkdownSerializer.serialize(textDoc);

  const meta: Record<string, unknown> = { title: input.title, styles: input.styles };
  if (blockStyles.length > 0) meta.blockStyles = blockStyles;
  if (images.length > 0) meta.images = images;
  const front = stringifyYaml(meta).trimEnd();
  return `---\n${front}\n---\n\n${body}\n`;
}

/** Parse `.fwtr` text back into a document, style registry, and title. */
export function parseFwtr(text: string): FwtrDocument {
  let title = 'Untitled document';
  let styles: StyleRegistry = [];
  let blockStyles: (string | null)[] = [];
  let images: ImageEntry[] = [];
  let body = text;

  const match = FRONT_MATTER.exec(text);
  if (match) {
    const meta = (parseYaml(match[1] ?? '') ?? {}) as Record<string, unknown>;
    if (typeof meta.title === 'string') title = meta.title;
    if (Array.isArray(meta.styles)) styles = meta.styles as StyleRegistry;
    if (Array.isArray(meta.blockStyles)) blockStyles = meta.blockStyles as (string | null)[];
    if (Array.isArray(meta.images)) images = meta.images as ImageEntry[];
    body = text.slice(match[0].length);
  }

  const parsed = parser.parse(body.trimStart());
  const textBlocks: PMNode[] = [];
  parsed.forEach((block) => textBlocks.push(block));
  const doc = reconstruct(textBlocks, images, blockStyles);
  return { title, styles, doc };
}
