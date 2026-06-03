import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { addAnimation, createAnimation } from '../model/animation';
import { type Slide, type SlideObject } from '../model/types';
import { AnimationPanel } from './AnimationPanel';

function rect(id: string): SlideObject {
  return { id, kind: 'rect', x: 0, y: 0, width: 100, height: 40, fill: 'black' };
}

describe('AnimationPanel', () => {
  it('prompts to add an object when the slide is empty', () => {
    const slide: Slide = { id: 's1', objects: [] };
    render(<AnimationPanel slide={slide} onUpdateObject={vi.fn()} />);
    expect(screen.getByText(/add an object/i)).toBeTruthy();
  });

  it('adds an animation to the selected object', () => {
    const slide: Slide = { id: 's1', objects: [rect('a')] };
    const onUpdateObject = vi.fn();
    render(<AnimationPanel slide={slide} onUpdateObject={onUpdateObject} />);

    fireEvent.change(screen.getByLabelText('Animation category'), { target: { value: 'emphasis' } });
    fireEvent.change(screen.getByLabelText('Animation effect'), { target: { value: 'pulse' } });
    fireEvent.click(screen.getByRole('button', { name: /add animation/i }));

    expect(onUpdateObject).toHaveBeenCalledTimes(1);
    const [objectId, updater] = onUpdateObject.mock.calls[0]!;
    expect(objectId).toBe('a');
    const updated = (updater as (o: SlideObject) => SlideObject)(rect('a'));
    expect(updated.animations?.[0]?.category).toBe('emphasis');
    expect(updated.animations?.[0]?.effect).toBe('pulse');
  });

  it('lists existing animations with a remove control', () => {
    const obj = addAnimation(rect('a'), createAnimation('entrance', 'fade', 250));
    const slide: Slide = { id: 's1', objects: [obj] };
    render(<AnimationPanel slide={slide} onUpdateObject={vi.fn()} />);
    expect(screen.getByText(/entrance · fade · 250ms/)).toBeTruthy();
    expect(screen.getByLabelText(/remove entrance fade animation/i)).toBeTruthy();
  });
});
