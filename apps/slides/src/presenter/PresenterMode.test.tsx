import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Deck } from '../model/types';
import { PresenterMode } from './PresenterMode';

beforeEach(() => {
  // jsdom has no canvas 2D context; mock it so the embedded Fabric init skips.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

const deck: Deck = {
  slides: [
    { id: 's1', objects: [], notes: 'Intro notes' },
    { id: 's2', objects: [] },
  ],
};

describe('PresenterMode', () => {
  it('shows the slide counter and current notes', () => {
    render(<PresenterMode deck={deck} onExit={vi.fn()} />);
    expect(screen.getByText('Slide 1 of 2')).toBeTruthy();
    expect(screen.getByText('Intro notes')).toBeTruthy();
  });

  it('advances to the next slide', () => {
    render(<PresenterMode deck={deck} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Slide 2 of 2')).toBeTruthy();
  });

  it('exits on Escape', () => {
    const onExit = vi.fn();
    render(<PresenterMode deck={deck} onExit={onExit} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
