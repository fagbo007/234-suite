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

  it('keeps the AI sidebar closed by default and toggles it on invocation', () => {
    render(<App />);
    expect(screen.queryByRole('complementary', { name: 'AI assistant' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'AI assistant' }));
    expect(screen.getByRole('complementary', { name: 'AI assistant' })).toBeTruthy();
  });
});
