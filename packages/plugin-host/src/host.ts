/**
 * Plugin loader (root §9 Phase 4; docs/architecture/plugin-api.md). Makes the
 * plugin-API sketch real: a narrow, capability-style `PluginHost` exposing the
 * two extension seams that already exist as tested module APIs — command-palette
 * commands (`@234/shared`) and AI providers (`@234/ai-sidebar`) — plus a loader
 * with id-dedup, error isolation, and full teardown.
 *
 * v1 plugins are in-tree / opt-in, reviewed like code — no remote/dynamic load
 * (that needs the Tauri backend to mediate FS/network/secrets; Phase 4 proper).
 * The host is dependency-inverted: the app injects the two `register*` functions,
 * so this module stays pure (type-only imports of `Command`/`AiProvider`, erased
 * at runtime) and node-testable. A provider plugin honours §6 automatically — it
 * only ever feeds the existing docked, user-invoked sidebar; it has no surface of
 * its own.
 */
import { type Command } from '@234/shared';
import { type AiProvider } from '@234/ai-sidebar';

/** The narrow surface a plugin may use — just the two register seams + `app`. */
export interface PluginHost {
  /** Which app this plugin is loading into: 'writer' | 'sheet' | 'slides'. */
  readonly app: string;
  /** Add a palette command (the same `Command` shape apps already use). */
  registerCommand(command: Command): () => void;
  /** Add an AI provider the user can select in the sidebar settings. */
  registerAiProvider(provider: AiProvider): () => void;
}

export interface Plugin {
  /** Reverse-DNS, e.g. "com.example.wordcount". */
  id: string;
  /** Sentence case. */
  name: string;
  /** Wire contributions; may return an optional teardown. */
  setup(host: PluginHost): void | (() => void);
}

/** Author a plugin (type-only helper; no runtime magic). */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

export interface LoadOptions {
  app: string;
  registerCommand: (command: Command) => () => void;
  registerAiProvider: (provider: AiProvider) => () => void;
}

/**
 * Load a list of plugins. Each id loads once (duplicates are skipped with a
 * warning); a plugin throwing in `setup` is logged and skipped without stopping
 * the others (error isolation); every contribution is tracked so the returned
 * master teardown fully removes a plugin's commands/providers even if it returned
 * no teardown of its own.
 */
export function loadPlugins(plugins: Plugin[], opts: LoadOptions): () => void {
  const teardowns: Array<() => void> = [];
  const seen = new Set<string>();

  for (const plugin of plugins) {
    if (seen.has(plugin.id)) {
      console.warn(`[plugin-host] duplicate plugin id "${plugin.id}" skipped.`);
      continue;
    }
    seen.add(plugin.id);

    const unregisters: Array<() => void> = [];
    const host: PluginHost = {
      app: opts.app,
      registerCommand: (command) => {
        const off = opts.registerCommand(command);
        unregisters.push(off);
        return off;
      },
      registerAiProvider: (provider) => {
        const off = opts.registerAiProvider(provider);
        unregisters.push(off);
        return off;
      },
    };

    let pluginTeardown: void | (() => void);
    try {
      pluginTeardown = plugin.setup(host);
    } catch (error) {
      console.error(`[plugin-host] plugin "${plugin.id}" failed to load:`, error);
      // Roll back any partial registrations from this plugin, then move on.
      for (const off of unregisters.reverse()) off();
      continue;
    }

    teardowns.push(() => {
      if (typeof pluginTeardown === 'function') {
        try {
          pluginTeardown();
        } catch (error) {
          console.error(`[plugin-host] plugin "${plugin.id}" teardown failed:`, error);
        }
      }
      // Unregister everything this plugin contributed (LIFO). Idempotent, so it
      // is safe even when the plugin already returned one of these unregisters.
      for (const off of unregisters.reverse()) off();
    });
  }

  return () => {
    for (const teardown of teardowns.reverse()) teardown();
  };
}
