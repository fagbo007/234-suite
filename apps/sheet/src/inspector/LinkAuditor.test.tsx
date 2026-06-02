import { SheetEngine } from '@234/formula-engine';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LinkAuditor } from './LinkAuditor';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('LinkAuditor', () => {
  it('reports when there are no external references', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, '=SUM(A2:A3)');
    render(<LinkAuditor engine={engine} revision={0} />);
    expect(screen.getByText('No external references found.')).toBeTruthy();
  });

  it('lists external references by cell', () => {
    engine = new SheetEngine();
    engine.setCell(0, 1, '=[Book.xlsx]Sheet1!A1');
    render(<LinkAuditor engine={engine} revision={1} />);
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.getByText(/Book\.xlsx/)).toBeTruthy();
  });
});
