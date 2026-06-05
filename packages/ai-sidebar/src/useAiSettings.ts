import { useMemo, useState } from 'react';
import {
  type AiProvider,
  createCloudProvider,
  createOllamaProvider,
  mockProvider,
} from './provider';

export type ProviderId = 'mock' | 'ollama' | 'claude' | 'openai';

export interface AiSettings {
  provider: ProviderId;
  ollamaBaseUrl: string;
  ollamaModel: string;
  claudeModel: string;
  openaiModel: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'mock', // offline by default — nothing calls the network unless chosen
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  // Cloud models — sensible defaults. The API key lives in the OS keychain, never here.
  claudeModel: 'claude-3-5-sonnet-latest',
  openaiModel: 'gpt-4o-mini',
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
 * provider (root §6: AI is always optional). Cloud API keys are **never** stored
 * here — they live in the OS keychain (see `keychain.ts`); only the chosen
 * provider id and model names are persisted.
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
    switch (settings.provider) {
      case 'ollama':
        return createOllamaProvider({
          baseUrl: settings.ollamaBaseUrl,
          model: settings.ollamaModel,
        });
      case 'claude':
        return createCloudProvider('claude', 'Claude', settings.claudeModel);
      case 'openai':
        return createCloudProvider('openai', 'OpenAI', settings.openaiModel);
      default:
        return mockProvider;
    }
  }, [
    settings.provider,
    settings.ollamaBaseUrl,
    settings.ollamaModel,
    settings.claudeModel,
    settings.openaiModel,
  ]);

  return { settings, setSettings, provider };
}
