import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  // jsdom has no canvas 2D context; mock it so Fabric init is skipped cleanly.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('234 Slides app', () => {
  it('renders the slide panel, canvas, and command palette trigger', () => {
    render(<App />);
    expect(screen.getByLabelText('Add slide')).toBeTruthy();
    expect(screen.getByLabelText('Slide canvas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /command palette/i })).toBeTruthy();
    // Native .fwsl open/save (distinct from the .pptx compat buttons).
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('exposes the "Tidy slide" auto-layout command in the palette', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /command palette/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tidy' } });
    expect(screen.getByText('Tidy slide')).toBeTruthy();
  });

  it('shows the speaker notes editor for the active slide', () => {
    render(<App />);
    expect(screen.getByLabelText('Speaker notes')).toBeTruthy();
  });

  it('enters presenter mode from the Present button', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^present$/i }));
    expect(screen.getByText(/slide 1 of 1/i)).toBeTruthy();
  });

  it('exposes the "Animate objects" command and opens the animation panel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /command palette/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'animate' } });
    expect(screen.getByText('Animate objects')).toBeTruthy();
  });

  it('offers image import (button + hidden file input)', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /import image/i })).toBeTruthy();
    expect(screen.getByLabelText('Import image file')).toBeTruthy();
  });

  it('offers .pptx import/export', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Open .pptx' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export .pptx' })).toBeTruthy();
  });

  it('opens the collaboration panel with a start-session control', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Collaborate' }));
    expect(screen.getByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(screen.getByLabelText('Session code')).toBeTruthy();
  });

  it('keeps the AI sidebar closed by default and shows Slides AI actions when opened', () => {
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'AI assistant' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('complementary', { name: 'AI assistant' })).toBeTruthy();
    expect(screen.getByLabelText('AI provider')).toBeTruthy();
    expect(screen.getByLabelText('Generate outline input')).toBeTruthy();
    expect(screen.getByRole('button', { name: /draft speaker notes/i })).toBeTruthy();
    // The in-tree sample plugin registered an extra provider, selectable here.
    expect(screen.getByRole('option', { name: 'Sample echo (plugin)' })).toBeTruthy();
    // ...and it appears in the Plugins manager (toggle keyed by the plugin name).
    expect(screen.getByLabelText('Sample echo provider')).toBeTruthy();
  });
});
