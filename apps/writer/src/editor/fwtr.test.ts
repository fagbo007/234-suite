import { describe, expect, it } from 'vitest';
import { parseFwtr, serializeFwtr } from './fwtr';

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
});
