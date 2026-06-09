/**
 * Recent files (root §3.5 follow-up). A per-app, `localStorage`-backed list of
 * recently opened/saved documents, most-recent first, capped + deduped by path.
 * Mirrors the registry pattern (cached snapshot + subscribe) so it is
 * `useSyncExternalStore`-friendly. Apps record entries only on the desktop (where
 * a path is a real, re-readable handle); the web dev build keeps an empty list.
 */
export interface RecentFile {
  path: string;
  name: string;
}

const MAX = 8;
const listeners = new Set<() => void>();

function keyFor(app: string): string {
  return `234:recent:${app}`;
}

function read(app: string): RecentFile[] {
  try {
    const raw = globalThis.localStorage?.getItem(keyFor(app));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentFile =>
        !!e && typeof (e as RecentFile).path === 'string' && typeof (e as RecentFile).name === 'string',
    );
  } catch {
    return [];
  }
}

// Cached snapshots per app so useSyncExternalStore sees a stable reference.
const snapshots = new Map<string, RecentFile[]>();

function refresh(app: string): void {
  snapshots.set(app, read(app));
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** The last path/last-segment of a file path (handles `/` and `\`). */
export function baseName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

/** Record (or bump) a recently opened/saved file for an app. */
export function addRecent(app: string, file: RecentFile): void {
  const next = [file, ...read(app).filter((e) => e.path !== file.path)].slice(0, MAX);
  try {
    globalThis.localStorage?.setItem(keyFor(app), JSON.stringify(next));
  } catch {
    /* storage unavailable — non-fatal */
  }
  snapshots.set(app, next);
  emit();
}

/** The recent files for an app (stable snapshot — for useSyncExternalStore). */
export function getRecent(app: string): RecentFile[] {
  let snap = snapshots.get(app);
  if (!snap) {
    refresh(app);
    snap = snapshots.get(app)!;
  }
  return snap;
}

export function clearRecent(app: string): void {
  try {
    globalThis.localStorage?.removeItem(keyFor(app));
  } catch {
    /* non-fatal */
  }
  snapshots.set(app, []);
  emit();
}

export function subscribeRecent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
