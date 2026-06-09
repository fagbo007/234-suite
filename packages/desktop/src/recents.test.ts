import { afterEach, describe, expect, it, vi } from 'vitest';
import { addRecent, baseName, clearRecent, getRecent, subscribeRecent } from './recents';

afterEach(() => {
  clearRecent('w');
  clearRecent('s');
  localStorage.clear();
});

describe('baseName', () => {
  it('returns the last path segment for posix and windows paths', () => {
    expect(baseName('/home/me/doc.fwtr')).toBe('doc.fwtr');
    expect(baseName('C:\\Users\\me\\sheet.fwsh')).toBe('sheet.fwsh');
    expect(baseName('plain.fwsl')).toBe('plain.fwsl');
  });
});

describe('recents store', () => {
  it('adds most-recent-first, dedups by path, and caps at 8', () => {
    addRecent('w', { path: '/a', name: 'a' });
    addRecent('w', { path: '/b', name: 'b' });
    expect(getRecent('w').map((e) => e.name)).toEqual(['b', 'a']);

    // Re-adding an existing path bumps it to the front (no duplicate).
    addRecent('w', { path: '/a', name: 'a' });
    expect(getRecent('w').map((e) => e.name)).toEqual(['a', 'b']);

    for (let i = 0; i < 10; i++) addRecent('w', { path: `/f${i}`, name: `f${i}` });
    expect(getRecent('w')).toHaveLength(8);
    expect(getRecent('w')[0]?.name).toBe('f9'); // newest first
  });

  it('persists to localStorage and isolates per app', () => {
    addRecent('w', { path: '/x', name: 'x' });
    expect(localStorage.getItem('234:recent:w')).toContain('/x');
    expect(getRecent('s')).toEqual([]); // a different app is unaffected
  });

  it('notifies subscribers and clears', () => {
    const listener = vi.fn();
    const off = subscribeRecent(listener);
    addRecent('w', { path: '/y', name: 'y' });
    expect(listener).toHaveBeenCalled();
    clearRecent('w');
    expect(getRecent('w')).toEqual([]);
    off();
  });
});
