import { type Node as PMNode } from 'prosemirror-model';
import {
  MarkdownParser,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { schema } from './schema';
import { type StyleRegistry } from './styles';

// Reuse the default Markdown tokenizer, but only the token specs whose node /
// mark types exist in our minimal Phase 1 schema. (Constructing a MarkdownParser
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

/** Serialise a document to `.fwtr` (YAML front matter + Markdown body). */
export function serializeFwtr(input: {
  title: string;
  styles: StyleRegistry;
  doc: PMNode;
}): string {
  const body = defaultMarkdownSerializer.serialize(input.doc);
  const front = stringifyYaml({ title: input.title, styles: input.styles }).trimEnd();
  return `---\n${front}\n---\n\n${body}\n`;
}

/** Parse `.fwtr` text back into a document, style registry, and title. */
export function parseFwtr(text: string): FwtrDocument {
  let title = 'Untitled document';
  let styles: StyleRegistry = [];
  let body = text;

  const match = FRONT_MATTER.exec(text);
  if (match) {
    const meta = (parseYaml(match[1] ?? '') ?? {}) as Record<string, unknown>;
    if (typeof meta.title === 'string') title = meta.title;
    if (Array.isArray(meta.styles)) styles = meta.styles as StyleRegistry;
    body = text.slice(match[0].length);
  }

  const doc = parser.parse(body.trimStart());
  return { title, styles, doc };
}
