/**
 * Binds the Writer style **registry** to shared Yjs state in the collaboration
 * doc: a `Y.Map<styleId → JSON(Style)>` for the definitions + a `styleOrder`
 * `Y.Array<styleId>` for the list order. Block `styleId` attrs and images already
 * sync as ProseMirror nodes via `ySyncPlugin`; this syncs the style *definitions*
 * (so a collaborator renders styled blocks with the same properties) **and** the
 * StyleEditor list order, so peers see the same ordering.
 *
 * Local pushes carry a `LOCAL` origin and we observe the `styles` map + `order`
 * array (never the whole doc), so remote text edits don't churn the registry.
 */
import { type CollabDoc, Y } from '@234/collab';
import { type Style, type StyleRegistry } from '../editor/styles';

export interface StylesBinding {
  pushStyles(registry: StyleRegistry): void;
  readStyles(): StyleRegistry;
  seed(registry: StyleRegistry): void;
  destroy(): void;
}

/** Rewrite a Y.Array of ids only when the sequence actually changed (avoids
 *  spurious order conflicts when two peers leave the order untouched). */
function syncOrder(arr: Y.Array<string>, ids: string[]): void {
  const current = arr.toArray();
  const same = current.length === ids.length && current.every((v, i) => v === ids[i]);
  if (!same) {
    arr.delete(0, arr.length);
    arr.insert(0, ids);
  }
}

export function bindStyles(
  doc: CollabDoc,
  onRemoteStyles: (registry: StyleRegistry) => void,
): StylesBinding {
  const styles = doc.map<string>('styles');
  const order = doc.array<string>('styleOrder');
  const LOCAL = Symbol('writer-styles-local');

  function readStyles(): StyleRegistry {
    const list: Style[] = [];
    const seen = new Set<string>();
    for (const id of order.toArray()) {
      const json = styles.get(id);
      if (json) {
        list.push(JSON.parse(json) as Style);
        seen.add(id);
      }
    }
    // Defensive: any definitions without an order entry, in map order.
    styles.forEach((json, id) => {
      if (!seen.has(id)) list.push(JSON.parse(json) as Style);
    });
    return list;
  }

  function pushStyles(registry: StyleRegistry): void {
    doc.doc.transact(() => {
      const ids = registry.map((s) => s.id);
      for (const style of registry) {
        const json = JSON.stringify(style);
        if (styles.get(style.id) !== json) styles.set(style.id, json);
      }
      for (const key of [...styles.keys()]) {
        if (!ids.includes(key)) styles.delete(key);
      }
      syncOrder(order, ids);
    }, LOCAL);
  }

  const onRemote = (_event: unknown, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    onRemoteStyles(readStyles());
  };
  styles.observe(onRemote);
  order.observe(onRemote);

  return {
    pushStyles,
    readStyles,
    seed: pushStyles,
    destroy: () => {
      styles.unobserve(onRemote);
      order.unobserve(onRemote);
    },
  };
}
