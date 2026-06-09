// @234/plugin-host — the in-tree plugin loader (root §9 Phase 4;
// docs/architecture/plugin-api.md). `definePlugin` authors a plugin; `loadPlugins`
// loads a list against injected `registerCommand`/`registerAiProvider` seams with
// id-dedup, error isolation, and full teardown. v1 plugins are in-tree/opt-in;
// dynamic discovery + sandboxing are Phase-4-proper (Tauri window).
export {
  definePlugin,
  loadPlugins,
  type Plugin,
  type PluginHost,
  type LoadOptions,
} from './host';
export { sampleProviderPlugin, sampleCommandPlugin } from './examples';
export {
  isPluginEnabled,
  setPluginEnabled,
  getDisabledIds,
  subscribePlugins,
  enabledPlugins,
} from './toggles';
export {
  usePluginManager,
  type PluginManager,
  type PluginManagerItem,
} from './usePluginManager';

// Re-exported for one-import authoring (type-only — erased at runtime).
export { type Command } from '@234/shared';
export { type AiProvider } from '@234/ai-sidebar';
