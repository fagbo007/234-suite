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

describe('dates (serial day-counts since 1970-01-01)', () => {
  it('DATE / YEAR / MONTH / DAY round-trip', () => {
    expect(evalNum('DATE(1970, 1, 1)')).toBe(0);
    const serial = Number(evalNum('DATE(2026, 6, 4)'));
    expect(evalNum(`YEAR(${serial})`)).toBe(2026);
    expect(evalNum(`MONTH(${serial})`)).toBe(6);
    expect(evalNum(`DAY(${serial})`)).toBe(4);
  });

  it('DATEVALUE parses ISO and matches DATE', () => {
    expect(evalNum('DATEVALUE("2026-06-04")')).toBe(evalNum('DATE(2026, 6, 4)'));
    expect(() => evalNum('DATEVALUE("nope")')).toThrow('#VALUE!');
    expect(() => evalNum('DATEVALUE("2026-13-01")')).toThrow('#VALUE!'); // out-of-range month
  });

  it('DATEDIF computes day / month / year differences', () => {
    expect(evalNum('DATEDIF(DATE(2026, 1, 1), DATE(2026, 12, 31), "d")')).toBe(364);
    expect(evalNum('DATEDIF(DATE(2026, 1, 1), DATE(2026, 12, 31), "m")')).toBe(11);
    expect(evalNum('DATEDIF(DATE(2020, 6, 4), DATE(2026, 6, 4), "y")')).toBe(6);
    expect(() => evalNum('DATEDIF(0, 1, "x")')).toThrow('#VALUE!');
  });
});

describe('more text functions', () => {
  it('MID extracts (1-based) and errors on start < 1', () => {
    expect(evalNum('MID("hello", 2, 3)')).toBe('ell');
    expect(evalNum('MID("hello", 4, 10)')).toBe('lo'); // len past the end clamps
    expect(() => evalNum('MID("hello", 0, 2)')).toThrow('#VALUE!');
  });

  it('SUBSTITUTE replaces all or the nth occurrence', () => {
    expect(evalNum('SUBSTITUTE("a-b-c", "-", "+")')).toBe('a+b+c');
    expect(evalNum('SUBSTITUTE("a-b-c", "-", "+", 2)')).toBe('a-b+c');
    expect(evalNum('SUBSTITUTE("abc", "", "x")')).toBe('abc'); // empty old → unchanged
  });

  it('TEXTJOIN joins with a delimiter, optionally skipping empties', () => {
    expect(evalNum('TEXTJOIN("-", 0, "a", "", "b")')).toBe('a--b');
    expect(evalNum('TEXTJOIN("-", 1, "a", "", "b")')).toBe('a-b'); // ignore empty
  });

  it('FIND is 1-based + case-sensitive; #VALUE! when absent', () => {
    expect(evalNum('FIND("l", "hello")')).toBe(3);
    expect(evalNum('FIND("l", "hello", 4)')).toBe(4);
    expect(() => evalNum('FIND("z", "hello")')).toThrow('#VALUE!');
  });
});

describe('more date functions', () => {
  it('WEEKDAY returns the day of week per type', () => {
    // 2026-06-04 is a Thursday.
    const thu = 'DATE(2026, 6, 4)';
    expect(evalNum(`WEEKDAY(${thu})`)).toBe(5); // type 1: Sun=1..Sat=7
    expect(evalNum(`WEEKDAY(${thu}, 2)`)).toBe(4); // type 2: Mon=1..Sun=7
    expect(evalNum(`WEEKDAY(${thu}, 3)`)).toBe(3); // type 3: Mon=0..Sun=6
    expect(() => evalNum(`WEEKDAY(${thu}, 9)`)).toThrow('#NUM!');
  });

  it('EDATE shifts months and clamps the day to the month end', () => {
    expect(evalNum('EDATE(DATE(2026, 1, 15), 1)')).toBe(Number(evalNum('DATE(2026, 2, 15)')));
    // Jan 31 + 1 month → Feb 28 (2026 is not a leap year).
    expect(evalNum('EDATE(DATE(2026, 1, 31), 1)')).toBe(Number(evalNum('DATE(2026, 2, 28)')));
    expect(evalNum('EDATE(DATE(2026, 3, 10), 0-1)')).toBe(Number(evalNum('DATE(2026, 2, 10)')));
  });

  it('EOMONTH returns the last day of the shifted month', () => {
    expect(evalNum('EOMONTH(DATE(2026, 2, 10), 0)')).toBe(Number(evalNum('DATE(2026, 2, 28)')));
    expect(evalNum('EOMONTH(DATE(2024, 2, 1), 0)')).toBe(Number(evalNum('DATE(2024, 2, 29)'))); // leap
    expect(evalNum('EOMONTH(DATE(2026, 1, 15), 1)')).toBe(Number(evalNum('DATE(2026, 2, 28)')));
  });

  it('TODAY / NOW read the injected clock (deterministic)', () => {
    // A fixed instant: 2026-06-04T06:00:00Z.
    const ms = Date.UTC(2026, 5, 4, 6, 0, 0);
    const evalAt = (src: string) => evaluateFormula(src, () => null, undefined, () => ms);
    const day = Number(evalAt('DATE(2026, 6, 4)'));
    expect(evalAt('TODAY()')).toBe(day); // whole-day serial
    expect(evalAt('NOW()')).toBeCloseTo(day + 0.25, 6); // 06:00 = quarter day
    expect(evalAt('YEAR(NOW())')).toBe(2026); // date components floor the fraction
    expect(evalAt('DAY(NOW())')).toBe(4);
  });
});

describe('IFS (multi-branch, lazy)', () => {
  it('returns the first matching value', () => {
    expect(evalNum('IFS(0, 1, 1, 2, 1, 3)')).toBe(2);
    expect(evalNum('IFS(2>3, 10, 5>4, 20)')).toBe(20);
  });

  it('short-circuits — later conditions + values are not evaluated', () => {
    // The matched branch wins before the erroring condition/value are reached.
    expect(evalNum('IFS(1, 42, 1/0, 99)')).toBe(42);
  });

  it('no match → #N/A', () => {
    expect(() => evalNum('IFS(0, 1, 0, 2)')).toThrow('#N/A');
  });
});
