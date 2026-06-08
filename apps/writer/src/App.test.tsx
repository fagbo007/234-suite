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
    expect(screen.getByRole('button', { name: 'Open .docx' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export .docx' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Styles' })).toBeTruthy();
  });

  it('opens the collaboration panel with a start-session control', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collaborate' }));
    expect(screen.getByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(screen.getByLabelText('Session code')).toBeTruthy();
  });

  it('keeps the AI sidebar closed by default and shows AI actions when opened', () => {
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'AI assistant' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('complementary', { name: 'AI assistant' })).toBeTruthy();
    // Offline by default (no network), and the Writer actions are present.
    expect(screen.getByLabelText('AI provider')).toBeTruthy();
    expect(screen.getByRole('button', { name: /rephrase/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue writing/i })).toBeTruthy();
    // The in-tree sample plugin registered an extra provider, selectable here.
    expect(screen.getByRole('option', { name: 'Sample echo (plugin)' })).toBeTruthy();
  });
});
