# Real-time collaboration

> **Status: core implemented (2026-06-05); per-app bindings in progress.** The
> transport-agnostic Yjs core + relay ship in `/packages/collab` (`@234/collab`);
> the per-app document bindings + UI (Sheet/Writer/Slides) are the named
> follow-up slices below. Grounded in root `CLAUDE.md` §3.1 (Yjs), §9 (Phase 4),
> §17 (collaboration decision).

## Goal

Optional, offline-first real-time collaboration across all three apps — without
forcing an account, a server, or a trust relationship on anyone. Single-user,
fully-offline editing always works; collaboration is progressive enhancement.

## Model: CRDTs (Yjs)

Each document is backed by a **Yjs** document (CRDT), so concurrent edits merge
without a central authority and **work offline** — a peer can edit disconnected
and reconcile on reconnect (root §3.1). The app's native model maps onto Yjs
shared types:

- **Writer** — the ProseMirror doc binds to a `Y.XmlFragment` (y-prosemirror).
- **Sheet** — cells/named refs in a `Y.Map`.
- **Slides** — the deck (slides → objects) in nested `Y.Array`/`Y.Map`.

The native `.fwtr`/`.fwsh`/`.fwsl` files remain the source of truth on disk; the
Yjs layer is the live sync state, persisted locally so a session survives a
restart.

## Connection modes (all optional)

1. **Local network peer** — two instances on the same LAN connect directly, **no
   relay** required.
2. **Self-hosted relay** — a user runs the relay server themselves (full control,
   no third-party trust).
3. **Community relay** — connect to the optional, community-run relay for remote
   sessions when peers aren't on the same network.

No mandatory hosted dependency, ever (root §17: a mandatory hosted relay was
rejected). The relay only ferries CRDT updates between peers; it is not an
authority and need not persist document content.

## Session sharing

A user **generates a session code**, shares it out-of-band, and a peer enters
the code to join (root §17). The code identifies the sync room on the chosen
transport (LAN/self-hosted/community).

## Where it lives

`/packages/collab` (root §17): the Yjs provider(s), the relay server, and the
session-code logic — kept out of the apps so it stays optional and the apps work
unchanged with collaboration disabled.

## Trust & privacy

- Collaboration is **opt-in**; nothing connects without a user action.
- Prefer **local peer / self-hosted** for full data control; the community relay
  is a convenience, not a requirement.
- Consistent with §1: no telemetry without explicit opt-in.

## Implemented core (`@234/collab`)

`/packages/collab` ships the transport-agnostic machinery:

- **`CollabDoc`** (`src/doc.ts`) — wraps a `Y.Doc` + awareness; exposes
  `map`/`array`/`text`/`xml` roots for the per-app mappings above.
- **Session codes** (`src/session.ts`) — `generateSessionCode()` →
  `234-XXXX-XXXX`; `parseSessionCode()` normalises to a room id.
- **Transports** (`src/transport.ts`, `src/transports/*`) — a `CollabTransport`
  interface; `createMemoryNetwork()` (in-process, relays doc + awareness — used
  for deterministic convergence tests); and lazily-loaded
  `createWebsocketTransport` (relay) and `createWebrtcTransport` (LAN peer).
- **Local persistence** (`src/persistence.ts`) — `enableLocalPersistence` via
  `y-indexeddb`, a no-op without IndexedDB (so a session survives restart in the
  webview).
- **Relay** (`relay/server.mjs`) — a minimal `ws` + `y-websocket` relay that
  ferries updates per room, storing nothing. `pnpm --filter @234/collab relay`.

Correctness is proven by an in-memory-network convergence suite (`Y.Map`/
`Y.Array`/`Y.Text`, offline-then-reconnect, awareness, room isolation). Real
cross-peer WebRTC/relay sync is validated manually across instances.

## Follow-up slices (per-app bindings + UI)

- **Sheet — DONE.** `apps/sheet/src/collab/`: `bindSheet(engine, doc)` mirrors
  cells to a `Y.Map` (formulas as raw text, resolved locally; local edits tagged
  with a `LOCAL` origin so the observer applies only remote changes);
  `useSheetCollab` owns the session (start/join/leave, WebRTC by default or a
  relay URL → WebSocket); `CollabPanel` is the docked Start/Join UI. The App
  routes all cell writes through a `commitCell` that uses the binding when a
  session is active. `bindSheet` syncs four maps — `cells`, `names` (named refs,
  coords never A1), `columnTypes`, and `chart` — so a peer resolves named-ref
  formulas and sees the same date/column formatting and chart.
