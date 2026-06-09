import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentFiles } from './RecentFiles';

describe('RecentFiles', () => {
  it('shows an empty state and no clear button when there are no items', () => {
    render(<RecentFiles items={[]} onOpen={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText('No recent files')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('lists entries, opens by path, and clears', () => {
    const onOpen = vi.fn();
    const onClear = vi.fn();
    render(
      <RecentFiles
        items={[
          { path: '/docs/a.fwtr', name: 'a.fwtr' },
          { path: '/docs/b.fwtr', name: 'b.fwtr' },
        ]}
        onOpen={onOpen}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'a.fwtr' }));
    expect(onOpen).toHaveBeenCalledWith('/docs/a.fwtr');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalled();
  });
});
