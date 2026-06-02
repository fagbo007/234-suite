import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChartView } from './ChartView';

describe('ChartView', () => {
  it('renders a bar chart as an accessible SVG', () => {
    const { container } = render(<ChartView type="bar" values={[1, 2, 3]} title="Sales" />);
    expect(screen.getByRole('img', { name: 'Sales' })).toBeTruthy();
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });

  it('renders pie slices as paths', () => {
    const { container } = render(<ChartView type="pie" values={[1, 1]} title="Split" />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('shows a message when there is no data', () => {
    render(<ChartView type="line" values={[]} title="Empty" />);
    expect(screen.getByText('No data to chart.')).toBeTruthy();
  });
});
