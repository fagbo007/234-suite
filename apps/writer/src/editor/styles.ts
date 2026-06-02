/**
 * Writer styles — first-class named objects in the document model.
 *
 * A `Style` is a registered object with an id, a human name, and a set of
 * properties. Block nodes reference a style by `styleId`; the schema renders the
 * resolved properties as an **inline `style` string — never a className** (root
 * CLAUDE.md Section 5/16, apps/writer/CLAUDE.md). There is no implicit CSS
 * cascade: a node's appearance is fully determined by its referenced style.
 *
 * The visual style editor (create/rename/delete/apply) is a Phase 2 deliverable;
 * Phase 1 ships the schema-level support plus a small seeded registry.
 */

export interface StyleProperties {
  fontSize?: string;
  fontWeight?: 400 | 500;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: string;
  color?: string;
  marginTop?: string;
  marginBottom?: string;
}

export interface Style {
  id: string;
  name: string;
  properties: StyleProperties;
}

export type StyleRegistry = Style[];

/** A small seeded registry. Real management arrives with the Phase 2 editor. */
export const defaultStyleRegistry: StyleRegistry = [
  { id: 'body', name: 'Body', properties: { fontSize: '14px', fontWeight: 400 } },
  { id: 'title', name: 'Title', properties: { fontSize: '28px', fontWeight: 500 } },
];

const CSS_KEY: Record<keyof StyleProperties, string> = {
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  fontStyle: 'font-style',
  lineHeight: 'line-height',
  color: 'color',
  marginTop: 'margin-top',
  marginBottom: 'margin-bottom',
};

/** Serialise a style's properties to an inline CSS string (never a class). */
export function styleToInlineCss(style: Style): string {
  return (Object.keys(style.properties) as (keyof StyleProperties)[])
    .map((key) => {
      const value = style.properties[key];
      return value === undefined ? '' : `${CSS_KEY[key]}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

// --- Registry helpers (Phase 2 visual style editor) — all immutable ---

export function createStyle(name: string): Style {
  return { id: crypto.randomUUID(), name, properties: { fontSize: '14px', fontWeight: 400 } };
}

export function addStyle(registry: StyleRegistry, style: Style): StyleRegistry {
  return [...registry, style];
}

export function renameStyle(registry: StyleRegistry, id: string, name: string): StyleRegistry {
  return registry.map((style) => (style.id === id ? { ...style, name } : style));
}

export function updateStyle(
  registry: StyleRegistry,
  id: string,
  patch: Partial<StyleProperties>,
): StyleRegistry {
  return registry.map((style) =>
    style.id === id ? { ...style, properties: { ...style.properties, ...patch } } : style,
  );
}

export function removeStyle(registry: StyleRegistry, id: string): StyleRegistry {
  return registry.filter((style) => style.id !== id);
}

// The active registry is consulted by the schema's `toDOM` to resolve `styleId`
// to inline CSS. Loading a `.fwtr` document sets this to that document's styles.
let activeRegistry: StyleRegistry = defaultStyleRegistry;

export function setActiveStyleRegistry(registry: StyleRegistry): void {
  activeRegistry = registry;
}

export function resolveStyle(styleId: string): Style | undefined {
  return activeRegistry.find((style) => style.id === styleId);
}
