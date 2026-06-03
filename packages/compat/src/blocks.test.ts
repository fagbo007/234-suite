import { describe, expect, it } from 'vitest';
import { blocksToMarkdown, type DocBlock, markdownToBlocks } from './blocks';

describe('blocks ↔ markdown', () => {
  const blocks: DocBlock[] = [
    { kind: 'heading', level: 1, runs: [{ text: 'Title' }] },
    { kind: 'paragraph', runs: [{ text: 'Plain and ' }, { text: 'bold', bold: true }, { text: ' and ' }, { text: 'em', italic: true }] },
  ];

  it('serialises blocks to markdown', () => {
    expect(blocksToMarkdown(blocks)).toBe('# Title\n\nPlain and **bold** and *em*');
  });

  it('round-trips markdown → blocks → markdown', () => {
    const md = '## Heading two\n\nA **bold** word and ***both***';
    const round = blocksToMarkdown(markdownToBlocks(md));
    expect(round).toBe(md);
  });

  it('parses heading levels and plain paragraphs', () => {
    const parsed = markdownToBlocks('### Three\n\njust text');
    expect(parsed[0]).toMatchObject({ kind: 'heading', level: 3 });
    expect(parsed[1]).toMatchObject({ kind: 'paragraph' });
    expect(parsed[1]!.runs[0]!.text).toBe('just text');
  });
});
