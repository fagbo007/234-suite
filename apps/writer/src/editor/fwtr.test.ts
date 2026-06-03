import { describe, expect, it } from 'vitest';
import { docToMarkdown, markdownToDoc, parseFwtr, serializeFwtr } from './fwtr';
import { headingNode, imageNode, schema } from './schema';

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

  it('bridges Markdown ↔ doc for MS Office compat (text blocks only)', () => {
    const md = '# Title\n\nA paragraph with **bold** text.';
    const doc = markdownToDoc(md);
    expect(doc.firstChild?.type).toBe(headingNode);
    // docToMarkdown drops images and round-trips the supported text subset.
    expect(docToMarkdown(doc)).toBe(md);
  });

  it('round-trips a block image via front matter (body stays prose)', () => {
    const src = 'data:image/png;base64,AAAA';
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Before')]),
      imageNode.create({ src, alt: 'A picture', anchor: 'right' }),
      schema.node('paragraph', null, [schema.text('After')]),
    ]);

    const text = serializeFwtr({ title: 'T', styles: [], doc });
    expect(text).toContain('images:');
    // The base64 lives in front matter, not the Markdown body.
    const body = text.split('---\n').slice(2).join('---\n');
    expect(body).not.toContain(src);

    const parsed = parseFwtr(text);
    expect(parsed.doc.childCount).toBe(3);
    const image = parsed.doc.child(1);
    expect(image.type.name).toBe('image');
    expect(image.attrs.src).toBe(src);
    expect(image.attrs.anchor).toBe('right');
    expect(parsed.doc.child(2).textContent).toBe('After');
  });
});