- **Writer — DONE.** `apps/writer/src/collab/`: `writerCollab.ts`
  (`collabEditorPlugins` = `ySyncPlugin`/`yCursorPlugin`/`yUndoPlugin` + shared
  editing keymaps; `seedFragmentFromDoc` for the host) and the shared
  `useCollabSession` hook (from `@234/collab`, exposes the live `CollabDoc`).
  `Editor.tsx` reconfigures the
  view's plugins on enter/leave (solo `prosemirror-history` ⇄ collab y-undo);
  ySyncPlugin binds the doc to a `Y.XmlFragment`. Writer + Sheet share the
  promoted **`CollabPanel`** in `@234/shared`. `y-prosemirror` + `yjs` are pinned
  to match `@234/collab` (single Yjs instance — proven by the fragment-convergence
  test). The **style registry** syncs via `bindStyles` — a `styles`
  `Y.Map<styleId → JSON(Style)>` (definitions) **plus a `styleOrder` `Y.Array`**
  (list order), wired with a `[registry]` push effect + a guarded remote
  `setRegistry` (block `styleId` attrs + images already sync as doc nodes), so a
  peer renders styled blocks correctly **and sees the same StyleEditor order**.
  Cursor-presence UI styling is deferred.
- **Slides — DONE (field-level).** `apps/slides/src/collab/`: `bindDeck(doc,
  onRemoteChange)` maps the deck to nested Yjs — `order` (`Y.Array<slideId>`) +
  `slides` (`Y.Map<slideId → slideMap>`), each `slideMap` holding `notes`, an
  `objectOrder` `Y.Array`, and an `objects` `Y.Map<objectId → Y.Map<field →
  value>>`. Each object is its own `Y.Map` whose keys are the object's scalar
  fields (`x`/`y`/.../`fontSize`/`fill`/`src`), plus an `animations` nested
  `Y.Map<animationId → JSON(Animation)>`, so **concurrent edits to different
  objects — to different fields of the same object — or to different animations
  of the same object — all merge** (proven by offline-edit-then-reconnect tests
  at object, field, and animation granularity). The shared `useCollabSession`
  hook owns the session; the App syncs via a single `[deck]` push effect + a
  guarded remote `setDeck`, so no `setDeck` call site changed.

Writer and Slides share **`useCollabSession`** (`@234/collab`) — one model-free
session hook (start/join/leave, exposes the live `CollabDoc`; WebRTC default,
relay URL → WebSocket). Sheet keeps its own `useSheetCollab` because it also
routes local cell writes through the binding (`setCell`).

**Presence (identity + roster + location).** `usePresence(doc, self?, location?)`
(`@234/collab`) publishes a `{ name, color }` identity on the doc's awareness and
returns the other peers; all three apps feed it into the shared `CollabPanel`,
which shows a collaborator roster (coloured dot + name) while a session is active.
Because the identity lives in the awareness `user` field, Writer's `yCursorPlugin`
renders remote editor carets with each peer's name + colour automatically. A peer
may also publish a **location** (a separate awareness field, keyed so it only
republishes on a real change): **Sheet** passes its selected `{ cell }` and the
`Grid` rings a collaborator's cell with the peer colour + a name tag; **Slides**
passes its active `{ slide }` index and the `SlidePanel` badges that slide with
coloured peer dots. Peer colours are dynamic identity data rendered via inline
`style` (not component-CSS hex). Convergence is proven deterministically (the
in-memory network relays awareness); the live cross-peer visual is manual.

Sheet syncs cells + named refs + column types + chart; Writer syncs the document
(text/marks/images/styleId attrs via `ySyncPlugin`) + the style registry; Slides
syncs the deck at object granularity. **Collaboration breadth is complete.**

- Follow-a-peer / viewport-follow, typing indicators; permissions, conflict-UX
  polish; per-position CRDT merge of concurrent reorders (slide/object/animation
  order + `styleOrder` are last-writer-ish today); serverless LAN (mDNS)
  discovery; deploying the relay.

> **Collaboration is now live in all three apps** (Sheet · Writer · Slides) on the
> shared `@234/collab` core + relay. Real cross-peer sync over WebRTC/relay is the
> remaining manual, multi-instance verification step.

## References

- Root `CLAUDE.md` §3.1 (Yjs CRDTs), §9 (Phase 4 collaboration), §17 (the
  collaboration decision and rejected alternatives).
