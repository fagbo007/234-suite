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
    render(<NameBox engine={engine} active={{ row: 0, col: 1 }} onCommit={vi.fn()} />);
    expect((screen.getByLabelText('Cell name') as HTMLInputElement).value).toBe('B1');
  });

  it('defines a name for the active cell on Enter', () => {
    engine = new SheetEngine();
    const onCommit = vi.fn();
    render(<NameBox engine={engine} active={{ row: 4, col: 2 }} onCommit={onCommit} />);
    const input = screen.getByLabelText('Cell name');
    fireEvent.change(input, { target: { value: 'revenue' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(engine.coordOf('revenue')).toEqual({ row: 4, col: 2 });
    expect(onCommit).toHaveBeenCalled();
  });
});
