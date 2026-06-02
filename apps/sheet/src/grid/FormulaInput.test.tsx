import { SheetEngine } from '@234/formula-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { FormulaInput } from './FormulaInput';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

function Harness({ engine: e }: { engine: SheetEngine }) {
  const [value, setValue] = useState('');
  return <FormulaInput engine={e} value={value} onChange={setValue} ariaLabel="Formula" />;
}

describe('FormulaInput', () => {
  it('suggests named references before functions', () => {
    engine = new SheetEngine();
    engine.defineName('summary', 0, 0);
    render(<Harness engine={engine} />);

    const input = screen.getByLabelText('Formula');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '=su' } });

    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options[0]).toBe('summary');
    expect(options).toContain('SUM');
  });

  it('lints raw A1 references', () => {
    engine = new SheetEngine();
    render(<Harness engine={engine} />);
    const input = screen.getByLabelText('Formula');
    fireEvent.change(input, { target: { value: '=A1:A5' } });
    expect(screen.getByRole('status').textContent).toContain('named reference');
  });
});
