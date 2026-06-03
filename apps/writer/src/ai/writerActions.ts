import { type AiAction, type AiRequest } from '@234/ai-sidebar';
import { type EditorView } from 'prosemirror-view';
import { insertText, replaceSelection, selectedText } from '../editor/commands';

/**
 * Writer AI actions (root §9). Pure prompt builders + the document side-effect
 * each action applies on "Insert". All user-invoked via the docked sidebar; the
 * document is only changed when the user clicks Insert.
 */

const SYSTEM = 'You are a concise writing assistant inside a word processor. Reply with prose only.';

export function rephrasePrompt(text: string): AiRequest {
  return { system: SYSTEM, prompt: `Rephrase the following text, keeping its meaning:\n\n${text}` };
}
export function summarisePrompt(text: string): AiRequest {
  return { system: SYSTEM, prompt: `Summarise the following text in one or two sentences:\n\n${text}` };
}
export function explainPrompt(text: string): AiRequest {
  return { system: SYSTEM, prompt: `Explain the following text clearly and simply:\n\n${text}` };
}
export function continuePrompt(text: string): AiRequest {
  return { system: SYSTEM, prompt: `Continue writing naturally from where this leaves off:\n\n${text}` };
}

/** Build the Writer AI actions bound to the live editor view. */
export function writerActions(view: EditorView | null): AiAction[] {
  const selection = (): string | null => {
    if (!view) return null;
    const text = selectedText(view.state).trim();
    return text.length > 0 ? text : null;
  };
  const documentText = (): string | null => {
    if (!view) return null;
    const text = view.state.doc.textBetween(0, view.state.doc.content.size, ' ').trim();
    return text.length > 0 ? text : null;
  };

  return [
    {
      id: 'writer.ai.rephrase',
      label: 'Rephrase',
      description: 'Reword the selection',
      getInput: selection,
      buildPrompt: rephrasePrompt,
      onResult: (text) => view && replaceSelection(view, text),
    },
    {
      id: 'writer.ai.summarise',
      label: 'Summarise',
      description: 'Condense the selection',
      getInput: selection,
      buildPrompt: summarisePrompt,
      onResult: (text) => view && replaceSelection(view, text),
    },
    {
      id: 'writer.ai.explain',
      label: 'Explain',
      description: 'Explain the selection (read-only)',
      getInput: selection,
      buildPrompt: explainPrompt,
      // No onResult — explanation is informational, never edits the document.
    },
    {
      id: 'writer.ai.continue',
      label: 'Continue writing',
      description: 'Draft what comes next',
      getInput: documentText,
      buildPrompt: continuePrompt,
      onResult: (text) => view && insertText(view, ` ${text}`),
    },
  ];
}
