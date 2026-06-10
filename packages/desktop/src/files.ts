/**
 * Native file I/O bridge (root CLAUDE.md §3.5). The JS twin of the
 * `app234_files` Rust crate: open/save the suite's own formats through the OS
 * file dialog (`fs_*` Tauri commands) on the desktop, with a graceful browser
 * fallback (`<input type=file>` / `Blob` download) so the web dev build keeps
 * working with the same File menu. Mirrors the `keychain.ts` ↔ `app234_ai` pair.
 */
import { invoke } from '@tauri-apps/api/core';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenResult {
  path: string;
  contents: string;
}

/**
 * Result of the unified Open dialog: native (text) formats land in `text`,
 * Office (binary) formats land in `bytes` — exactly one is set.
 */
export interface OpenDocumentResult {
  path: string;
  text?: string;
  bytes?: Uint8Array;
}

/** True only inside the Tauri desktop shell. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// --- Granular desktop ops (each wraps one `fs_*` command) --------------------

export async function pickOpenPath(filter: FileFilter): Promise<string | null> {
  const path = await invoke<string | null>('fs_pick_open', {
    filterName: filter.name,
    extensions: filter.extensions,
  });
  return path ?? null;
}

export async function pickSavePath(defaultName: string, filter: FileFilter): Promise<string | null> {
  const path = await invoke<string | null>('fs_pick_save', {
    defaultName,
    filterName: filter.name,
    extensions: filter.extensions,
  });
  return path ?? null;
}

export function readTextFile(path: string): Promise<string> {
  return invoke<string>('fs_read_text', { path });
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await invoke('fs_write_text', { path, contents });
}

/** Read a file's raw bytes (binary formats like .docx/.xlsx/.pptx). */
export async function readBinaryFile(path: string): Promise<Uint8Array> {
  const result = await invoke<number[] | ArrayBuffer>('fs_read_bytes', { path });
  return result instanceof ArrayBuffer ? new Uint8Array(result) : Uint8Array.from(result);
}

/** Lower-cased extension of a path (without the dot), or '' if none. */
export function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return '';
  return path.slice(dot + 1).toLowerCase();
}

// --- Convenience (dialog + read/write; browser fallback off-desktop) ---------

/** Pick a file and read it. Returns null if the user cancels. */
export async function openTextFile(opts: { filter: FileFilter }): Promise<OpenResult | null> {
  if (isDesktop()) {
    const path = await pickOpenPath(opts.filter);
    if (!path) return null;
    return { path, contents: await readTextFile(path) };
  }
  return openViaBrowser(opts.filter);
}

/** Pick a destination and write `contents`. Returns the path (or name), or null. */
export async function saveTextFile(opts: {
  defaultName: string;
  contents: string;
  filter: FileFilter;
}): Promise<string | null> {
  if (isDesktop()) {
    const path = await pickSavePath(opts.defaultName, opts.filter);
    if (!path) return null;
    await writeTextFile(path, opts.contents);
    return path;
  }
  return saveViaBrowser(opts.defaultName, opts.contents);
}

/**
 * Unified Open: one dialog accepting both the native format and Office imports.
 * Extensions listed in `binaryExtensions` are read as bytes (for the compat
 * import path); everything else is read as text. Returns null on cancel.
 */
export async function openDocumentFile(opts: {
  filter: FileFilter;
  binaryExtensions?: string[];
}): Promise<OpenDocumentResult | null> {
  const binary = (opts.binaryExtensions ?? []).map((ext) => ext.toLowerCase());
  if (isDesktop()) {
    const path = await pickOpenPath(opts.filter);
    if (!path) return null;
    if (binary.includes(extensionOf(path))) {
      return { path, bytes: await readBinaryFile(path) };
    }
    return { path, text: await readTextFile(path) };
  }
  return openDocumentViaBrowser(opts.filter, binary);
}

// --- Web fallbacks (browser dev build) ---------------------------------------

function openViaBrowser(filter: FileFilter): Promise<OpenResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (filter.extensions.length > 0) {
      input.accept = filter.extensions.map((ext) => `.${ext}`).join(',');
    }
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ path: file.name, contents: typeof reader.result === 'string' ? reader.result : '' });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

function openDocumentViaBrowser(
  filter: FileFilter,
  binaryExtensions: string[],
): Promise<OpenDocumentResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (filter.extensions.length > 0) {
      input.accept = filter.extensions.map((ext) => `.${ext}`).join(',');
    }
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (binaryExtensions.includes(extensionOf(file.name))) {
        void file
          .arrayBuffer()
          .then((buffer) => resolve({ path: file.name, bytes: new Uint8Array(buffer) }))
          .catch(() => resolve(null));
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ path: file.name, text: typeof reader.result === 'string' ? reader.result : '' });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

function saveViaBrowser(defaultName: string, contents: string): string {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultName;
  anchor.click();
  URL.revokeObjectURL(url);
  return defaultName;
}
