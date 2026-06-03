import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotesPanel } from './NotesPanel';

describe('NotesPanel', () => {
  it('shows the current notes', () => {
    render(<NotesPanel notes="Open with the demo" onChange={vi.fn()} />);
    expect((screen.getByLabelText('Speaker notes') as HTMLTextAreaElement).value).toBe('Open with the demo');
  });

  it('fires onChange when edited', () => {
    const onChange = vi.fn();
    render(<NotesPanel notes="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Speaker notes'), { target: { value: 'New note' } });
    expect(onChange).toHaveBeenCalledWith('New note');
  });
});
