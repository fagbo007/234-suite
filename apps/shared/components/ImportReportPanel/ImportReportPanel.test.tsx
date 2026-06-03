import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReportPanel } from './ImportReportPanel';

describe('ImportReportPanel', () => {
  it('shows a clean message when there were no losses', () => {
    render(<ImportReportPanel report={{ ok: true, losses: [] }} onClose={vi.fn()} />);
    expect(screen.getByText(/no fidelity loss/i)).toBeTruthy();
  });

  it('lists fidelity losses and dismisses', () => {
    const onClose = vi.fn();
    render(
      <ImportReportPanel
        report={{ ok: false, losses: [{ feature: 'Tables', detail: '1 table flattened to paragraphs' }] }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/1 table flattened/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
