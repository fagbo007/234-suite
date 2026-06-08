/**
 * AI-provider registry (root §6 Phase-4 hook). Plugins register additional
 * providers here via the plugin host; `useAiSettings` resolves them and
 * `AiSettings` lists them in the docked sidebar's provider selector. Mirrors the
 * command-palette registry pattern (`apps/shared/components/CommandPalette/
 * registry.ts`) so it is `useSyncExternalStore`-friendly.
 *
 * Registered providers only ever feed the existing docked, user-invoked sidebar —
 * they have no surface of their own, so the §6 AI sidebar rule holds automatically.
 */
import { type AiProvider } from './provider';

const providers = new Map<string, AiProvider>();
const listeners = new Set<() => void>();

// Cached snapshot so useSyncExternalStore sees a stable reference between changes.
let snapshot: AiProvider[] = [];

function emit(): void {
  snapshot = [...providers.values()];
  for (const listener of listeners) listener();
}

/** Register an AI provider. Returns an idempotent unregister function. */
export function registerProvider(provider: AiProvider): () => void {
  providers.set(provider.id, provider);
  emit();
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    if (providers.delete(provider.id)) emit();
  };
}

export function getProviders(): AiProvider[] {
  return snapshot;
}

export function subscribeProviders(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
