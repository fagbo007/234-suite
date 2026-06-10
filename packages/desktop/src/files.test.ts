import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  extensionOf,
  isDesktop,
  openDocumentFile,
  openTextFile,
  readBinaryFile,
  saveTextFile,
  writeTextFile,
} from './files';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

type Win = Record<string, unknown>;
const setDesktop = (on: boolean) => {
  if (on) (window as unknown as Win).__TAURI_INTERNALS__ = {};
  else delete (window as unknown as Win).__TAURI_INTERNALS__;
};

afterEach(() => {
  invoke.mockReset();
  setDesktop(false);
});

const filter = { name: '234 Writer', extensions: ['fwtr'] };

describe('isDesktop', () => {
  it('is false without the Tauri internals flag, true with it', () => {
    expect(isDesktop()).toBe(false);
    setDesktop(true);
    expect(isDesktop()).toBe(true);
  });
});

describe('openTextFile (desktop)', () => {
  it('picks a path then reads it', async () => {
    setDesktop(true);
    invoke.mockImplementation((cmd: string) => {
      if (cmd === 'fs_pick_open') return Promise.resolve('C:/docs/a.fwtr');
      if (cmd === 'fs_read_text') return Promise.resolve('file body');
      return Promise.resolve(null);
    });
    const result = await openTextFile({ filter });
    expect(result).toEqual({ path: 'C:/docs/a.fwtr', contents: 'file body' });
    expect(invoke).toHaveBeenCalledWith('fs_pick_open', {
      filterName: '234 Writer',
      extensions: ['fwtr'],
    });
    expect(invoke).toHaveBeenCalledWith('fs_read_text', { path: 'C:/docs/a.fwtr' });
  });

  it('returns null and does not read when the dialog is cancelled', async () => {
    setDesktop(true);
    invoke.mockResolvedValue(null); // fs_pick_open → null
    expect(await openTextFile({ filter })).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1); // no read
  });
});

describe('saveTextFile (desktop)', () => {
  it('picks a path then writes the contents', async () => {
    setDesktop(true);
    invoke.mockImplementation((cmd: string) => {
      if (cmd === 'fs_pick_save') return Promise.resolve('C:/docs/out.fwtr');
      return Promise.resolve(undefined);
    });
    const path = await saveTextFile({ defaultName: 'document.fwtr', contents: 'hi', filter });
    expect(path).toBe('C:/docs/out.fwtr');
    expect(invoke).toHaveBeenCalledWith('fs_pick_save', {
      defaultName: 'document.fwtr',
      filterName: '234 Writer',
      extensions: ['fwtr'],
    });
    expect(invoke).toHaveBeenCalledWith('fs_write_text', { path: 'C:/docs/out.fwtr', contents: 'hi' });
  });

  it('returns null and does not write when cancelled', async () => {
    setDesktop(true);
    invoke.mockResolvedValue(null); // fs_pick_save → null
    expect(await saveTextFile({ defaultName: 'x.fwtr', contents: 'hi', filter })).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1); // no write
  });
});

describe('writeTextFile (desktop)', () => {
  it('invokes fs_write_text with the path + contents (used for the Sheet sidecar)', async () => {
    setDesktop(true);
    invoke.mockResolvedValue(undefined);
    await writeTextFile('C:/docs/out.fwsh.meta', '{}');
    expect(invoke).toHaveBeenCalledWith('fs_write_text', {
      path: 'C:/docs/out.fwsh.meta',
      contents: '{}',
    });
  });
});

describe('extensionOf', () => {
  it('lower-cases and handles missing extensions', () => {
    expect(extensionOf('C:/docs/Report.DOCX')).toBe('docx');
    expect(extensionOf('a.fwtr')).toBe('fwtr');
    expect(extensionOf('no-extension')).toBe('');
  });
});

describe('readBinaryFile (desktop)', () => {
  it('invokes fs_read_bytes and returns a Uint8Array', async () => {
    setDesktop(true);
    invoke.mockResolvedValue([80, 75, 3, 4]);
    const bytes = await readBinaryFile('C:/docs/a.docx');
    expect(bytes).toEqual(Uint8Array.from([80, 75, 3, 4]));
    expect(invoke).toHaveBeenCalledWith('fs_read_bytes', { path: 'C:/docs/a.docx' });
  });
});

describe('openDocumentFile (desktop)', () => {
  const unified = { name: '234 Writer', extensions: ['fwtr', 'docx'] };

  it('reads a native pick as text', async () => {
    setDesktop(true);
    invoke.mockImplementation((cmd: string) => {
      if (cmd === 'fs_pick_open') return Promise.resolve('C:/docs/a.fwtr');
      if (cmd === 'fs_read_text') return Promise.resolve('file body');
      return Promise.resolve(null);
    });
    const result = await openDocumentFile({ filter: unified, binaryExtensions: ['docx'] });
    expect(result).toEqual({ path: 'C:/docs/a.fwtr', text: 'file body' });
  });

  it('reads an Office pick as bytes', async () => {
    setDesktop(true);
    invoke.mockImplementation((cmd: string) => {
      if (cmd === 'fs_pick_open') return Promise.resolve('C:/docs/Report.DOCX');
      if (cmd === 'fs_read_bytes') return Promise.resolve([80, 75]);
      return Promise.resolve(null);
    });
    const result = await openDocumentFile({ filter: unified, binaryExtensions: ['docx'] });
    expect(result?.path).toBe('C:/docs/Report.DOCX');
    expect(result?.bytes).toEqual(Uint8Array.from([80, 75]));
    expect(result?.text).toBeUndefined();
  });

  it('returns null when the dialog is cancelled', async () => {
    setDesktop(true);
    invoke.mockResolvedValue(null);
    expect(await openDocumentFile({ filter: unified, binaryExtensions: ['docx'] })).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1); // no read
  });
});

describe('web fallback (no Tauri)', () => {
  it('saveTextFile downloads via a Blob and never calls invoke', async () => {
    const createUrl = vi.fn(() => 'blob:mock');
    const revokeUrl = vi.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createUrl;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeUrl;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const name = await saveTextFile({ defaultName: 'deck.fwsl', contents: '{}', filter });
    expect(name).toBe('deck.fwsl');
    expect(invoke).not.toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
