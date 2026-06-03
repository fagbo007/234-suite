import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiSettings } from './AiSettings';
import { DEFAULT_AI_SETTINGS } from './useAiSettings';

describe('AiSettings', () => {
  it('hides Ollama fields until Ollama is selected, with no API-key field', () => {
    const onChange = vi.fn();
    const { rerender } = render(<AiSettings settings={DEFAULT_AI_SETTINGS} onChange={onChange} />);
    expect(screen.queryByLabelText('Model')).toBeNull();
    // No API-key field exists (cloud deferred to the Tauri window).
    expect(screen.queryByLabelText(/api key/i)).toBeNull();

    fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'ollama' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ provider: 'ollama' }));

    rerender(<AiSettings settings={{ ...DEFAULT_AI_SETTINGS, provider: 'ollama' }} onChange={onChange} />);
    expect(screen.getByLabelText('Model')).toBeTruthy();
    expect(screen.getByLabelText('Ollama server')).toBeTruthy();
  });
});
