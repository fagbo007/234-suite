/**
 * AI provider engine (root CLAUDE.md §6). Providers are interchangeable behind a
 * tiny interface so the sidebar's features never depend on a specific backend.
 *
 * Phase 3 part 1 shipped offline-first: `mockProvider` (deterministic, no
 * network, the default) and a **local Ollama** provider (no API key). The cloud
 * providers (`createCloudProvider`) now run through Rust: the completion happens
 * in the Tauri backend, which reads the user's key from the OS keychain — the key
 * never enters JS (root §6). 234 never ships a default key.
 */
import { invoke } from '@tauri-apps/api/core';
import { type CloudProviderId, isDesktop } from './keychain';

export interface AiRequest {
  prompt: string;
  system?: string;
}

export interface AiProvider {
  id: string;
  label: string;
  /** True when the provider can run without further configuration/network. */
  offline: boolean;
  complete(request: AiRequest): Promise<string>;
}

/**
 * Offline, deterministic provider — the default. It never reaches the network;
 * it returns a clearly-labelled echo so the UI is exercisable with no model
 * installed. Real generation requires selecting a provider (e.g. Ollama).
 */
export const mockProvider: AiProvider = {
  id: 'mock',
  label: 'Off (sample text)',
  offline: true,
  complete({ prompt }: AiRequest): Promise<string> {
    const trimmed = prompt.trim();
    return Promise.resolve(`[sample output] ${trimmed}`);
  },
};

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

/**
 * Local Ollama provider — talks to a user-run Ollama server (default
 * http://localhost:11434), no API key. Offline in the sense of "no third-party
 * cloud", but it does require the local server to be running.
 */
export function createOllamaProvider({ baseUrl, model }: OllamaConfig): AiProvider {
  return {
    id: 'ollama',
    label: 'Local Ollama',
    offline: true,
    async complete({ prompt, system }: AiRequest): Promise<string> {
      const url = `${baseUrl.replace(/\/$/, '')}/api/generate`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, system, stream: false }),
        });
      } catch {
        throw new Error(`Could not reach Ollama at ${baseUrl}. Is it running?`);
      }
      if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status}).`);
      }
      const data = (await response.json()) as { response?: string };
      return data.response ?? '';
    },
  };
}

/**
 * Cloud provider (Claude or OpenAI). The completion runs in the Tauri backend
 * (`ai_cloud_complete`), which reads the API key from the OS keychain — the key
 * never enters JS (root §6). Requires the desktop app; in the web build
 * `complete` throws a friendly error.
 */
export function createCloudProvider(
  id: CloudProviderId,
  label: string,
  model: string,
): AiProvider {
  return {
    id,
    label,
    offline: false,
    async complete({ prompt, system }: AiRequest): Promise<string> {
      if (!isDesktop()) {
        throw new Error('Cloud AI is available in the desktop app.');
      }
      return invoke<string>('ai_cloud_complete', {
        provider: id,
        model,
        system: system ?? null,
        prompt,
      });
    },
  };
}
