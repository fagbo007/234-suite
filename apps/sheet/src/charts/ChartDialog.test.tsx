import { SheetEngine } from '@234/formula-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartDialog } from './ChartDialog';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('ChartDialog', () => {
  it('applies a chart with the chosen type, range, and title', () => {
    engine = new SheetEngine();
    const onApply = vi.fn();
    render(<ChartDialog engine={engine} onApply={onApply} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'pie' } });
    fireEvent.change(screen.getByLabelText('Data range'), { target: { value: 'A1:A3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ type: 'pie', range: 'A1:A3', title: 'Chart' });
  });
});
