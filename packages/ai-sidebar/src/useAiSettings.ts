import { useMemo, useState } from 'react';
import { type AiProvider, createOllamaProvider, mockProvider } from './provider';

export type ProviderId = 'mock' | 'ollama';

export interface AiSettings {
  provider: ProviderId;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'mock', // offline by default — nothing calls the network unless chosen
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
};

const KEY = '234:ai-settings';

function readSettings(): AiSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...(JSON.parse(raw) as Partial<AiSettings>) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export interface UseAiSettings {
  settings: AiSettings;
  setSettings: (next: AiSettings) => void;
  provider: AiProvider;
}

/**
 * AI provider settings, persisted in localStorage. Default is the offline `mock`
 * provider, so the suite never reaches the network unless the user opts into a
 * provider (root §6: AI is always optional). No API keys are stored (cloud
 * providers + OS-keychain storage arrive with the Tauri window).
 */
export function useAiSettings(): UseAiSettings {
  const [settings, setSettingsState] = useState<AiSettings>(() => readSettings());

  const setSettings = (next: AiSettings) => {
    setSettingsState(next);
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — non-fatal */
    }
  };

  const provider = useMemo<AiProvider>(() => {
    if (settings.provider === 'ollama') {
      return createOllamaProvider({ baseUrl: settings.ollamaBaseUrl, model: settings.ollamaModel });
    }
    return mockProvider;
  }, [settings.provider, settings.ollamaBaseUrl, settings.ollamaModel]);

  return { settings, setSettings, provider };
}
