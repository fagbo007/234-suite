// MS Office import/export compatibility layer (root CLAUDE.md §7, §16).
//
// Every import completes and logs fidelity losses to a user-visible import
// report — never silently mangles or discards content. Dependency-light + scoped
// (owner decision): fflate for ZIP, browser/jsdom DOMParser for reads. Part 1
// ships `.docx` ↔ Writer; `.xlsx`/`.pptx` follow.
export { importDocx, exportDocx, docxToBlocks, blocksToDocx } from './docx';
export { type DocBlock, type TextRun, blocksToMarkdown, markdownToBlocks } from './blocks';
export { type ImportReport, type FidelityLoss, createImportReport } from './report';
export { unzip, zip, encodeText, decodeText } from './zip';
