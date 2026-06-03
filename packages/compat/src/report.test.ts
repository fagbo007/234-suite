import { describe, expect, it } from 'vitest';
import { createImportReport } from './report';

describe('ImportReport', () => {
  it('starts ok and records losses', () => {
    const report = createImportReport();
    expect(report.ok).toBe(true);
    report.lossy('Tables', '1 table flattened to paragraphs');
    expect(report.ok).toBe(false);
    expect(report.losses).toEqual([{ feature: 'Tables', detail: '1 table flattened to paragraphs' }]);
  });
});
