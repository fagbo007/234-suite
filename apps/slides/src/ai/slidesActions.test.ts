import { describe, expect, it, vi } from 'vitest';
import { type Slide, type SlideObject } from '../model/types';
import {
  layoutPrompt,
  outlinePrompt,
  slideObjectSummary,
  slideTextContent,
  slidesActions,
  speakerNotesPrompt,
} from './slidesActions';

const text = (id: string, value: string): SlideObject => ({
  id,
  kind: 'text',
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  text: value,
  fontSize: 24,
});
const rect = (id: string): SlideObject => ({ id, kind: 'rect', x: 0, y: 0, width: 100, height: 40, fill: 'black' });

describe('slides AI helpers + prompt builders', () => {
  it('summarises objects and joins text content', () => {
    const slide: Slide = { id: 's1', objects: [text('a', 'Hello'), text('b', 'World'), rect('c')] };
    expect(slideObjectSummary(slide)).toBe('2 text, 1 rectangle');
    expect(slideTextContent(slide)).toBe('Hello World');
    expect(slideObjectSummary({ id: 's2', objects: [] })).toBe('');
  });

  it('builds intent-specific prompts', () => {
    expect(outlinePrompt('AI ethics').prompt).toMatch(/slide outline/);
    expect(outlinePrompt('AI ethics').prompt).toContain('AI ethics');
    expect(layoutPrompt('2 text').prompt).toMatch(/layout/);
    expect(speakerNotesPrompt('Hi').prompt).toMatch(/speaker notes/);
  });
});

describe('slidesActions', () => {
  it('outline adds a text object on Insert (free-text prompt)', () => {
    const onAddText = vi.fn();
    const actions = slidesActions({ slide: undefined, onAddText, onSetNotes: vi.fn() });
    const outline = actions.find((a) => a.id === 'slides.ai.outline')!;
    expect(outline.promptPlaceholder).toBeTruthy();
    outline.onResult?.('Slide 1\nSlide 2');
    expect(onAddText).toHaveBeenCalledWith('Slide 1\nSlide 2');
  });

  it('notes reads slide text and writes notes on Insert', () => {
    const onSetNotes = vi.fn();
    const slide: Slide = { id: 's1', objects: [text('a', 'Topic line')] };
    const actions = slidesActions({ slide, onAddText: vi.fn(), onSetNotes });
    const notes = actions.find((a) => a.id === 'slides.ai.notes')!;
    expect(notes.getInput?.()).toBe('Topic line');
    notes.onResult?.('Say hello first.');
    expect(onSetNotes).toHaveBeenCalledWith('Say hello first.');
  });

  it('layout is read-only and disabled on an empty slide', () => {
    const actions = slidesActions({ slide: { id: 's1', objects: [] }, onAddText: vi.fn(), onSetNotes: vi.fn() });
    const layout = actions.find((a) => a.id === 'slides.ai.layout')!;
    expect(layout.getInput?.()).toBeNull();
    expect(layout.onResult).toBeUndefined();
  });
});
