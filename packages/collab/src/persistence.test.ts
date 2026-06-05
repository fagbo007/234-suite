import { describe, expect, it } from 'vitest';
import { CollabDoc } from './doc';
import { enableLocalPersistence } from './persistence';

describe('enableLocalPersistence', () => {
  it('is a no-op (returns null) when IndexedDB is unavailable', async () => {
    // node / jsdom-less test env has no IndexedDB.
    expect(typeof indexedDB).toBe('undefined');
    const handle = await enableLocalPersistence(new CollabDoc(), '234:test');
    expect(handle).toBeNull();
  });
});
