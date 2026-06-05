/**
 * Session lifecycle for Sheet collaboration. Owns a `CollabDoc` + `bindSheet`
 * binding + a transport, exposing start / join / leave and a `setCell` that
 * routes through the binding when a session is active (else straight to the
 * engine). Collaboration is opt-in; nothing connects until the user starts or
 * joins (root §17 / §6 "always optional").
 *
 * Transport defaults: WebRTC (zero-setup peer); a relay URL switches to the
 * WebSocket transport. `transportFactory` is injectable so tests drive it with
 * an in-memory network (no real network).
 */
import {
  CollabDoc,
  type CollabTransport,
  createWebrtcTransport,
  createWebsocketTransport,
  generateSessionCode,
  parseSessionCode,
} from '@234/collab';
import { type SheetEngine } from '@234/formula-engine';
import { useCallback, useRef, useState } from 'react';
import { bindSheet, type SheetBinding } from './bindSheet';

export type CollabRole = 'idle' | 'host' | 'guest';
export type TransportFactory = (relayUrl?: string) => CollabTransport;

export interface SheetCollab {
  active: boolean;
  role: CollabRole;
  code: string | null;
  /** Start hosting a new session; returns the shareable code. */
  start: () => string;
  /** Join an existing session by code; returns an error message or `null`. */
  join: (code: string, relayUrl?: string) => string | null;
  leave: () => void;
  /** Set a cell — via the shared doc when in a session, else the engine alone. */
  setCell: (row: number, col: number, raw: string) => void;
}

interface Session {
  doc: CollabDoc;
  binding: SheetBinding;
  transport: CollabTransport;
}

const defaultFactory: TransportFactory = (relayUrl) =>
  relayUrl ? createWebsocketTransport({ url: relayUrl }) : createWebrtcTransport();

export function useSheetCollab(
  engine: SheetEngine,
  onRemoteChange: () => void,
  opts: { transportFactory?: TransportFactory } = {},
): SheetCollab {
  const [role, setRole] = useState<CollabRole>('idle');
  const [code, setCode] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // Refs keep the callbacks stable while always seeing the latest values.
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const onRemoteRef = useRef(onRemoteChange);
  onRemoteRef.current = onRemoteChange;
  const factoryRef = useRef<TransportFactory>(opts.transportFactory ?? defaultFactory);

  const begin = useCallback(
    (room: string, sessionCode: string, asRole: 'host' | 'guest', relayUrl?: string) => {
      const doc = new CollabDoc();
      const binding = bindSheet(engineRef.current, doc, () => onRemoteRef.current());
      if (asRole === 'host') binding.seedFromEngine();
      const transport = factoryRef.current(relayUrl);
      transport.connect(doc, room);
      sessionRef.current = { doc, binding, transport };
      setRole(asRole);
      setCode(sessionCode);
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
    session.binding.destroy();
    session.doc.destroy();
    sessionRef.current = null;
    setRole('idle');
    setCode(null);
    onRemoteRef.current();
  }, []);

  const setCell = useCallback((row: number, col: number, raw: string) => {
    const session = sessionRef.current;
    if (session) session.binding.setCell(row, col, raw);
    else engineRef.current.setCell(row, col, raw);
  }, []);

  return { active: role !== 'idle', role, code, start, join, leave, setCell };
}
