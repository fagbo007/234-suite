/**
 * Binds the Writer style **registry** to a shared `Y.Map<styleId → JSON(Style)>`
 * in the collaboration doc. Block `styleId` attrs and images already sync as
 * ProseMirror nodes via `ySyncPlugin`; this syncs the style *definitions* so a
 * collaborator renders styled blocks with the same properties (not unstyled).
 *
 * Local pushes carry a `LOCAL` origin and we observe the `styles` map (not the
 * whole doc), so remote text edits don't churn the registry. Registry order is
 * the editor-list cosmetic only (a `styleOrder` array is a future refinement).
 */
import { type CollabDoc, Y } from '@234/collab';
import { type Style, type StyleRegistry } from '../editor/styles';

export interface StylesBinding {
  pushStyles(registry: StyleRegistry): void;
  readStyles(): StyleRegistry;
  seed(registry: StyleRegistry): void;
  destroy(): void;
}

export function bindStyles(
  doc: CollabDoc,
  onRemoteStyles: (registry: StyleRegistry) => void,
): StylesBinding {
  const styles = doc.map<string>('styles');
  const LOCAL = Symbol('writer-styles-local');

  function readStyles(): StyleRegistry {
    const list: Style[] = [];
    styles.forEach((json) => list.push(JSON.parse(json) as Style));
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
    }, LOCAL);
  }

  const onStyles = (_event: Y.YMapEvent<string>, txn: Y.Transaction) => {
    if (txn.origin === LOCAL) return;
    onRemoteStyles(readStyles());
  };
  styles.observe(onStyles);

  return {
    pushStyles,
    readStyles,
    seed: pushStyles,
    destroy: () => styles.unobserve(onStyles),
  };
}
