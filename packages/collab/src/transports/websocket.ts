/**
 * WebSocket transport — connects to a relay (self-hosted or the optional
 * community relay; root §17). The relay only ferries updates between peers.
 * `y-websocket` is imported lazily so merely importing `@234/collab` never pulls
 * a WebSocket implementation (keeps node/test environments clean).
 */
import type { CollabDoc } from '../doc';
import type { CollabTransport, TransportStatus } from '../transport';

export interface WebsocketOptions {
  /** Relay base URL, e.g. `wss://relay.example.org` or `ws://localhost:1234`. */
  url: string;
}

export function createWebsocketTransport({ url }: WebsocketOptions): CollabTransport {
  let status: TransportStatus = 'disconnected';
  let provider: { destroy: () => void } | null = null;

  return {
    get status() {
      return status;
    },
    connect(doc: CollabDoc, room: string) {
      status = 'connecting';
      void import('y-websocket').then(({ WebsocketProvider }) => {
        provider = new WebsocketProvider(url, room, doc.doc, { awareness: doc.awareness });
        status = 'connected';
      });
    },
    disconnect() {
      provider?.destroy();
      provider = null;
      status = 'disconnected';
    },
  };
}
