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

  it('runs a free-text prompt action from typed input', async () => {
    const action: AiAction = {
      id: 'nl-formula',
      label: 'Natural language to formula',
      promptPlaceholder: 'Describe the formula…',
      buildPrompt: (input) => ({ prompt: `Formula for: ${input}` }),
    };
    render(<AiActionPanel actions={[action]} provider={mockProvider} />);

    const run = screen.getByRole('button', { name: /natural language to formula/i }) as HTMLButtonElement;
    expect(run.disabled).toBe(true); // empty input → disabled

    fireEvent.change(screen.getByLabelText('Natural language to formula input'), {
      target: { value: 'total of column A' },
    });
    expect(run.disabled).toBe(false);

    fireEvent.click(run);
    await waitFor(() =>
      expect(screen.getByText('[sample output] Formula for: total of column A')).toBeTruthy(),
    );
  });
});
