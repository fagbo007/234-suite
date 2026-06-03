import { Button } from '@234/shared';
import { useState } from 'react';
import { type AiProvider, type AiRequest } from './provider';
import styles from './AiActionPanel.module.css';

export interface AiAction {
  id: string;
  label: string;
  description?: string;
  /**
   * Context input (e.g. the selected text / active cell). Used when the action
   * does NOT declare `promptPlaceholder`. Null/empty disables the action.
   */
  getInput?: () => string | null;
  /**
   * When set, the panel renders a free-text field and uses what the user types
   * as the input (e.g. Sheet's natural-language → formula). Takes precedence
   * over `getInput`.
   */
  promptPlaceholder?: string;
  buildPrompt: (input: string) => AiRequest;
  /** When present, the result can be inserted/applied to the document. */
  onResult?: (text: string) => void;
}

export interface AiActionPanelProps {
  actions: AiAction[];
  provider: AiProvider;
}

interface ResultState {
  actionId: string;
  text: string;
}

/**
 * Renders one control per AI action. Everything is **user-invoked** — actions
 * run only on click, never automatically (root §6). Results show inline with
 * Insert / Copy / Dismiss; nothing is applied to the document without the user.
 */
export function AiActionPanel({ actions, provider }: AiActionPanelProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  const effectiveInput = (action: AiAction): string | null =>
    action.promptPlaceholder !== undefined ? (prompts[action.id] ?? '') : (action.getInput?.() ?? null);

  const run = async (action: AiAction) => {
    const input = effectiveInput(action);
    if (!input || input.trim() === '') return;
    setRunningId(action.id);
    setResult(null);
    setError(null);
    try {
      const text = await provider.complete(action.buildPrompt(input));
      setResult({ actionId: action.id, text });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI request failed.');
    } finally {
      setRunningId(null);
    }
  };

  const resultAction = result ? actions.find((a) => a.id === result.actionId) : undefined;

  return (
    <div className={styles.panel}>
      <ul className={styles.actions}>
        {actions.map((action) => {
          const usable = (effectiveInput(action) ?? '').trim() !== '';
          const disabled = runningId !== null || !usable;
          return (
            <li key={action.id} className={styles.item}>
              {action.promptPlaceholder !== undefined ? (
                <input
                  type="text"
                  className={styles.promptInput}
                  aria-label={`${action.label} input`}
                  placeholder={action.promptPlaceholder}
                  value={prompts[action.id] ?? ''}
                  onChange={(event) => setPrompts((prev) => ({ ...prev, [action.id]: event.target.value }))}
                />
              ) : null}
              <button
                type="button"
                className={styles.action}
                disabled={disabled}
                onClick={() => void run(action)}
              >
                <span className={styles.actionLabel}>{action.label}</span>
                {action.description ? (
                  <span className={styles.actionHint}>{action.description}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {runningId ? (
        <p className={styles.status} role="status">
          Generating…
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className={styles.result}>
          <p className={styles.resultText} role="status">
            {result.text}
          </p>
          <div className={styles.resultActions}>
            {resultAction?.onResult ? (
              <Button
                variant="primary"
                onClick={() => {
                  resultAction.onResult?.(result.text);
                  setResult(null);
                }}
              >
                Insert
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                void globalThis.navigator?.clipboard?.writeText(result.text);
              }}
            >
              Copy
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
