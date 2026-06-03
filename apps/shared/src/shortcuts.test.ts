import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  matchShortcut,
  OFFICE_SHORTCUTS,
  parseShortcut,
  toProseMirrorKey,
  useShortcuts,
} from './shortcuts';

function keyEvent(partial: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...partial,
  } as KeyboardEvent;
}

describe('parseShortcut', () => {
  it('splits modifiers and the key', () => {
    expect(parseShortcut('Mod+Shift+Z')).toEqual({ mod: true, shift: true, alt: false, key: 'z' });
    expect(parseShortcut('Mod+B')).toEqual({ mod: true, shift: false, alt: false, key: 'b' });
  });
});

describe('matchShortcut', () => {
  it('uses Cmd (meta) for Mod on macOS', () => {
    expect(matchShortcut(keyEvent({ key: 'b', metaKey: true }), OFFICE_SHORTCUTS.bold, true)).toBe(true);
    // Ctrl must NOT trigger a Mod shortcut on macOS.
    expect(matchShortcut(keyEvent({ key: 'b', ctrlKey: true }), OFFICE_SHORTCUTS.bold, true)).toBe(false);
  });

  it('uses Ctrl for Mod off macOS', () => {
    expect(matchShortcut(keyEvent({ key: 'b', ctrlKey: true }), OFFICE_SHORTCUTS.bold, false)).toBe(true);
    expect(matchShortcut(keyEvent({ key: 'b', metaKey: true }), OFFICE_SHORTCUTS.bold, false)).toBe(false);
  });

  it('honours the Shift variant', () => {
    expect(
      matchShortcut(keyEvent({ key: 'z', ctrlKey: true, shiftKey: true }), OFFICE_SHORTCUTS.redoAlt, false),
    ).toBe(true);
    expect(matchShortcut(keyEvent({ key: 'z', ctrlKey: true }), OFFICE_SHORTCUTS.redoAlt, false)).toBe(false);
  });
});

describe('toProseMirrorKey', () => {
  it('converts catalog bindings to ProseMirror syntax', () => {
    expect(toProseMirrorKey(OFFICE_SHORTCUTS.bold)).toBe('Mod-b');
    expect(toProseMirrorKey(OFFICE_SHORTCUTS.redoAlt)).toBe('Mod-Shift-z');
  });
});

describe('useShortcuts', () => {
  it('fires the handler for a matching shortcut and ignores plain typing', () => {
    const onFind = vi.fn();
    renderHook(() => useShortcuts({ [OFFICE_SHORTCUTS.find]: onFind }));

    // Plain "f" must not trigger (so it never hijacks normal keyboard input).
    fireEvent.keyDown(window, { key: 'f' });
    expect(onFind).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(onFind).toHaveBeenCalledTimes(1);
  });
});
