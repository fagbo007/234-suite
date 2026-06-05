import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiSettings } from './AiSettings';
import { DEFAULT_AI_SETTINGS } from './useAiSettings';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

type Win = Record<string, unknown>;

describe('AiSettings', () => {
  afterEach(() => {
    delete (window as unknown as Win).__TAURI_INTERNALS__;
    invoke.mockReset();
  });

  it('hides provider fields until a provider is selected; no key field for offline providers', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AiSettings settings={DEFAULT_AI_SETTINGS} onChange={onChange} />);
    expect(screen.queryByLabelText('Model')).toBeNull();
    // The default (mock) provider never shows an API-key field.
    expect(screen.queryByLabelText(/api key/i)).toBeNull();

    fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'ollama' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ provider: 'ollama' }));

    rerender(<AiSettings settings={{ ...DEFAULT_AI_SETTINGS, provider: 'ollama' }} onChange={onChange} />);
    expect(screen.getByLabelText('Model')).toBeTruthy();
    expect(screen.getByLabelText('Ollama server')).toBeTruthy();
  });

  it('shows a model + key manager for Claude (desktop), and Save stores the key', async () => {
    (window as unknown as Win).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValue(false); // ai_has_key → false; ai_set_key resolves (ignored)
    const onChange = vi.fn();
    render(<AiSettings settings={{ ...DEFAULT_AI_SETTINGS, provider: 'claude' }} onChange={onChange} />);

    expect(screen.getByLabelText('Model')).toBeTruthy();
    const keyInput = screen.getByLabelText('API key');
    expect(keyInput).toBeTruthy();

    fireEvent.change(keyInput, { target: { value: 'sk-abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('ai_set_key', { provider: 'claude', key: 'sk-abc' }),
    );
  });

  it('shows a desktop-only note (no key field) for cloud keys in the web build', () => {
    const onChange = vi.fn();
    render(<AiSettings settings={{ ...DEFAULT_AI_SETTINGS, provider: 'openai' }} onChange={onChange} />);
    expect(screen.queryByLabelText('API key')).toBeNull();
    expect(screen.getByText(/desktop app/i)).toBeTruthy();
  });
});
