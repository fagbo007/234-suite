import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StyleEditor } from './StyleEditor';
import { type StyleRegistry } from './styles';

const registry: StyleRegistry = [
  { id: 'title', name: 'Title', properties: { fontSize: '28px', fontWeight: 500 } },
];

describe('StyleEditor', () => {
  it('adds a style', () => {
    const onChange = vi.fn();
    render(<StyleEditor registry={registry} onChange={onChange} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add style' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('applies a style to the selection', () => {
    const onApply = vi.fn();
    render(<StyleEditor registry={registry} onChange={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('title');
  });

  it('renames a style', () => {
    const onChange = vi.fn();
    render(<StyleEditor registry={registry} onChange={onChange} onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Name for Title'), { target: { value: 'Heading' } });
    expect(onChange.mock.calls[0]?.[0]?.[0]?.name).toBe('Heading');
  });
});
