import { SheetEngine } from '@234/formula-engine';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NameBox } from './NameBox';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('NameBox', () => {
  it('shows the active cell A1 by default', () => {
    engine = new SheetEngine();
    render(<NameBox engine={engine} active={{ row: 0, col: 1 }} onDefineName={vi.fn()} />);
    expect((screen.getByLabelText('Cell name') as HTMLInputElement).value).toBe('B1');
  });

  it('asks the App to define a name for the active cell on Enter', () => {
    engine = new SheetEngine();
    const onDefineName = vi.fn();
    render(<NameBox engine={engine} active={{ row: 4, col: 2 }} onDefineName={onDefineName} />);
    const input = screen.getByLabelText('Cell name');
    fireEvent.change(input, { target: { value: 'revenue' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onDefineName).toHaveBeenCalledWith('revenue', 4, 2);
  });
});
