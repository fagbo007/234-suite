import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type Deck } from '../model/types';
import { SlidePanel } from './SlidePanel';

const deck: Deck = {
  slides: [
    { id: 'a', objects: [] },
    { id: 'b', objects: [] },
  ],
};

function setup() {
  const handlers = {
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
  };
  render(<SlidePanel deck={deck} activeIndex={0} {...handlers} />);
  return handlers;
}

describe('SlidePanel', () => {
  it('adds a slide', () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByLabelText('Add slide'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('deletes the chosen slide', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Delete slide 2'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('moves a slide down', () => {
    const { onMove } = setup();
    fireEvent.click(screen.getByLabelText('Move slide 1 down'));
    expect(onMove).toHaveBeenCalledWith(0, 1);
  });

  it('disables move-up on the first slide', () => {
    setup();
    const button = screen.getByLabelText('Move slide 1 up') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("badges a collaborator's active slide", () => {
    render(
      <SlidePanel
        deck={deck}
        activeIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        peers={[{ clientId: 1, user: { name: 'Guest 1', color: '#2f9e44' }, location: { slide: 1 } }]}
      />,
    );
    // The peer is on slide 2 (index 1), not slide 1.
    expect(screen.getByLabelText('Collaborators on slide 2')).toBeTruthy();
    const dot = screen.getByLabelText('Guest 1');
    expect(dot.style.background).toContain('rgb(47, 158, 68)');
    expect(screen.queryByLabelText('Collaborators on slide 1')).toBeNull();
  });
});
