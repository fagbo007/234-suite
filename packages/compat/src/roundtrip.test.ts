import { describe, expect, it } from 'vitest';
import { type DocBlock, type TextRun } from './blocks';
import { blocksToDocx, docxToBlocks } from './docx';
import { type PptxDeck, deckToPptx, pptxToDeck } from './pptx';
import { cellsToXlsx, xlsxToCells } from './xlsx';

/**
 * Round-trip test suite (root CLAUDE.md §9): 50 sample documents per format, with
 * an automated diff. Samples are deterministic (index-driven, no randomness) and
 * stay within the documented supported subset, so a faithful round-trip is
 * expected: `read(write(sample))` must deep-equal `sample` with no fidelity loss.
 * Generators emit exactly the shape the readers produce. A failure here is a real
 * serialize/parse asymmetry to fix — never weaken the assertion.
 */

const COUNT = 50;
const indices = Array.from({ length: COUNT }, (_, i) => i);

// --- .docx samples (DocBlock[]) ---

function makeRun(text: string, style: number): TextRun {
  const bold = style === 1 || style === 3;
  const italic = style === 2 || style === 3;
  return { text, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) };
}

function docxSample(i: number): DocBlock[] {
  const blockCount = 1 + (i % 5);
  const blocks: DocBlock[] = [];
  for (let j = 0; j < blockCount; j++) {
    const runCount = 1 + ((i + j) % 3);
    const runs: TextRun[] = [];
    for (let k = 0; k < runCount; k++) {
      const text = i === 0 && j === 0 && k === 0 ? 'special <&> chars' : `S${i}b${j}r${k}`;
      runs.push(makeRun(text, (i + j + k) % 4));
    }
    if ((i + j) % 4 === 0) {
      blocks.push({ kind: 'heading', level: (((i + j) % 3) + 1) as 1 | 2 | 3, runs });
    } else {
      blocks.push({ kind: 'paragraph', runs });
    }
  }
  return blocks;
}

// --- .xlsx samples (string[][]) ---

function xlsxSample(i: number): string[][] {
  const rows = 1 + (i % 4);
  const cols = 1 + (i % 3);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (i === 0 && r === 0 && c === 0) return 'a<&>b';
      switch ((i + r + c) % 3) {
        case 0:
          return String((i + 1) * (r + 1) + c);
        case 1:
          return `T${i}_${r}_${c}`;
        default:
          return `=SUM(A1:A${rows})`;
      }
    }),
  );
}

// --- .pptx samples (PptxDeck) ---

const HEXES = ['#6495ED', '#3CB371', '#CD5C5C', '#6A5ACD', '#112233'];

function pptxSample(i: number): PptxDeck {
  const slideCount = 1 + (i % 3);
  return {
    slides: Array.from({ length: slideCount }, (_, s) => ({
      objects: [
        {
          kind: 'text' as const,
          x: 8 * (s + 1),
          y: 16 * ((i % 5) + 1),
          width: 200 + s * 10,
          height: 60,
          text: i === 0 ? `T<&>${s}` : `Slide ${i}.${s}`,
          fontSize: 18 + (i % 4),
        },
        {
          kind: 'rect' as const,
          x: 80,
          y: 200,
          width: 120 + s * 8,
          height: 100,
          fill: HEXES[i % HEXES.length]!,
        },
      ],
    })),
  };
}

describe('compat round-trip suite (§9: 50 samples per format)', () => {
  it.each(indices.map((i) => [i, docxSample(i)] as const))(
    '.docx sample %i round-trips losslessly',
    (_i, sample) => {
      const { blocks, report } = docxToBlocks(blocksToDocx(sample));
      expect(blocks).toEqual(sample);
      expect(report.ok).toBe(true);
    },
  );

  it.each(indices.map((i) => [i, xlsxSample(i)] as const))(
    '.xlsx sample %i round-trips losslessly',
    (_i, sample) => {
      const { cells, report } = xlsxToCells(cellsToXlsx(sample));
      expect(cells).toEqual(sample);
      expect(report.ok).toBe(true);
    },
  );

  it.each(indices.map((i) => [i, pptxSample(i)] as const))(
    '.pptx sample %i round-trips losslessly',
    (_i, sample) => {
      const { deck, report } = pptxToDeck(deckToPptx(sample));
      expect(deck).toEqual(sample);
      expect(report.ok).toBe(true);
    },
  );
});
