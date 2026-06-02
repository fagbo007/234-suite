// @234/formula-engine — in-house MIT evaluator + named-reference translation layer.
// See docs/architecture/formula-refs.md.

export {
  type CellCoord,
  colToLabel,
  labelToCol,
  cellToA1,
  a1ToCell,
  isA1Reference,
  findA1References,
} from './a1';
export { NamedReferenceRegistry } from './namedRefs';
export { lintFormula, A1_WARNING, type LintWarning } from './lint';
export { findExternalReferences } from './links';
export {
  SheetEngine,
  type UsedRange,
  type CellValue,
  type NamedCell,
  type ExternalLink,
} from './engine';
