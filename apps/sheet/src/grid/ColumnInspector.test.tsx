import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColumnInspector } from './ColumnInspector';

describe('ColumnInspector', () => {
  it('shows the active column label and defaults to text', () => {
    render(<ColumnInspector col={1} schema={undefined} onChange={vi.fn()} />);
    expect(screen.getByText('Column B')).toBeTruthy();
    expect((screen.getByLabelText('Column type') as HTMLSelectElement).value).toBe('text');
    expect(screen.queryByLabelText('Date format')).toBeNull();
  });

  it('declares a date column with a locked format', () => {
    const onChange = vi.fn();
    render(<ColumnInspector col={1} schema={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Column type'), { target: { value: 'date' } });
    expect(onChange).toHaveBeenCalledWith(1, { type: 'date', dateFormat: 'YYYY-MM-DD' });
  });

  it('offers the date-format picker when the column is a date', () => {
    render(
      <ColumnInspector col={0} schema={{ type: 'date', dateFormat: 'MM/DD/YYYY' }} onChange={vi.fn()} />,
    );
    expect((screen.getByLabelText('Date format') as HTMLSelectElement).value).toBe('MM/DD/YYYY');
  });
});
