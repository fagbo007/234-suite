import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlideCanvas } from './SlideCanvas';

beforeEach(() => {
  // jsdom has no canvas 2D context; mock it to null so init is cleanly skipped.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('SlideCanvas', () => {
  it('renders a labelled canvas (Fabric init skipped without a 2D context)', () => {
    render(<SlideCanvas slide={{ id: 's1', objects: [] }} />);
    expect(screen.getByLabelText('Slide canvas')).toBeTruthy();
  });
});
