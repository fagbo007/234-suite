import { SheetEngine } from '@234/formula-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormulaBar } from './FormulaBar';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('FormulaBar', () => {
  it('suggests named references before functions', () => {
    engine = new SheetEngine();
    engine.defineName('summary', 0, 0); // shares the "su" prefix with SUM
    render(<FormulaBar engine={engine} active={{ row: 1, col: 0 }} onCommit={vi.fn()} />);

    const input = screen.getByLabelText('Cell value or formula');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '=su' } });

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options[0]).toBe('summary');
    expect(options).toContain('SUM');
  });

  it('surfaces the A1 lint warning', () => {
    engine = new SheetEngine();
    render(<FormulaBar engine={engine} active={{ row: 0, col: 0 }} onCommit={vi.fn()} />);
    const input = screen.getByLabelText('Cell value or formula');
    fireEvent.change(input, { target: { value: '=A1+1' } });
    expect(screen.getByRole('status').textContent).toContain('named reference');
  });
});
