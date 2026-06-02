import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FindReplace } from './FindReplace';

describe('FindReplace', () => {
  it('renders find/replace inputs when open', () => {
    render(<FindReplace view={null} open onClose={vi.fn()} />);
    expect(screen.getByLabelText('Find')).toBeTruthy();
    expect(screen.getByLabelText('Replace with')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<FindReplace view={null} open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('closes via the Close button', () => {
    const onClose = vi.fn();
    render(<FindReplace view={null} open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
