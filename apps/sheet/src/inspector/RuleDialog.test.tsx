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
  it('applies a formula predicate (autocomplete input present)', () => {
    engine = new SheetEngine();
    const onApply = vi.fn();
    render(
      <RuleDialog engine={engine} title="Conditional formatting" onApply={onApply} onClose={vi.fn()} />,
    );

    const input = screen.getByLabelText('Predicate formula');
    fireEvent.change(input, { target: { value: 'value > 10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith('value > 10');
  });
});
