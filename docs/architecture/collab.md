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

- **Sheet** — `Y.Map` cells ↔ `SheetEngine`; "Start/Join session" + code panel.
- **Writer** — `y-prosemirror` ↔ the editor `Y.XmlFragment`.
- **Slides** — `Y.Array`/`Y.Map` ↔ the deck model.
- Presence cursors, permissions, conflict-UX polish; serverless LAN (mDNS)
  discovery; deploying the relay as a service.

## References

- Root `CLAUDE.md` §3.1 (Yjs CRDTs), §9 (Phase 4 collaboration), §17 (the
  collaboration decision and rejected alternatives).
