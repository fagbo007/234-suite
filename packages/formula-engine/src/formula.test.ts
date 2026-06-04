import { describe, expect, it } from 'vitest';
import { evaluateFormula } from './formula';

// No cell references needed for these — resolver returns null.
const evalNum = (src: string) => evaluateFormula(src, () => null);

describe('comparisons (numeric booleans)', () => {
  it.each([
    ['1<2', 1],
    ['2<1', 0],
    ['3>=3', 1],
    ['3>3', 0],
    ['5=5', 1],
    ['5<>5', 0],
    ['2<>3', 1],
    ['1+1=2', 1],
  ])('%s = %i', (src, expected) => {
    expect(evalNum(src)).toBe(expected);
  });
});

describe('IF (lazy branches)', () => {
  it('selects the then / else branch', () => {
    expect(evalNum('IF(1>0, 10, 20)')).toBe(10);
    expect(evalNum('IF(0, 10, 20)')).toBe(20);
    expect(evalNum('IF(1, 7)')).toBe(7);
    expect(evalNum('IF(0, 7)')).toBe(0); // no else → FALSE
  });

  it('never evaluates the untaken branch', () => {
    // The else branch (1/0) must not raise #DIV/0! when the condition is true.
    expect(evalNum('IF(1, 42, 1/0)')).toBe(42);
    // The taken branch's error still propagates.
    expect(() => evalNum('IF(0, 42, 1/0)')).toThrow('#DIV/0!');
  });

  it('nests', () => {
    expect(evalNum('IF(2>3, 1, IF(4>3, 5, 6))')).toBe(5);
  });
});

describe('logical + math functions', () => {
  it.each([
    ['AND(1, 1)', 1],
    ['AND(1, 0)', 0],
    ['OR(0, 0)', 0],
    ['OR(0, 1)', 1],
    ['NOT(0)', 1],
    ['NOT(5)', 0],
    ['MIN(3, 1, 2)', 1],
    ['MAX(3, 1, 2)', 3],
    ['ABS(0-5)', 5],
    ['INT(3.9)', 3],
    ['SQRT(9)', 3],
    ['POWER(2, 10)', 1024],
    ['MOD(7, 3)', 1],
    ['ROUND(3.14159, 2)', 3.14],
  ])('%s = %i', (src, expected) => {
    expect(evalNum(src)).toBe(expected);
  });

  it('reports errors with Excel codes', () => {
    expect(() => evalNum('MOD(5, 0)')).toThrow('#DIV/0!');
    expect(() => evalNum('SQRT(0-1)')).toThrow('#NUM!');
    expect(() => evalNum('NOPE(1)')).toThrow('#NAME?');
  });
});

describe('text values', () => {
  it('parses string literals (with "" escape) and concatenates with &', () => {
    expect(evalNum('"hello"')).toBe('hello');
    expect(evalNum('"a ""b"" c"')).toBe('a "b" c');
    expect(evalNum('"a" & "b"')).toBe('ab');
    expect(evalNum('"n=" & 5')).toBe('n=5'); // number coerced to text
  });

  it('runs text functions', () => {
    expect(evalNum('CONCAT("a", "b", "c")')).toBe('abc');
    expect(evalNum('CONCATENATE("x", 1)')).toBe('x1');
    expect(evalNum('LEN("hello")')).toBe(5);
    expect(evalNum('UPPER("ab")')).toBe('AB');
    expect(evalNum('LOWER("AB")')).toBe('ab');
    expect(evalNum('TRIM("  a   b ")')).toBe('a b');
    expect(evalNum('LEFT("hello", 2)')).toBe('he');
    expect(evalNum('RIGHT("hello", 3)')).toBe('llo');
  });

  it('compares strings (case-insensitive); mixed types rank number < text', () => {
    expect(evalNum('"apple" < "banana"')).toBe(1);
    expect(evalNum('"ABC" = "abc"')).toBe(1); // case-insensitive equality
    expect(evalNum('"abc" <> "abd"')).toBe(1);
    expect(evalNum('5 < "a"')).toBe(1); // a number ranks below text
  });

  it('coerces numeric strings in arithmetic but errors on real text', () => {
    expect(evalNum('"3" + 4')).toBe(7);
    expect(() => evalNum('"abc" + 1')).toThrow('#VALUE!');
  });
});
