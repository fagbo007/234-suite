import { describe, expect, it } from 'vitest';
import { NamedReferenceRegistry } from './namedRefs';

describe('NamedReferenceRegistry', () => {
  it('registers and resolves names', () => {
    const registry = new NamedReferenceRegistry();
    registry.register('revenue', { sheet: 0, row: 4, col: 2 });
    expect(registry.resolve('revenue')).toEqual({ sheet: 0, row: 4, col: 2 });
    expect(registry.getName({ sheet: 0, row: 4, col: 2 })).toBe('revenue');
  });

  it('keeps references stable when rows are inserted above them', () => {
    const registry = new NamedReferenceRegistry();
    registry.register('total', { sheet: 0, row: 10, col: 0 });
    registry.onInsertRows(0, 5, 2);
    expect(registry.resolve('total')).toEqual({ sheet: 0, row: 12, col: 0 });
  });

  it('does not shift references above the insertion point', () => {
    const registry = new NamedReferenceRegistry();
    registry.register('header', { sheet: 0, row: 0, col: 0 });
    registry.onInsertRows(0, 5, 3);
    expect(registry.resolve('header')).toEqual({ sheet: 0, row: 0, col: 0 });
  });

  it('shifts on column insertion', () => {
    const registry = new NamedReferenceRegistry();
    registry.register('q2', { sheet: 0, row: 0, col: 3 });
    registry.onInsertColumns(0, 1, 1);
    expect(registry.resolve('q2')).toEqual({ sheet: 0, row: 0, col: 4 });
  });
});
