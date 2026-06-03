import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('234 Writer app', () => {
  it('renders the editor, styles panel, and command palette trigger', () => {
    render(<App />);
    expect(screen.getByRole('textbox', { name: 'Document content' }).getAttribute('contenteditable')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /command palette/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Styles' })).toBeTruthy();
  });

  it('keeps the AI sidebar closed by default and toggles it on invocation', () => {
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'AI assistant' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('complementary', { name: 'AI assistant' })).toBeTruthy();
  });
});
