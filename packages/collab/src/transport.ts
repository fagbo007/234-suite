/**
 * Transport abstraction (root §17 connection modes). A transport ferries CRDT
 * updates + awareness between peers in a named room; it is never an authority.
 *
 * `createMemoryNetwork()` is an in-process implementation used for tests and
 * same-process demos — it deterministically relays updates between connected
 * `CollabDoc`s, so convergence can be asserted without any real network. Real
 * transports (`createWebsocketTransport`, `createWebrtcTransport`) live in
 * `./transports` and are loaded lazily.
 */
import { applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { CollabDoc } from './doc';

export type TransportStatus = 'disconnected' | 'connecting' | 'connected';

export interface CollabTransport {
  connect(doc: CollabDoc, room: string): void;
  disconnect(): void;
  readonly status: TransportStatus;
}

interface Conn {
  doc: CollabDoc;
  receiveDoc(update: Uint8Array): void;
  receiveAwareness(update: Uint8Array): void;
  teardown(): void;
}

export interface MemoryNetwork {
  /** A fresh transport for one peer. Connect it to a room to join that peer. */
  transport(): CollabTransport;
}

/** In-process loopback network — relays doc + awareness updates per room. */
export function createMemoryNetwork(): MemoryNetwork {
  const rooms = new Map<string, Set<Conn>>();

  return {
    transport(): CollabTransport {
      let status: TransportStatus = 'disconnected';
      let conn: Conn | null = null;
      let room: string | null = null;

      return {
        get status() {
          return status;
        },

        connect(doc: CollabDoc, roomName: string) {
          if (conn) return;
          room = roomName;
          const peers = rooms.get(roomName) ?? new Set<Conn>();
          rooms.set(roomName, peers);
          const docOrigin = Symbol('memory-network');

          const onDocUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin === docOrigin) return; // ignore our own applied updates
            for (const peer of peers) if (peer !== conn) peer.receiveDoc(update);
          };
          const onAwarenessUpdate = (
            changes: { added: number[]; updated: number[]; removed: number[] },
            origin: unknown,
          ) => {
            if (origin === thisConn) return; // ignore our own applied awareness
            const clients = [...changes.added, ...changes.updated, ...changes.removed];
            const update = encodeAwarenessUpdate(doc.awareness, clients);
            for (const peer of peers) if (peer !== conn) peer.receiveAwareness(update);
          };

          doc.doc.on('update', onDocUpdate);
          doc.awareness.on('update', onAwarenessUpdate);

          const thisConn: Conn = {
            doc,
            receiveDoc: (update) => doc.applyUpdate(update, docOrigin),
            receiveAwareness: (update) => applyAwarenessUpdate(doc.awareness, update, thisConn),
            teardown: () => {
              doc.doc.off('update', onDocUpdate);
              doc.awareness.off('update', onAwarenessUpdate);
            },
          };
          conn = thisConn;

          // Initial two-way sync with every peer already in the room.
          for (const peer of peers) {
            peer.receiveDoc(doc.encodeState());
            thisConn.receiveDoc(peer.doc.encodeState());

            const peerClients = [...peer.doc.awareness.getStates().keys()];
            if (peerClients.length) {
              thisConn.receiveAwareness(encodeAwarenessUpdate(peer.doc.awareness, peerClients));
            }
            const myClients = [...doc.awareness.getStates().keys()];
            if (myClients.length) {
              peer.receiveAwareness(encodeAwarenessUpdate(doc.awareness, myClients));
            }
          }

          peers.add(thisConn);
          status = 'connected';
        },

        disconnect() {
          if (conn && room !== null) {
            conn.teardown();
            rooms.get(room)?.delete(conn);
          }
          conn = null;
          room = null;
          status = 'disconnected';
        },
      };
    },
  };
}
