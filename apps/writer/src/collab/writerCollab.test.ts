import { CollabDoc, createMemoryNetwork } from '@234/collab';
import { describe, expect, it } from 'vitest';
import { markdownToDoc } from '../editor/fwtr';
import { seedFragmentFromDoc } from './writerCollab';

describe('writerCollab', () => {
  // Also the single-yjs canary: this imports both @234/collab (CollabDoc) and
  // y-prosemirror (prosemirrorToYXmlFragment); if pnpm didn't dedupe yjs, writing
  // a y-prosemirror fragment into a @234/collab doc would not converge.
  it('converges the rich-text fragment between peers via the in-memory network', () => {
    const net = createMemoryNetwork();
    const a = new CollabDoc();
    const b = new CollabDoc();
    net.transport().connect(a, 'doc');
    net.transport().connect(b, 'doc');

    const pmDoc = markdownToDoc('# Title\n\nHello **world** and *italics*.');
    seedFragmentFromDoc(a, pmDoc);

    const aXml = a.xml('prosemirror').toString();
    const bXml = b.xml('prosemirror').toString();
    expect(aXml.length).toBeGreaterThan(0);
    expect(bXml).toBe(aXml);
  });
});
