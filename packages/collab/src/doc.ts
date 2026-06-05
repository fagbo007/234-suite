/**
 * `CollabDoc` — a thin wrapper around a Yjs document + awareness (root §3.1).
 * Each 234 document is backed by a CRDT so concurrent edits merge without a
 * central authority and work offline. The native `.fwtr`/`.fwsh`/`.fwsl` file
 * stays the on-disk source of truth; this is the live sync state.
 *
 * Per-app bindings map their model onto the shared types exposed here:
 *   - Writer → `xml(name)`  (a `Y.XmlFragment`, bound via y-prosemirror)
 *   - Sheet  → `map(name)`  (cells / named refs)
 *   - Slides → `array(name)`/`map(name)` (slides → objects)
 */
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

export class CollabDoc {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;

  constructor(doc: Y.Doc = new Y.Doc()) {
    this.doc = doc;
    this.awareness = new Awareness(this.doc);
  }

  map<T = unknown>(name: string): Y.Map<T> {
    return this.doc.getMap<T>(name);
  }

  array<T = unknown>(name: string): Y.Array<T> {
    return this.doc.getArray<T>(name);
  }

  text(name: string): Y.Text {
    return this.doc.getText(name);
  }

  xml(name: string): Y.XmlFragment {
    return this.doc.getXmlFragment(name);
  }

  /** Full state as a single update (for initial sync). */
  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /** Apply a remote update. `origin` lets a transport ignore its own echoes. */
  applyUpdate(update: Uint8Array, origin?: unknown): void {
    Y.applyUpdate(this.doc, update, origin);
  }

  /** Subscribe to document updates; returns an unsubscribe function. */
  onUpdate(handler: (update: Uint8Array, origin: unknown) => void): () => void {
    this.doc.on('update', handler);
    return () => this.doc.off('update', handler);
  }

  destroy(): void {
    this.awareness.destroy();
    this.doc.destroy();
  }
}
