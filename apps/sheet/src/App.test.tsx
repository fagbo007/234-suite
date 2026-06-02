import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('234 Sheet app', () => {
  it('renders the formula bar and the computed SUM in the grid', () => {
    render(<App />);
    expect(screen.getByLabelText('Cell value or formula')).toBeTruthy();
    // B1 = SUM(A1:A3) = 60, rendered in the (virtualized) first visible rows.
    expect(screen.getByText('60')).toBeTruthy();
  });
});
