import { createImportReport } from '@234/compat';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReportPanel } from './ImportReportPanel';

describe('ImportReportPanel', () => {
  it('shows a clean message when there were no losses', () => {
    const report = createImportReport();
    render(<ImportReportPanel report={report} onClose={vi.fn()} />);
    expect(screen.getByText(/no fidelity loss/i)).toBeTruthy();
  });

  it('lists fidelity losses and dismisses', () => {
    const report = createImportReport();
    report.lossy('Tables', '1 table flattened to paragraphs');
    const onClose = vi.fn();
    render(<ImportReportPanel report={report} onClose={onClose} />);
    expect(screen.getByText(/1 table flattened/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
