// @234/collab — optional, offline-first real-time collaboration (root §3.1, §9,
// §17). The transport-agnostic Yjs core: documents, session codes, awareness,
// transports (in-memory for tests; lazy WebSocket/WebRTC for real sessions), and
// local persistence. Per-app document bindings (Writer/Sheet/Slides) build on
// this — see docs/architecture/collab.md.
//
// Re-exported for binding authors who need the Yjs shared types directly.
export * as Y from 'yjs';

export { CollabDoc } from './doc';
export { generateSessionCode, parseSessionCode, isSessionCode } from './session';
export {
  type CollabTransport,
  type TransportStatus,
  type MemoryNetwork,
  createMemoryNetwork,
} from './transport';
export { createWebsocketTransport, type WebsocketOptions } from './transports/websocket';
export { createWebrtcTransport, type WebrtcOptions } from './transports/webrtc';
export { enableLocalPersistence, type LocalPersistence } from './persistence';
export {
  useCollabSession,
  type CollabSession,
  type CollabRole,
  type TransportFactory,
} from './useCollabSession';
export { usePresence, randomUser, type PresenceUser, type PresencePeer } from './presence';
