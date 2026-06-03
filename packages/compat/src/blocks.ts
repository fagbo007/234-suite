/**
 * Neutral document block model — the intermediate between OOXML and an app's
 * native format. The supported scoped subset (part 1): paragraphs, headings
 * (h1–h3), and bold/italic runs. `blocksToMarkdown`/`markdownToBlocks` bridge to
 * Writer's `.fwtr` body (Markdown), so the app reuses its existing md ↔ doc path.
 */

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface DocBlock {
  kind: 'paragraph' | 'heading';
  level?: 1 | 2 | 3;
  runs: TextRun[];
}

function runsToMarkdown(runs: TextRun[]): string {
  return runs
    .map((run) => {
      if (run.text === '') return '';
      if (run.bold && run.italic) return `***${run.text}***`;
      if (run.bold) return `**${run.text}**`;
      if (run.italic) return `*${run.text}*`;
      return run.text;
    })
    .join('');
}

export function blocksToMarkdown(blocks: DocBlock[]): string {
  return blocks
    .map((block) => {
      const text = runsToMarkdown(block.runs);
      if (block.kind === 'heading') return `${'#'.repeat(block.level ?? 1)} ${text}`;
      return text;
    })
    .join('\n\n');
}

/** Parse inline markdown (`**bold**`, `*italic*`, `***both***`) into runs. */
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let bold = false;
  let italic = false;
  let buffer = '';
  const flush = () => {
    if (buffer === '') return;
    runs.push({ text: buffer, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
    buffer = '';
  };
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('***', i)) {
      flush();
      bold = !bold;
      italic = !italic;
      i += 3;
    } else if (text.startsWith('**', i)) {
      flush();
      bold = !bold;
      i += 2;
    } else if (text[i] === '*') {
      flush();
      italic = !italic;
      i += 1;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  flush();
  return runs.length > 0 ? runs : [{ text: '' }];
}

export function markdownToBlocks(markdown: string): DocBlock[] {
  return markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      const heading = /^(#{1,3})\s+(.*)$/.exec(chunk);
      if (heading) {
        return {
          kind: 'heading' as const,
          level: heading[1]!.length as 1 | 2 | 3,
          runs: parseInline(heading[2] ?? ''),
        };
      }
      return { kind: 'paragraph' as const, runs: parseInline(chunk.replace(/\n/g, ' ')) };
    });
}
