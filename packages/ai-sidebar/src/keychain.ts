/**
 * Cloud API key storage (root CLAUDE.md §6). Keys live in the OS keychain via
 * Rust commands (`ai_set_key` / `ai_delete_key` / `ai_has_key`); this module is
 * a thin, guarded bridge. The key is **never read back into JS** — we can store,
 * clear, and check presence only. In the plain web dev build (no Tauri) storage
 * is unavailable and the helpers degrade gracefully.
 */
import { invoke } from '@tauri-apps/api/core';

export type CloudProviderId = 'claude' | 'openai';

/** True only inside the Tauri desktop shell. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Whether a key is stored for the provider (false in the web build). */
export async function hasKey(provider: CloudProviderId): Promise<boolean> {
  if (!isDesktop()) return false;
  return invoke<boolean>('ai_has_key', { provider });
}

/** Store a key in the OS keychain. Throws in the web build. */
export async function setKey(provider: CloudProviderId, key: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error('API keys can only be saved in the desktop app.');
  }
  await invoke('ai_set_key', { provider, key });
}

/** Remove a stored key (no-op in the web build). */
export async function deleteKey(provider: CloudProviderId): Promise<void> {
  if (!isDesktop()) return;
  await invoke('ai_delete_key', { provider });
}
