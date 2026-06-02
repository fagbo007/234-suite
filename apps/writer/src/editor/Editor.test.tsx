import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Editor } from './Editor';

describe('Editor', () => {
  it('mounts an editable region', () => {
    render(<Editor />);
    const textbox = screen.getByRole('textbox');
    expect(textbox.getAttribute('contenteditable')).toBe('true');
  });
});
