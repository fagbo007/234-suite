import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteKey, hasKey, isDesktop, setKey } from './keychain';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

type Win = Record<string, unknown>;
function setDesktop(on: boolean) {
  if (on) (window as unknown as Win).__TAURI_INTERNALS__ = {};
  else delete (window as unknown as Win).__TAURI_INTERNALS__;
}

describe('keychain bridge', () => {
  beforeEach(() => invoke.mockReset());
  afterEach(() => setDesktop(false));

  describe('web build (no Tauri)', () => {
    it('reports no key, refuses to save, and no-ops delete — never calling invoke', async () => {
      setDesktop(false);
      expect(isDesktop()).toBe(false);
      await expect(hasKey('claude')).resolves.toBe(false);
      await expect(setKey('claude', 'sk-x')).rejects.toThrow(/desktop app/i);
      await expect(deleteKey('claude')).resolves.toBeUndefined();
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe('desktop build', () => {
    beforeEach(() => setDesktop(true));

    it('checks presence via ai_has_key (never returns the key itself)', async () => {
      invoke.mockResolvedValueOnce(true);
      await expect(hasKey('openai')).resolves.toBe(true);
      expect(invoke).toHaveBeenCalledWith('ai_has_key', { provider: 'openai' });
    });

    it('stores via ai_set_key', async () => {
      invoke.mockResolvedValueOnce(undefined);
      await setKey('claude', 'sk-123');
      expect(invoke).toHaveBeenCalledWith('ai_set_key', { provider: 'claude', key: 'sk-123' });
    });

    it('removes via ai_delete_key', async () => {
      invoke.mockResolvedValueOnce(undefined);
      await deleteKey('claude');
      expect(invoke).toHaveBeenCalledWith('ai_delete_key', { provider: 'claude' });
    });
  });
});
