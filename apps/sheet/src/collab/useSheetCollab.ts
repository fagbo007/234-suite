/**
 * Session lifecycle for Sheet collaboration. Owns a `CollabDoc` + `bindSheet`
 * binding + a transport, exposing start / join / leave plus the local-edit entry
 * points that mirror to the shared doc when a session is active: `setCell`,
 * `defineName`, `setColumnType`. Collaboration is opt-in; nothing connects until
 * the user starts or joins (root §17 / §6 "always optional").
 *
 * Transport defaults: WebRTC (zero-setup peer); a relay URL switches to the
 * WebSocket transport. `transportFactory` is injectable for tests.
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
import { type Chart } from '../charts/chart';
import { type ColumnSchemaValue } from '../grid/ColumnInspector';
import { bindSheet, type SheetBinding } from './bindSheet';

export type CollabRole = 'idle' | 'host' | 'guest';
export type TransportFactory = (relayUrl?: string) => CollabTransport;

export interface UseSheetCollabOptions {
  /** Current column types (read on host start to seed the shared doc). */
  columnTypes: Record<number, ColumnSchemaValue>;
  /** Apply a remote column-type change to App state. `null` ⇒ cleared. */
  onRemoteColumnType: (col: number, schema: ColumnSchemaValue | null) => void;
  /** Current chart (read on host start to seed the shared doc). */
  chart: Chart | null;
  /** Apply a remote chart change to App state. `null` ⇒ chart removed. */
  onRemoteChart: (chart: Chart | null) => void;
  transportFactory?: TransportFactory;
}

export interface SheetCollab {
  active: boolean;
  role: CollabRole;
  code: string | null;
  /** The live shared doc while in a session (for presence), else null. */
  doc: CollabDoc | null;
  start: () => string;
  join: (code: string, relayUrl?: string) => string | null;
  leave: () => void;
  /** Set a cell — via the shared doc when in a session, else the engine alone. */
  setCell: (row: number, col: number, raw: string) => void;
  /** Define a named reference — mirrored to the shared doc when in a session. */
  defineName: (name: string, row: number, col: number) => void;
  /** Mirror a column-type change to the shared doc (no-op when not in a session). */
  setColumnType: (col: number, schema: ColumnSchemaValue | null) => void;
  /** Mirror a chart change to the shared doc (no-op when not in a session). */
  setChart: (chart: Chart | null) => void;
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
  opts: UseSheetCollabOptions,
): SheetCollab {
  const [role, setRole] = useState<CollabRole>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [doc, setDoc] = useState<CollabDoc | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // Refs keep the callbacks stable while always seeing the latest values.
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const onRemoteRef = useRef(onRemoteChange);
  onRemoteRef.current = onRemoteChange;
  const columnTypesRef = useRef(opts.columnTypes);
  columnTypesRef.current = opts.columnTypes;
  const onColumnTypeRef = useRef(opts.onRemoteColumnType);
  onColumnTypeRef.current = opts.onRemoteColumnType;
  const chartRef = useRef(opts.chart);
  chartRef.current = opts.chart;
  const onChartRef = useRef(opts.onRemoteChart);
  onChartRef.current = opts.onRemoteChart;
  const factoryRef = useRef<TransportFactory>(opts.transportFactory ?? defaultFactory);

  const begin = useCallback(
    (room: string, sessionCode: string, asRole: 'host' | 'guest', relayUrl?: string) => {
      const collabDoc = new CollabDoc();
      const binding = bindSheet(engineRef.current, collabDoc, {
        onRemoteChange: () => onRemoteRef.current(),
        onColumnType: (col, schema) => onColumnTypeRef.current(col, schema),
        onChart: (chart) => onChartRef.current(chart),
      });
      if (asRole === 'host') {
        binding.seed({ columnTypes: columnTypesRef.current, chart: chartRef.current });
      }
      const transport = factoryRef.current(relayUrl);
      transport.connect(collabDoc, room);
      sessionRef.current = { doc: collabDoc, binding, transport };
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
    session.binding.destroy();
    session.doc.destroy();
    sessionRef.current = null;
    setRole('idle');
    setCode(null);
    setDoc(null);
    onRemoteRef.current();
  }, []);

  const setCell = useCallback((row: number, col: number, raw: string) => {
    const session = sessionRef.current;
    if (session) session.binding.setCell(row, col, raw);
    else engineRef.current.setCell(row, col, raw);
  }, []);

  const defineName = useCallback((name: string, row: number, col: number) => {
    const session = sessionRef.current;
    if (session) session.binding.defineName(name, row, col);
    else engineRef.current.defineName(name, row, col);
  }, []);

  const setColumnType = useCallback((col: number, schema: ColumnSchemaValue | null) => {
    sessionRef.current?.binding.setColumnType(col, schema);
  }, []);

  const setChart = useCallback((value: Chart | null) => {
    sessionRef.current?.binding.setChart(value);
  }, []);

  return {
    active: role !== 'idle',
    role,
    code,
    doc,
    start,
    join,
    leave,
    setCell,
    defineName,
    setColumnType,
    setChart,
  };
}
