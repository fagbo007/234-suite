# Plugin / extension API

> **Status: loader implemented (in-tree, opt-in).** The `@234/plugin-host`
> package ships the runtime loader (`definePlugin` + `loadPlugins`) over the two
> real seams; all three apps load their built-in plugin list on mount, and a
> shipped `sampleProviderPlugin` proves the path end-to-end. **Dynamic discovery,
> remote loading, and sandboxing remain Phase-4-proper** (they need the Tauri
> backend to mediate FS/network/secrets) — see "Out of scope" below.

## Implemented (this slice)

- **`@234/plugin-host`** (`packages/plugin-host`): `definePlugin(plugin)`, the
  narrow `PluginHost` (`{ app, registerCommand, registerAiProvider }`), and
  `loadPlugins(plugins, opts): () => void` with **id-dedup** (each id loads once),
  **error isolation** (a plugin throwing in `setup` is logged + rolled back; the
  rest still load), and **full teardown** (the returned disposer removes every
  contribution — the plugin's own teardown plus all auto-tracked unregisters).
  The host is **dependency-inverted**: the app injects `registerCommand`
  (`@234/shared`) and `registerAiProvider` (`@234/ai-sidebar`), so the package is
  pure logic with type-only imports of `Command`/`AiProvider` (node-testable).
- **AI-provider registry** (`@234/ai-sidebar` `providerRegistry.ts`): a
  `useSyncExternalStore`-friendly store; `useAiSettings` resolves a
  plugin-registered provider and `AiSettings` lists it in the docked sidebar's
  provider selector — so a plugin's provider is genuinely user-selectable.
- **Enable/disable** (persisted): `@234/plugin-host` `toggles.ts` is a
  `localStorage`-backed store of disabled ids (default all-enabled) +
  `usePluginManager(allPlugins)` (React hook, optional peer dep) returning the
  plugin list, a setter, and the stable `enabledPlugins` subset. The shared
  `PluginManager` component (structural props) renders a "Plugins" section in the
  docked AI sidebar.
- **App wiring**: each app keeps a `BUILTIN_PLUGINS` array, calls
  `usePluginManager(BUILTIN_PLUGINS)`, and `loadPlugins(plugins.enabledPlugins,
  { app, registerCommand, registerAiProvider })` in an effect keyed on the enabled
  set — so toggling a plugin tears down + reloads live (disabling the shipped
  `sampleProviderPlugin` removes it from the AI provider selector).

## Goal

Let third parties extend the apps **without forking** — primarily by adding
**command-palette commands** and **AI providers** — while preserving the suite's
core rules (offline-first, MIT, the AI sidebar rule §6, the design system §5).

## The two seams that already exist

The plugin API is deliberately thin because the extension points are already
real, tested module APIs:

1. **Commands** — `registerCommand(command: Command)` from `@234/shared`
   (`apps/shared/components/CommandPalette/`). A `Command` is
   `{ id, title, icon?, group?, isAvailable?(ctx), run(ctx) }`. This is how every
   app already adds palette actions; a plugin would do the same.
2. **AI providers** — the `AiProvider` interface from `@234/ai-sidebar`
   (`packages/ai-sidebar/src/provider.ts`):
   `{ id, label, offline, complete({ prompt, system? }) }`. This is the §6
   Phase-4 hook — *"the plugin API lets third-party AI integrations extend the
   sidebar."* A plugin would register an additional provider (e.g. a self-hosted
   model) alongside the built-in mock + Ollama.

## Proposed contract

```ts
interface PluginHost {
  /** Add a command to the palette (same Command shape apps already use). */
  registerCommand(command: Command): () => void;
  /** Add an AI provider the user can select in the sidebar settings. */
  registerAiProvider(provider: AiProvider): () => void;
  /** Which app this plugin is loading into: 'writer' | 'sheet' | 'slides'. */
  readonly app: string;
}

interface Plugin {
  id: string;            // reverse-DNS, e.g. "com.example.wordcount"
  name: string;          // sentence case
  setup(host: PluginHost): void | (() => void);  // optional teardown
}

/** Author a plugin (type-only helper; no runtime magic). */
function definePlugin(plugin: Plugin): Plugin;
```

Each `register*` call returns an unregister function; the host calls them on
plugin teardown so disabling a plugin fully removes its contributions.

## Examples

```ts
// A command plugin (Writer): insert today's date.
export default definePlugin({
  id: 'com.example.today',
  name: 'Insert today',
  setup(host) {
    return host.registerCommand({
      id: 'plugin.today',
      title: 'Insert today’s date',
      group: 'Insert',
      run: () => {/* dispatch into the active editor */},
    });
  },
});
```

```ts
// An AI-provider plugin: a self-hosted OpenAI-compatible endpoint.
export default definePlugin({
  id: 'com.example.myllm',
  name: 'My LLM',
  setup(host) {
    return host.registerAiProvider({
      id: 'myllm',
      label: 'My LLM',
      offline: false,
      async complete({ prompt, system }) {/* fetch the endpoint */ return ''; },
    });
  },
});
```

The provider plugin honours the AI sidebar rule automatically: it only ever
feeds the existing docked, user-invoked sidebar — it cannot float UI or speak
first, because it has no surface of its own.

## Rules a plugin must follow

- **AI sidebar rule (§6)** — providers extend the docked sidebar only; no
  floating UI, no auto-invocation. AI stays optional.
- **Design system (§5)** — any command icon is a Tabler outline icon; titles are
  sentence case.
- **No raw A1 in Sheet storage (§3.4/§16)**, **no plaintext secrets** — a
  provider plugin must use the host's (future) key-storage API, never a
  plaintext file.
- **MIT-compatible** licensing for in-tree plugins.

## Trust & security stance (v1)

- v1 plugins are **in-tree / opt-in**, reviewed like code — no remote dynamic
  code execution.
- The `PluginHost` exposes a **narrow, capability-style surface** (just the
  register seams), not the raw app internals.
- Dynamic, third-party loading + sandboxing arrives with the Tauri window, where
  the Rust backend can mediate filesystem/network/secret access.

## Out of scope (→ Phase 4 proper)

- **Dynamic discovery / remote loading / sandboxing** (needs the Tauri backend to
  mediate filesystem/network/secret access). v1 stays in-tree, reviewed-like-code.
- A host **key-storage API** for cloud-provider plugins (rides on the §6
  OS-keychain work — the host surface is deliberately narrow for now).
- Per-app **capability injection** beyond the two register seams (e.g. editor /
  grid / canvas access for app-specific command plugins).

## References

- Loader: `packages/plugin-host/src/{host.ts,examples.ts}`.
- Command seam: `apps/shared/components/CommandPalette/{types.ts,registry.ts}`.
- AI provider seam: `packages/ai-sidebar/src/provider.ts` + the
  `providerRegistry.ts` store; rule in `docs/architecture/ai-sidebar.md` and root
  `CLAUDE.md` §6.
