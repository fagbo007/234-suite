import { describe, expect, it } from 'vitest';
import { parseFwtr, serializeFwtr } from './fwtr';
import { headingNode, schema } from './schema';

const SAMPLE = `---
title: My letter
styles:
  - id: title
    name: Title
    properties:
      fontSize: 28px
      fontWeight: 500
---

# Heading one

A paragraph with **bold** and *italic* text.

- first
- second
`;

describe('.fwtr round-trip', () => {
  it('preserves the title and style registry from front matter', () => {
    const parsed = parseFwtr(SAMPLE);
    expect(parsed.title).toBe('My letter');
    expect(parsed.styles).toHaveLength(1);
    expect(parsed.styles[0]?.name).toBe('Title');
  });

  it('round-trips the document content losslessly', () => {
    const first = parseFwtr(SAMPLE);
    const text = serializeFwtr(first);
    const second = parseFwtr(text);

    expect(second.doc.eq(first.doc)).toBe(true);
    expect(second.title).toBe(first.title);
    expect(second.styles).toEqual(first.styles);
  });

  it('persists per-block styleId via front-matter blockStyles', () => {
    const doc = schema.node('doc', null, [
      headingNode.create({ level: 1, styleId: 'title' }, schema.text('Styled')),
      schema.node('paragraph', null, [schema.text('plain')]),
    ]);
    const text = serializeFwtr({ title: 'T', styles: [], doc });
    expect(text).toContain('blockStyles');

    const parsed = parseFwtr(text);
    expect(parsed.doc.firstChild?.attrs.styleId).toBe('title');
    expect(parsed.doc.child(1).attrs.styleId ?? null).toBeNull();
  });
});
