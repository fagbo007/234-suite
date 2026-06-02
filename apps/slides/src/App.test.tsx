import { render, screen } from '@testing-library/react';
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
});
