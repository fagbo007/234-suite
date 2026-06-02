import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('234 Writer app', () => {
  it('renders the editor, styles panel, and command palette trigger', () => {
    render(<App />);
    expect(screen.getByRole('textbox', { name: 'Document content' }).getAttribute('contenteditable')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: /command palette/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Styles' })).toBeTruthy();
  });
});
