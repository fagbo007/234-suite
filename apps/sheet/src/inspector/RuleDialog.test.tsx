import { SheetEngine } from '@234/formula-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuleDialog } from './RuleDialog';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('RuleDialog', () => {
  it('applies an operator + threshold rule', () => {
    engine = new SheetEngine();
    const onApply = vi.fn();
    render(
      <RuleDialog engine={engine} title="Conditional formatting" onApply={onApply} onClose={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Operator'), { target: { value: '>=' } });
    fireEvent.change(screen.getByLabelText('Threshold'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ op: '>=', threshold: '100' });
  });
});
