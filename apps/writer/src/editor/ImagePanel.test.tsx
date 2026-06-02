import { render, screen } from '@testing-library/react';
import { type EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';
import { ImagePanel } from './ImagePanel';
import { imageNode } from './schema';

describe('ImagePanel', () => {
  it('renders the anchor picker with the current anchor pressed', () => {
    const node = imageNode.create({ src: 'x', anchor: 'center', alt: '' });
    render(<ImagePanel view={{} as EditorView} image={{ node, pos: 0 }} />);

    expect(screen.getByRole('button', { name: 'Align center' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Align left' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.getByLabelText('Alt text')).toBeTruthy();
  });
});
