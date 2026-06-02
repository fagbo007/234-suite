import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('associates a visible label with the field', () => {
    render(<Input label="Document name" defaultValue="" />);
    expect(screen.getByLabelText('Document name')).toBeTruthy();
  });

  it('supports an aria-label when there is no visible label', () => {
    render(<Input aria-label="Search" />);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
  });
});
