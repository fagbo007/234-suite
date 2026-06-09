import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getDisabledIds, setPluginEnabled } from '@234/plugin-host';
import App from './App';

afterEach(() => {
  // The plugin toggle store is a persisted singleton — reset it between tests.
  for (const id of [...getDisabledIds()]) setPluginEnabled(id, true);
  localStorage.clear();
});

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
    // Native .fwtr open/save (distinct from the .docx compat buttons).
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recent' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Styles' })).toBeTruthy();
  });

  it('opens the recent-files panel (empty in the web build)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
    expect(screen.getByRole('region', { name: 'Recent files' })).toBeTruthy();
    expect(screen.getByText('No recent files')).toBeTruthy();
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
    // ...and it appears in the Plugins manager (toggle keyed by the plugin name).
    expect(screen.getByLabelText('Sample echo provider')).toBeTruthy();
  });

  it('disabling a plugin removes its contributions (the sample provider)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('option', { name: 'Sample echo (plugin)' })).toBeTruthy();

    // Toggle the plugin off → its provider unregisters and leaves the selector.
    fireEvent.click(screen.getByLabelText('Sample echo provider'));
    expect(screen.queryByRole('option', { name: 'Sample echo (plugin)' })).toBeNull();
  });
});
