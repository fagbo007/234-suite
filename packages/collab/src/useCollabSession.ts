/**
 * Shared React session hook for collaboration (root §17). Owns a `CollabDoc` +
 * transport + role and exposes the live doc; the app binds the doc to its model
 * (y-prosemirror for Writer, `bindDeck` for Slides). Model-free — apps that need
 * to route local edits (e.g. Sheet's `setCell`) wrap their own binding on top.
 * Opt-in / off by default; nothing connects until start/join.
 *
 * Default transport: WebRTC peer; a relay URL switches to WebSocket.
 * `transportFactory` is injectable so tests drive it with an in-memory network.
 */
import { useCallback, useRef, useState } from 'react';
import { CollabDoc } from './doc';
import { generateSessionCode, parseSessionCode } from './session';
import { type CollabTransport } from './transport';
import { createWebrtcTransport } from './transports/webrtc';
import { createWebsocketTransport } from './transports/websocket';

export type CollabRole = 'idle' | 'host' | 'guest';
export type TransportFactory = (relayUrl?: string) => CollabTransport;

export interface CollabSession {
  active: boolean;
  role: CollabRole;
  code: string | null;
  doc: CollabDoc | null;
  /** Start hosting a new session; returns the shareable code. */
  start: () => string;
  /** Join an existing session by code; returns an error message or `null`. */
  join: (code: string, relayUrl?: string) => string | null;
  leave: () => void;
}

const defaultFactory: TransportFactory = (relayUrl) =>
  relayUrl ? createWebsocketTransport({ url: relayUrl }) : createWebrtcTransport();

export function useCollabSession(
  opts: { transportFactory?: TransportFactory } = {},
): CollabSession {
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
