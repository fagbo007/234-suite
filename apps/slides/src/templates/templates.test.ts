import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listTemplateDirs, pngSize, validateMeta, validateTemplate } from './validate';

const TEMPLATES_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../templates');

describe('template validator', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    const buffer = Buffer.alloc(24);
    buffer.write('\x89PNG\r\n\x1a\n', 0, 'latin1');
    buffer.writeUInt32BE(1280, 16);
    buffer.writeUInt32BE(720, 20);
    expect(pngSize(buffer)).toEqual({ width: 1280, height: 720 });
  });

  it('rejects a non-PNG buffer', () => {
    expect(() => pngSize(Buffer.from('not a png'))).toThrow();
  });

  it('flags missing fields and a disallowed licence', () => {
    expect(validateMeta({ name: 'x', author: 'y', tags: [], description: 'z', license: 'MIT' })).toEqual([]);
    const errors = validateMeta({ name: 'x', tags: 'nope', license: 'GPL-3.0' });
    expect(errors).toContain('meta.json missing "author"');
    expect(errors).toContain('meta.json "tags" must be an array');
    expect(errors.some((e) => e.includes('license'))).toBe(true);
  });
});

describe('shipped template library', () => {
  const dirs = listTemplateDirs(TEMPLATES_ROOT);

  it('ships at least 10 templates (Phase 2 requirement)', () => {
    expect(dirs.length).toBeGreaterThanOrEqual(10);
  });

  it.each(dirs)('%s validates clean', (dir) => {
    expect(validateTemplate(dir)).toEqual([]);
  });
});
