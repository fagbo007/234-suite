import { SheetEngine } from '@234/formula-engine';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Grid } from './Grid';

let engine: SheetEngine | null = null;

afterEach(() => {
  engine?.destroy();
  engine = null;
});

describe('Grid', () => {
  it('renders the active cell value', () => {
    engine = new SheetEngine();
    engine.setCell(0, 0, 'hello');
    render(<Grid engine={engine} active={{ row: 0, col: 0 }} onSelect={vi.fn()} revision={0} />);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it("highlights a collaborator's selected cell with a name tag", () => {
    engine = new SheetEngine();
    render(
      <Grid
        engine={engine}
        active={{ row: 0, col: 0 }}
        onSelect={vi.fn()}
        revision={0}
        peers={[
          {
            clientId: 1,
            user: { name: 'Guest 1', color: '#1971c2' },
            location: { cell: { row: 0, col: 0 } },
          },
        ]}
      />,
    );
    // Row 0 / col 0 is in the default visible window (scrollTop 0).
    const tag = screen.getByText('Guest 1');
    expect(tag).toBeTruthy();
    expect(tag.style.background).toContain('rgb(25, 113, 194)'); // the peer colour, inline
  });
});
