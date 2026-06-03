import { type AiAction, type AiRequest } from '@234/ai-sidebar';
import { type Slide } from '../model/types';

/**
 * Slides AI actions (root §9): outline generation, layout suggestion, speaker
 * notes draft. Pure prompt builders + the document side-effect each applies on
 * the user's "Insert". All user-invoked inside the docked sidebar.
 */

const SYSTEM = 'You are a concise presentation assistant for 234 Slides. Reply with plain text only.';

export function outlinePrompt(topic: string): AiRequest {
  return {
    system: SYSTEM,
    prompt: `Create a slide outline (slide titles with one-line bullets) for a presentation about: ${topic}`,
  };
}
export function layoutPrompt(objectSummary: string): AiRequest {
  return {
    system: SYSTEM,
    prompt: `Suggest a cleaner, well-balanced layout for a slide containing ${objectSummary}. Keep it simple.`,
  };
}
export function speakerNotesPrompt(slideText: string): AiRequest {
  return { system: SYSTEM, prompt: `Draft concise speaker notes for a slide that says:\n\n${slideText}` };
}

const KIND_LABELS: Record<Slide['objects'][number]['kind'], string> = {
  text: 'text',
  rect: 'rectangle',
  image: 'image',
};

/** The active slide's text content (text objects joined), trimmed. */
export function slideTextContent(slide: Slide | undefined): string {
  if (!slide) return '';
  return slide.objects
    .filter((object) => object.kind === 'text')
    .map((object) => (object.kind === 'text' ? object.text : ''))
    .join(' ')
    .trim();
}

/** A short "2 text, 1 rectangle" style summary of a slide's objects. */
export function slideObjectSummary(slide: Slide | undefined): string {
  if (!slide || slide.objects.length === 0) return '';
  const counts = new Map<string, number>();
  for (const object of slide.objects) {
    const label = KIND_LABELS[object.kind];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, n]) => `${n} ${label}`).join(', ');
}

export interface SlidesActionContext {
  slide: Slide | undefined;
  /** Add a text object carrying the result to the active slide (on Insert). */
  onAddText: (text: string) => void;
  /** Set the active slide's speaker notes (on Insert). */
  onSetNotes: (notes: string) => void;
}

export function slidesActions({ slide, onAddText, onSetNotes }: SlidesActionContext): AiAction[] {
  return [
    {
      id: 'slides.ai.outline',
      label: 'Generate outline',
      description: 'Draft a slide outline from a topic',
      promptPlaceholder: 'Presentation topic…',
      buildPrompt: outlinePrompt,
      onResult: (text) => onAddText(text),
    },
    {
      id: 'slides.ai.layout',
      label: 'Suggest layout',
      description: 'Recommend a layout (read-only)',
      getInput: () => {
        const summary = slideObjectSummary(slide);
        return summary === '' ? null : summary;
      },
      buildPrompt: layoutPrompt,
      // No onResult — advisory text only.
    },
    {
      id: 'slides.ai.notes',
      label: 'Draft speaker notes',
      description: 'Write notes for this slide',
      getInput: () => {
        const text = slideTextContent(slide);
        return text === '' ? null : text;
      },
      buildPrompt: speakerNotesPrompt,
      onResult: (text) => onSetNotes(text),
    },
  ];
}
