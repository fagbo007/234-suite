import { DetailedCellError, HyperFormula } from 'hyperformula';

export interface UsedRange {
  rows: number;
  cols: number;
}

export type CellValue = string | number | boolean | null;

/**
 * Thin wrapper around HyperFormula for evaluation. HyperFormula uses A1
 * internally — that A1 model is the evaluation boundary and stays hidden behind
 * this wrapper and the translation layer (root CLAUDE.md Section 3.4).
 *
 * NOTE: HyperFormula is GPLv3. See docs/architecture/formula-refs.md Section 6.
 */
export class SheetEngine {
  private readonly hf: HyperFormula;
  private readonly sheetId: number;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    const name = this.hf.addSheet('Sheet1');
    this.sheetId = this.hf.getSheetId(name) ?? 0;
  }

  setCell(row: number, col: number, raw: string): void {
    this.hf.setCellContents({ sheet: this.sheetId, row, col }, raw === '' ? null : raw);
  }

  getValue(row: number, col: number): CellValue {
    const value = this.hf.getCellValue({ sheet: this.sheetId, row, col });
    if (value instanceof DetailedCellError) return value.value;
    return value;
  }

  getRaw(row: number, col: number): string {
    const raw = this.hf.getCellSerialized({ sheet: this.sheetId, row, col });
    return raw === null || raw === undefined ? '' : String(raw);
  }

  usedRange(): UsedRange {
    const dimensions = this.hf.getSheetDimensions(this.sheetId);
    return { rows: dimensions.height, cols: dimensions.width };
  }

  destroy(): void {
    this.hf.destroy();
  }
}
