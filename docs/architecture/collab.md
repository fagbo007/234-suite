# Real-time collaboration — design sketch

> **Status: design sketch (Phase 4 prep).** This records the *intended* design,
> grounded in the locked decisions in root `CLAUDE.md` (§3.1 Yjs, §9 Phase 4,
> §17 collaboration entry). The implementation lands in **Phase 4** with the
> Tauri window and a remote — see "Out of scope". No runtime code ships here.

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

## Out of scope (→ Phase 4 proper)

- Implementing `/packages/collab` (Yjs bindings per app, the relay server,
  session codes) — needs the Tauri window + a remote.
- Presence/cursors, permissions, and conflict-UX polish.

## References

- Root `CLAUDE.md` §3.1 (Yjs CRDTs), §9 (Phase 4 collaboration), §17 (the
  collaboration decision and rejected alternatives).
