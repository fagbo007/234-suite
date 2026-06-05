# AI sidebar — rules & scaffold decisions

> This document is the **single source of truth for the AI sidebar rule** (root
> CLAUDE.md §6). The rule below cannot be overridden by any feature request
> without a deliberate decision recorded *in this file*.

## The AI sidebar rule (root §6)

- **AI lives in a collapsible sidebar only.**
- **It never floats over content.**
- **It never speaks first.**
- **The user invokes it — it never invokes itself.**

This exists because Microsoft's Copilot, placed as a floating element over
document content, generated significant user backlash and had to be reverted. We
do not repeat that mistake.

## Phase 2 scaffold (implemented)

The shared component lives in **`/packages/ai-sidebar`** (`@234/ai-sidebar`) and
is mounted by all three apps. Decisions:

- **Docked, never floating.** `AiSidebar` renders as a normal flex sibling in the
  app workspace (a `<aside role="complementary">`, `border-left`, fixed width) —
  **never** `position: fixed` and never an overlay over content (root §16).
- **User-invoked only.** Open/closed state is owned by `useAiSidebar(app)`; it
  **defaults to closed** and only changes via the user's "AI assistant" button or
  the "Toggle AI assistant" command. Nothing auto-opens it. State is remembered
  per app in `localStorage` (`234:ai-sidebar:<app>`).
- **No AI content in Phase 2.** The panel carries placeholder copy only — **no
  inputs, no network, nothing runs automatically.** It cannot "speak first"
  because there is nothing for it to say yet.
- **AI is always optional.** Every app is 100% usable with the sidebar closed (its
  default). This is enforced by construction: no app feature depends on it.

## Phase 3 — features (in progress)

**Provider engine + Writer features (part 1, implemented):**
- `AiProvider` interface in `/packages/ai-sidebar/src/provider.ts`. Offline-first:
  `mockProvider` (deterministic, no network, the **default**) and a **local
  Ollama** provider (`createOllamaProvider`, no API key). `useAiSettings` persists
  the provider choice (`localStorage`, default `mock`).
- `AiActionPanel` (generic, user-invoked buttons → result with Insert/Copy/
  Dismiss) + `AiSettings` (provider picker; the cloud key manager was added with
  the cloud providers — see below).
- Writer actions (`apps/writer/src/ai/writerActions.ts`): rephrase, summarise,
  explain (read-only), continue — all inside the docked sidebar, applied to the
  document only on the user's "Insert".
- Sheet (NL→formula, explain formula, suggest chart) and Slides (outline, layout,
  speaker notes) follow in parts 2–3.

**Cloud providers + OS-keychain key storage (implemented — 2026-06-04):** now
that the Tauri window builds, Claude / OpenAI are live with §6-compliant key
storage:
- **The API key never enters JS.** A shared Rust crate `packages/ai-backend`
  (`app234_ai`, depended on by each app's `src-tauri`) exposes Tauri commands
  `ai_set_key` / `ai_delete_key` / `ai_has_key` / `ai_cloud_complete`. The key is
  written to the **OS keychain** (`keyring`: Windows Credential Manager / macOS
  Keychain / Linux Secret Service) and read **only inside Rust**, which makes the
  HTTPS call itself (via `ureq`). JS can store / clear / check-presence but cannot
  read the key back. This also sidesteps browser CORS to the provider APIs.
- Frontend: `createCloudProvider('claude' | 'openai', …)` in `provider.ts` (a thin
  `invoke('ai_cloud_complete')` wrapper); `keychain.ts` bridges set/clear/has;
  `AiSettings` gains Claude/OpenAI options with a model field + a write-only key
  manager (Save / Clear / "key saved"). Keys are **never** in `localStorage` or
  React state beyond the transient input.
- §6 honoured: keys never in plaintext (keychain only; if the keychain is
  unavailable the command errors rather than writing plaintext); transmitted only
  to the provider's own endpoint; 234 ships no default key; AI stays docked,
  user-invoked, optional (default provider is still offline `mock`).
- **Deferred:** the §6 **AES-256 encrypted-file fallback** for keychain-less
  systems (headless Linux without Secret Service). `keyring` covers the mainstream
  platforms; until the fallback lands, such systems simply cannot store a cloud
  key (never a plaintext write).

The four rule bullets above continue to hold in Phase 3 and beyond.

## Overriding the rule

Any change to the four-bullet rule (e.g. a proactive suggestion, a non-docked
surface) requires a new dated entry in this file plus a root CLAUDE.md §17
decision-log entry, agreed with the project owner before implementation.

## References

- Root CLAUDE.md §6 (AI integration rules), §16 (constraints), §4 (monorepo map).
- Implementation: `/packages/ai-sidebar/src/{AiSidebar.tsx,useAiSidebar.ts}`.
