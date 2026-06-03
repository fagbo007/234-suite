import { describe, expect, it } from 'vitest';
import { decodeText, encodeText, unzip, zip } from './zip';

describe('zip', () => {
  it('round-trips files through zip/unzip', () => {
    const archive = zip({
      'a.txt': encodeText('hello'),
      'nested/b.xml': encodeText('<x/>'),
    });
    const out = unzip(archive);
    expect(decodeText(out['a.txt']!)).toBe('hello');
    expect(decodeText(out['nested/b.xml']!)).toBe('<x/>');
  });
});
