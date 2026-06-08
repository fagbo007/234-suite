/**
 * Collaboration presence (root §17). Each peer publishes an identity (name +
 * colour) on the doc's awareness; `usePresence` returns the *other* peers in the
 * room. The `user` field is exactly what y-prosemirror's `yCursorPlugin` reads,
 * so Writer's remote editor carets get names + colours for free once identity is
 * published. A peer may also publish a **location** (Sheet's selected cell,
 * Slides' active slide) so collaborators see where each teammate is (A5b).
 */
import { useEffect, useRef, useState } from 'react';
import { type CollabDoc } from './doc';

export interface PresenceUser {
  name: string;
  color: string;
}

/** Where a peer is in the document. App-specific, JSON-serialisable. */
export interface PresenceLocation {
  /** Sheet: the selected cell. */
  cell?: { row: number; col: number };
  /** Slides: the active slide index. */
  slide?: number;
}

export interface PresencePeer {
  clientId: number;
  user: PresenceUser;
  location?: PresenceLocation;
}

// Distinct presence colours (identity data, not UI chrome — kept out of CSS).
const COLORS = [
  '#1971c2',
  '#2f9e44',
  '#e8590c',
  '#9c36b5',
  '#c2255c',
  '#0c8599',
  '#e67700',
  '#5f3dc4',
];

/** A friendly anonymous identity: `Guest XXXX` + a colour from the palette. */
export function randomUser(): PresenceUser {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const [b0 = 0, b1 = 0, b2 = 0] = bytes;
  const color = COLORS[b0 % COLORS.length] ?? COLORS[0]!;
  const tag = (((b1 << 8) | b2) + 0x1000).toString(36).toUpperCase().slice(-4);
  return { name: `Guest ${tag}`, color };
}

/**
 * Publish this client's identity (and optionally its location) on the doc's
 * awareness and observe the others. Returns the remote peers (excluding self);
 * `[]` when there is no session.
 */
export function usePresence(
  doc: CollabDoc | null,
  selfUser?: PresenceUser,
  location?: PresenceLocation,
): PresencePeer[] {
  const [self] = useState<PresenceUser>(() => selfUser ?? randomUser());
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  useEffect(() => {
    if (!doc) {
      setPeers([]);
      return;
    }
    const { awareness } = doc;
    awareness.setLocalStateField('user', self);

    const update = () => {
      const localId = awareness.clientID;
      const list: PresencePeer[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === localId) return;
        const { user, location: loc } = state as {
          user?: PresenceUser;
          location?: PresenceLocation;
        };
        if (user) list.push({ clientId, user, location: loc });
      });
      setPeers(list);
    };

    update();
    awareness.on('change', update);
    return () => {
      awareness.off('change', update);
      awareness.setLocalState(null);
      setPeers([]);
    };
  }, [doc, self]);

  // Publish this client's location whenever it changes (keyed on a stable JSON
  // key so it fires only on a real change, not every render). Read the latest
  // via a ref so the dep array stays honest without churn.
  const locationRef = useRef(location);
  locationRef.current = location;
  const locationKey = location ? JSON.stringify(location) : '';
  useEffect(() => {
    if (!doc) return;
    doc.awareness.setLocalStateField('location', locationRef.current ?? null);
  }, [doc, locationKey]);

  return peers;
}
