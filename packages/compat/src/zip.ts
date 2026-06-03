import { unzipSync, zipSync } from 'fflate';

/**
 * Thin ZIP helpers over fflate (MIT). OOXML files (.docx/.xlsx/.pptx) are ZIP
 * containers of XML parts; these wrap fflate so the format modules deal in a
 * simple `path → bytes` map. Works in the browser and in Node/jsdom tests.
 */

export function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes);
}

export function zip(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeText(text: string): Uint8Array {
  return encoder.encode(text);
}

export function decodeText(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
