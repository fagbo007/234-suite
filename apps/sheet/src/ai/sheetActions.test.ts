import { SheetEngine } from '@234/formula-engine';
import { describe, expect, it, vi } from 'vitest';
import { explainFormulaPrompt, nlFormulaPrompt, sheetActions, suggestChartPrompt } from './sheetActions';

describe('sheet AI prompt builders', () => {
  it('NL→formula asks for a formula-only answer and lists named refs', () => {
    const prompt = nlFormulaPrompt('total of sales', ['sales', 'tax']).prompt;
    expect(prompt).toMatch(/starting with "="/);
    expect(prompt).toContain('sales, tax');
  });

  it('NL→formula omits the names hint when there are none', () => {
    expect(nlFormulaPrompt('total', []).prompt).not.toMatch(/named references/);
  });

  it('explain + suggest-chart build intent-specific prompts', () => {
    expect(explainFormulaPrompt('=SUM(A1:A3)').prompt).toMatch(/Explain/);
    expect(suggestChartPrompt('3 rows × 2 columns of data').prompt).toMatch(/bar, line, or pie/);
  });
});

describe('sheetActions', () => {
  function setup() {
    const engine = new SheetEngine();
    engine.setCell(0, 0, '10');
    engine.setCell(0, 1, '=SUM(A1:A1)');
    engine.defineName('total', 0, 1);
    return engine;
  }

  it('NL→formula uses a typed prompt and writes the active cell on Insert', () => {
    const engine = setup();
    const onInsertFormula = vi.fn();
    const actions = sheetActions({ engine, active: { row: 5, col: 0 }, onInsertFormula });
    const nl = actions.find((a) => a.id === 'sheet.ai.nl-formula')!;
    expect(nl.promptPlaceholder).toBeTruthy();
    nl.onResult?.('=SUM(A1:A3)  ');
    expect(onInsertFormula).toHaveBeenCalledWith('=SUM(A1:A3)');
  });

  it('explain reads a formula cell and stays read-only', () => {
    const engine = setup();
    const actions = sheetActions({ engine, active: { row: 0, col: 1 }, onInsertFormula: vi.fn() });
    const explain = actions.find((a) => a.id === 'sheet.ai.explain-formula')!;
    expect(explain.getInput?.()).toBe('=SUM(A1:A1)');
    expect(explain.onResult).toBeUndefined();
  });

  it('explain is disabled on a non-formula cell', () => {
    const engine = setup();
    const actions = sheetActions({ engine, active: { row: 0, col: 0 }, onInsertFormula: vi.fn() });
    const explain = actions.find((a) => a.id === 'sheet.ai.explain-formula')!;
    expect(explain.getInput?.()).toBeNull();
  });
});
