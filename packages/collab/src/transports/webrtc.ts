/**
 * WebRTC transport — direct peer-to-peer for local-network / remote sessions
 * (root §17 "local network peer connection"). y-webrtc still needs a small
 * **signaling** channel to exchange connection info; fully serverless LAN
 * discovery (mDNS) is a future enhancement (documented in collab.md). Imported
 * lazily so `@234/collab` stays importable without WebRTC present.
 */
import type { CollabDoc } from '../doc';
import type { CollabTransport, TransportStatus } from '../transport';

export interface WebrtcOptions {
  /** Signaling server URLs (default: y-webrtc's public signaling). */
  signaling?: string[];
  /** Optional room password (encrypts the peer connection). */
  password?: string;
}

export function createWebrtcTransport(options: WebrtcOptions = {}): CollabTransport {
  let status: TransportStatus = 'disconnected';
  let provider: { destroy: () => void } | null = null;

  return {
    get status() {
      return status;
    },
    connect(doc: CollabDoc, room: string) {
      status = 'connecting';
      void import('y-webrtc').then(({ WebrtcProvider }) => {
        provider = new WebrtcProvider(room, doc.doc, {
          signaling: options.signaling,
          password: options.password,
          awareness: doc.awareness,
        });
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
