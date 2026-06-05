/**
 * Session lifecycle for Slides collaboration. Owns a `CollabDoc` + transport +
 * role and exposes the live doc; `App` binds it to the deck via `bindDeck`.
 * Opt-in / off by default (root §17). Default WebRTC peer; a relay URL switches
 * to WebSocket. `transportFactory` is injectable for tests.
 *
 * (Near-identical to Writer's `useWriterCollab`; a future refactor may unify them
 * into one shared hook.)
 */
import {
  CollabDoc,
  type CollabTransport,
  createWebrtcTransport,
  createWebsocketTransport,
  generateSessionCode,
  parseSessionCode,
} from '@234/collab';
import { useCallback, useRef, useState } from 'react';

export type CollabRole = 'idle' | 'host' | 'guest';
export type TransportFactory = (relayUrl?: string) => CollabTransport;

export interface SlidesCollab {
  active: boolean;
  role: CollabRole;
  code: string | null;
  doc: CollabDoc | null;
  start: () => string;
  join: (code: string, relayUrl?: string) => string | null;
  leave: () => void;
}

const defaultFactory: TransportFactory = (relayUrl) =>
  relayUrl ? createWebsocketTransport({ url: relayUrl }) : createWebrtcTransport();

export function useSlidesCollab(opts: { transportFactory?: TransportFactory } = {}): SlidesCollab {
  const [role, setRole] = useState<CollabRole>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [doc, setDoc] = useState<CollabDoc | null>(null);
  const sessionRef = useRef<{ doc: CollabDoc; transport: CollabTransport } | null>(null);
  const factoryRef = useRef<TransportFactory>(opts.transportFactory ?? defaultFactory);

  const begin = useCallback(
    (room: string, sessionCode: string, asRole: 'host' | 'guest', relayUrl?: string) => {
      const collabDoc = new CollabDoc();
      const transport = factoryRef.current(relayUrl);
      transport.connect(collabDoc, room);
      sessionRef.current = { doc: collabDoc, transport };
      setRole(asRole);
      setCode(sessionCode);
      setDoc(collabDoc);
    },
    [],
  );

  const start = useCallback((): string => {
    if (sessionRef.current) return code ?? '';
    const newCode = generateSessionCode();
    begin(parseSessionCode(newCode) as string, newCode, 'host');
    return newCode;
  }, [begin, code]);

  const join = useCallback(
    (input: string, relayUrl?: string): string | null => {
      if (sessionRef.current) return null;
      const room = parseSessionCode(input);
      if (!room) return 'Enter a valid session code.';
      begin(room, input.trim().toUpperCase(), 'guest', relayUrl);
      return null;
    },
    [begin],
  );

  const leave = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.transport.disconnect();
    session.doc.destroy();
    sessionRef.current = null;
    setRole('idle');
    setCode(null);
    setDoc(null);
  }, []);

  return { active: role !== 'idle', role, code, doc, start, join, leave };
}
