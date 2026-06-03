import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiActionPanel, type AiAction } from './AiActionPanel';
import { mockProvider } from './provider';

describe('AiActionPanel', () => {
  it('runs an action on click and shows the result, then inserts it', async () => {
    const onResult = vi.fn();
    const action: AiAction = {
      id: 'rephrase',
      label: 'Rephrase',
      getInput: () => 'hello world',
      buildPrompt: (input) => ({ prompt: `Rephrase: ${input}` }),
      onResult,
    };
    render(<AiActionPanel actions={[action]} provider={mockProvider} />);

    fireEvent.click(screen.getByRole('button', { name: /rephrase/i }));

    await waitFor(() => expect(screen.getByText('[sample output] Rephrase: hello world')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    expect(onResult).toHaveBeenCalledWith('[sample output] Rephrase: hello world');
  });

  it('disables an action with no input', () => {
    const action: AiAction = {
      id: 'explain',
      label: 'Explain',
      getInput: () => null,
      buildPrompt: (input) => ({ prompt: input }),
    };
    render(<AiActionPanel actions={[action]} provider={mockProvider} />);
    expect((screen.getByRole('button', { name: /explain/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
