/**
 * Slide-template validator (root §10, apps/slides/CLAUDE.md §4). Pure, Node
 * built-ins only, so it runs in CI on every PR touching /apps/slides/templates.
 * Each template must: parse as `.fwsl`, pass the auto-layout engine (no
 * violations), ship a 1280×720 preview.png, and carry a complete meta.json with
 * an MIT/CC0 licence.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { constraintCheck } from '../model/constraints';
import { parseFwsl } from '../model/fwsl';

export const PREVIEW_WIDTH = 1280;
export const PREVIEW_HEIGHT = 720;
export const REQUIRED_META = ['name', 'author', 'tags', 'description', 'license'] as const;
export const ALLOWED_LICENSES = ['MIT', 'CC0'] as const;

/** Read a PNG's pixel dimensions from its IHDR chunk. */
export function pngSize(buffer: Buffer): { width: number; height: number } {
  const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n';
  if (buffer.length < 24 || buffer.toString('latin1', 0, 8) !== PNG_SIGNATURE) {
    throw new Error('Not a PNG file');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Validate a parsed meta.json object; returns error messages (empty ⇒ valid). */
export function validateMeta(meta: unknown): string[] {
  const errors: string[] = [];
  if (typeof meta !== 'object' || meta === null) return ['meta.json is not an object'];
  const record = meta as Record<string, unknown>;
  for (const field of REQUIRED_META) {
    if (!(field in record)) errors.push(`meta.json missing "${field}"`);
  }
  if ('tags' in record && !Array.isArray(record.tags)) errors.push('meta.json "tags" must be an array');
  if ('license' in record && !ALLOWED_LICENSES.includes(record.license as (typeof ALLOWED_LICENSES)[number])) {
    errors.push(`meta.json "license" must be one of ${ALLOWED_LICENSES.join(', ')}`);
  }
  return errors;
}

/** Validate one template directory; returns error messages (empty ⇒ valid). */
export function validateTemplate(dir: string): string[] {
  const errors: string[] = [];

  // template.fwsl — parses and passes the auto-layout engine.
  const fwslPath = join(dir, 'template.fwsl');
  if (!existsSync(fwslPath)) {
    errors.push('missing template.fwsl');
  } else {
    try {
      const deck = parseFwsl(readFileSync(fwslPath, 'utf8'));
      deck.slides.forEach((slide, index) => {
        if (!constraintCheck(slide.objects)) errors.push(`constraint violation on slide ${index + 1}`);
      });
    } catch (error) {
      errors.push(`template.fwsl does not parse: ${(error as Error).message}`);
    }
  }

  // preview.png — exactly 1280×720.
  const pngPath = join(dir, 'preview.png');
  if (!existsSync(pngPath)) {
    errors.push('missing preview.png');
  } else {
    try {
      const { width, height } = pngSize(readFileSync(pngPath));
      if (width !== PREVIEW_WIDTH || height !== PREVIEW_HEIGHT) {
        errors.push(`preview.png must be ${PREVIEW_WIDTH}×${PREVIEW_HEIGHT}, got ${width}×${height}`);
      }
    } catch (error) {
      errors.push(`preview.png invalid: ${(error as Error).message}`);
    }
  }

  // meta.json — complete + MIT/CC0.
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) {
    errors.push('missing meta.json');
  } else {
    try {
      errors.push(...validateMeta(JSON.parse(readFileSync(metaPath, 'utf8'))));
    } catch (error) {
      errors.push(`meta.json does not parse: ${(error as Error).message}`);
    }
  }

  return errors;
}

/** List the template subdirectories under a templates root. */
export function listTemplateDirs(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isDirectory());
}
