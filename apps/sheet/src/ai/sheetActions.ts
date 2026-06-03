import { type AiAction, type AiRequest } from '@234/ai-sidebar';
import { type SheetEngine } from '@234/formula-engine';

/**
 * Sheet AI actions (root §9): natural-language → formula, explain formula,
 * suggest chart type. Pure prompt builders + the document side-effect each
 * action applies on the user's "Insert". NL→formula prefers named references
 * (§3.4) and is only written to the active cell when the user clicks Insert.
 */

const SYSTEM =
  'You are a spreadsheet formula assistant for 234 Sheet. Supported functions: SUM, AVERAGE, COUNT, and arithmetic (+ - * / ^).';

export function nlFormulaPrompt(description: string, names: string[]): AiRequest {
  const namesHint =
    names.length > 0 ? ` Prefer these named references where relevant: ${names.join(', ')}.` : '';
  return {
    system: SYSTEM,
    prompt: `Write a single spreadsheet formula for: ${description}. Return only the formula, starting with "=".${namesHint}`,
  };
}

export function explainFormulaPrompt(formula: string): AiRequest {
  return { system: SYSTEM, prompt: `Explain what this spreadsheet formula does, step by step:\n\n${formula}` };
}

export function suggestChartPrompt(dataDescription: string): AiRequest {
  return {
    system: SYSTEM,
    prompt: `A sheet has ${dataDescription}. Suggest the best chart type — bar, line, or pie — and briefly explain why.`,
  };
}

export interface SheetActionContext {
  engine: SheetEngine;
  active: { row: number; col: number };
  /** Apply a generated formula to the active cell (called on Insert). */
  onInsertFormula: (formula: string) => void;
}

export function sheetActions({ engine, active, onInsertFormula }: SheetActionContext): AiAction[] {
  return [
    {
      id: 'sheet.ai.nl-formula',
      label: 'Natural language to formula',
      description: 'Describe what you want to compute',
      promptPlaceholder: 'e.g. total of column A',
      buildPrompt: (description) => nlFormulaPrompt(description, engine.names()),
      onResult: (text) => onInsertFormula(text.trim()),
    },
    {
      id: 'sheet.ai.explain-formula',
      label: 'Explain this formula',
      description: 'Explain the active cell (read-only)',
      getInput: () => {
        const raw = engine.getRaw(active.row, active.col);
        return raw.startsWith('=') ? raw : null;
      },
      buildPrompt: explainFormulaPrompt,
      // No onResult — explanation never edits the sheet.
    },
    {
      id: 'sheet.ai.suggest-chart',
      label: 'Suggest a chart',
      description: 'Recommend a chart type for the data',
      getInput: () => {
        const { rows, cols } = engine.usedRange();
        return rows > 0 && cols > 0 ? `${rows} rows × ${cols} columns of data` : null;
      },
      buildPrompt: suggestChartPrompt,
      // No onResult — advisory text only.
    },
  ];
}
