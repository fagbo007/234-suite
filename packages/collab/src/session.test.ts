import { describe, expect, it } from 'vitest';
import { generateSessionCode, isSessionCode, parseSessionCode } from './session';

describe('session codes', () => {
  it('generates a formatted code that parses back to an 8-char room id', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^234-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    const room = parseSessionCode(code);
    expect(room).not.toBeNull();
    expect(room).toHaveLength(8);
  });

  it('round-trips: a generated code maps to a stable room id', () => {
    const code = generateSessionCode();
    expect(parseSessionCode(code)).toBe(parseSessionCode(code.toLowerCase()));
  });

  it('normalises casing, spaces, and stray punctuation', () => {
    const code = generateSessionCode();
    const messy = `  ${code.toLowerCase().replace(/-/g, ' ')}  `;
    expect(parseSessionCode(messy)).toBe(parseSessionCode(code));
  });

  it('accepts a bare 8-char body', () => {
    expect(parseSessionCode('K7Q29FMR')).toBe('K7Q29FMR');
  });

  it('rejects malformed codes', () => {
    expect(parseSessionCode('')).toBeNull();
    expect(parseSessionCode('nope')).toBeNull();
    expect(parseSessionCode('234')).toBeNull();
    expect(parseSessionCode('234-OOOO-IIII')).toBeNull(); // ambiguous letters not in alphabet
    expect(isSessionCode('not a code')).toBe(false);
    expect(isSessionCode(generateSessionCode())).toBe(true);
  });
});
