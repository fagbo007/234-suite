/**
 * Optional local persistence so a collaboration session survives an app restart
 * (root §17 / collab.md). Backed by `y-indexeddb` in the Tauri webview; a no-op
 * where IndexedDB is unavailable (node / tests), imported lazily.
 */
import type { CollabDoc } from './doc';

export interface LocalPersistence {
  destroy(): void;
}

/**
 * Persist a doc to IndexedDB under `name`. Returns `null` (no-op) when IndexedDB
 * is absent, so callers can use it unconditionally.
 */
export async function enableLocalPersistence(
  doc: CollabDoc,
  name: string,
): Promise<LocalPersistence | null> {
  if (typeof indexedDB === 'undefined') return null;
  const { IndexeddbPersistence } = await import('y-indexeddb');
  const provider = new IndexeddbPersistence(name, doc.doc);
  return { destroy: () => void provider.destroy() };
}
