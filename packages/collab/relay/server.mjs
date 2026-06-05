// 234 collaboration relay (root §17). A minimal Yjs WebSocket relay: it only
// ferries CRDT updates + awareness between peers in a room. It is NOT an
// authority and does NOT persist document content — peers hold the source of
// truth, and the native files on disk are canonical.
//
// Run:  pnpm --filter @234/collab relay      (HOST/PORT via env)
// Self-host this, or connect to a community relay; both are optional (§17).
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 1234);

const wss = new WebSocketServer({ host, port });
wss.on('connection', (conn, req) => setupWSConnection(conn, req));

wss.on('listening', () => {
  console.log(`234 collab relay listening on ws://${host}:${port}`);
});

const shutdown = () => {
  wss.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
