/**
 * Generates a large `.fwtr` document for the 100-page render benchmark
 * (root CLAUDE.md Section 8). A "page" is approximated as one heading plus
 * several paragraphs of body copy.
 */
export function buildHundredPageMarkdown(pages = 100, paragraphsPerPage = 8): string {
  const lines: string[] = ['---', 'title: Benchmark document', 'styles: []', '---', ''];
  for (let page = 1; page <= pages; page++) {
    lines.push(`# Section ${page}`, '');
    for (let p = 1; p <= paragraphsPerPage; p++) {
      lines.push(
        `This is paragraph ${p} of section ${page}. It holds a reasonable amount of ` +
          'body copy to approximate a printed page, including some **bold** and ' +
          '*italic* spans for realism.',
        '',
      );
    }
  }
  return lines.join('\n');
}
