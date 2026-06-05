# 234 collaboration relay

A minimal Yjs WebSocket relay for remote sessions (root `CLAUDE.md` §17). It only
**ferries** CRDT updates + awareness between peers in a room — it is **not an
authority** and **stores no document content**. Peers hold the source of truth;
the native `.fwtr`/`.fwsh`/`.fwsl` files on disk stay canonical.

## Run

```bash
pnpm --filter @234/collab relay     # defaults: HOST=0.0.0.0 PORT=1234
HOST=127.0.0.1 PORT=4444 pnpm --filter @234/collab relay
```

Point a client at it with the WebSocket transport:

```ts
import { createWebsocketTransport } from '@234/collab';
const transport = createWebsocketTransport({ url: 'ws://your-host:1234' });
```

## Connection modes (all optional — §17)

- **Local network peer** — `createWebrtcTransport(...)`, no relay needed for the
  data path, but WebRTC needs a small **signaling** channel to introduce peers
  (serverless LAN discovery via mDNS is a future enhancement).
- **Self-hosted relay** — run this server yourself for full control / no
  third-party trust.
- **Community relay** — connect to an optional community-run instance for remote
  sessions when peers aren't on the same network.

No mandatory hosted dependency, ever. Collaboration is opt-in; nothing connects
without a user action (§1: no telemetry without opt-in).
