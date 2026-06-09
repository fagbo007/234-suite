import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('234 Sheet app', () => {
  it('renders the formula bar and the computed SUM in the grid', () => {
    render(<App />);
    expect(screen.getByLabelText('Cell value or formula')).toBeTruthy();
    // B1 = SUM(A1:A3) = 60, rendered in the (virtualized) first visible rows.
    expect(screen.getByText('60')).toBeTruthy();
  });

  it('offers .xlsx import/export', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Open .xlsx' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export .xlsx' })).toBeTruthy();
  });

  it('offers native .fwsh open/save', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('opens the collaboration panel with a start-session control', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collaborate' }));
    expect(screen.getByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(screen.getByLabelText('Session code')).toBeTruthy();
  });

  it('keeps the AI sidebar closed by default and shows Sheet AI actions when opened', () => {
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'AI assistant' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('complementary', { name: 'AI assistant' })).toBeTruthy();
    expect(screen.getByLabelText('AI provider')).toBeTruthy();
    expect(screen.getByLabelText('Natural language to formula input')).toBeTruthy();
    expect(screen.getByRole('button', { name: /explain this formula/i })).toBeTruthy();
    // The in-tree sample plugin registered an extra provider, selectable here.
    expect(screen.getByRole('option', { name: 'Sample echo (plugin)' })).toBeTruthy();
    // ...and it appears in the Plugins manager (toggle keyed by the plugin name).
    expect(screen.getByLabelText('Sample echo provider')).toBeTruthy();
  });
});
