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
  Dismiss) + `AiSettings` (provider picker; **no API-key field**).
- Writer actions (`apps/writer/src/ai/writerActions.ts`): rephrase, summarise,
  explain (read-only), continue — all inside the docked sidebar, applied to the
  document only on the user's "Insert".
- Sheet (NL→formula, explain formula, suggest chart) and Slides (outline, layout,
  speaker notes) follow in parts 2–3.

**Deferred to the Tauri window (why):** cloud providers (Claude/OpenAI) and §6
**API-key storage** (OS keychain primary, AES-256 encrypted-file fallback) live
in the Rust/Tauri backend, which isn't built yet (no MSVC on this machine —
CLAUDE.md §17). Until then 234 ships **no cloud key path at all** — so no key is
ever stored in plaintext (none is stored). Local Ollama needs no key and works
now. When the window lands, a Claude/OpenAI provider implements the same
`AiProvider` interface and keys are stored per §6.

The four rule bullets above continue to hold in Phase 3 and beyond.

## Overriding the rule

Any change to the four-bullet rule (e.g. a proactive suggestion, a non-docked
surface) requires a new dated entry in this file plus a root CLAUDE.md §17
decision-log entry, agreed with the project owner before implementation.

## References

- Root CLAUDE.md §6 (AI integration rules), §16 (constraints), §4 (monorepo map).
- Implementation: `/packages/ai-sidebar/src/{AiSidebar.tsx,useAiSidebar.ts}`.
