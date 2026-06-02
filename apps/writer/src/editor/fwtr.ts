import { Fragment, type Node as PMNode } from 'prosemirror-model';
import {
  MarkdownParser,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { headingNode, paragraphNode, schema } from './schema';
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

export interface FwtrDocument {
  title: string;
  styles: StyleRegistry;
  doc: PMNode;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?/;

/** Read each top-level block's `styleId` into an index array (trailing nulls trimmed). */
function readBlockStyles(doc: PMNode): (string | null)[] {
  const blockStyles: (string | null)[] = [];
  doc.forEach((block) => {
    const styleId: unknown = block.attrs.styleId;
    blockStyles.push(typeof styleId === 'string' ? styleId : null);
  });
  while (blockStyles.length > 0 && blockStyles[blockStyles.length - 1] === null) blockStyles.pop();
  return blockStyles;
}

/** Re-apply per-block `styleId` (by top-level index) after parsing the body. */
function applyBlockStyles(doc: PMNode, blockStyles: (string | null)[]): PMNode {
  if (blockStyles.length === 0) return doc;
  const blocks: PMNode[] = [];
  doc.forEach((block, _offset, index) => {
    const styleId = blockStyles[index];
    if (styleId && (block.type === paragraphNode || block.type === headingNode)) {
      blocks.push(block.type.create({ ...block.attrs, styleId }, block.content, block.marks));
    } else {
      blocks.push(block);
    }
  });
  return doc.type.create(doc.attrs, Fragment.fromArray(blocks), doc.marks);
}

/** Serialise a document to `.fwtr` (YAML front matter + Markdown body). */
export function serializeFwtr(input: {
  title: string;
  styles: StyleRegistry;
  doc: PMNode;
}): string {
  const body = defaultMarkdownSerializer.serialize(input.doc);
  const blockStyles = readBlockStyles(input.doc);
  const meta: Record<string, unknown> = { title: input.title, styles: input.styles };
  if (blockStyles.length > 0) meta.blockStyles = blockStyles;
  const front = stringifyYaml(meta).trimEnd();
  return `---\n${front}\n---\n\n${body}\n`;
}

/** Parse `.fwtr` text back into a document, style registry, and title. */
export function parseFwtr(text: string): FwtrDocument {
  let title = 'Untitled document';
  let styles: StyleRegistry = [];
  let blockStyles: (string | null)[] = [];
  let body = text;

  const match = FRONT_MATTER.exec(text);
  if (match) {
    const meta = (parseYaml(match[1] ?? '') ?? {}) as Record<string, unknown>;
    if (typeof meta.title === 'string') title = meta.title;
    if (Array.isArray(meta.styles)) styles = meta.styles as StyleRegistry;
    if (Array.isArray(meta.blockStyles)) blockStyles = meta.blockStyles as (string | null)[];
    body = text.slice(match[0].length);
  }

  const doc = applyBlockStyles(parser.parse(body.trimStart()), blockStyles);
  return { title, styles, doc };
}
