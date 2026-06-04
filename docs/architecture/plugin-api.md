# Plugin / extension API — sketch

> **Status: design sketch (Phase 4 prep).** This documents the *intended*
> extension contract, grounded in seams that already exist in the codebase. A
> working plugin loader (discovery, sandboxing, dynamic loading) is **Phase 4
> proper** and needs the Tauri window — see "Out of scope" below. Nothing here
> ships as runtime code yet.

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

- A working plugin **loader / discovery / sandbox** (needs the Tauri window).
- A settings UI to enable/disable plugins.
- A host key-storage API for cloud-provider plugins (rides on the §6 OS-keychain
  work, also deferred to the window).

## References

- Command seam: `apps/shared/components/CommandPalette/{types.ts,registry.ts}`.
- AI provider seam: `packages/ai-sidebar/src/provider.ts`; rule in
  `docs/architecture/ai-sidebar.md` and root `CLAUDE.md` §6.
