import { describe, expect, it } from 'vitest';
import { exportDocx, importDocx } from './index';

describe('@234/compat', () => {
  it('exposes a working .docx round-trip', () => {
    const { markdown, report } = importDocx(exportDocx('# Hi\n\nbody'));
    expect(markdown).toBe('# Hi\n\nbody');
    expect(report.ok).toBe(true);
  });
});
