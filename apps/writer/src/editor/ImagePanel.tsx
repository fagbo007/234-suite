import { Button, Input } from '@234/shared';
import { type EditorView } from 'prosemirror-view';
import { type SelectedImage, setImageAnchor } from './commands';
import { type ImageAnchor } from './schema';
import styles from './ImagePanel.module.css';

export interface ImagePanelProps {
  view: EditorView;
  image: SelectedImage;
}

const ANCHORS: { value: ImageAnchor; label: string }[] = [
  { value: 'left', label: 'Align left' },
  { value: 'center', label: 'Align center' },
  { value: 'right', label: 'Align right' },
];

/**
 * Anchor picker for the selected image (root §2.1: explicit anchor, no
 * float-on-drag). Anchor is a node attr rendered inline by the schema.
 */
export function ImagePanel({ view, image }: ImagePanelProps) {
  const current = image.node.attrs.anchor as ImageAnchor;
  const alt = (image.node.attrs.alt as string | undefined) ?? '';

  return (
    <section className={styles.panel} aria-label="Image">
      <span className={styles.heading}>Image</span>
      <div className={styles.anchors} role="group" aria-label="Image anchor">
        {ANCHORS.map((anchor) => (
          <Button
            key={anchor.value}
            size="small"
            variant={anchor.value === current ? 'primary' : 'secondary'}
            aria-pressed={anchor.value === current}
            onClick={() => setImageAnchor(view, anchor.value)}
          >
            {anchor.label}
          </Button>
        ))}
      </div>
      <Input
        aria-label="Alt text"
        placeholder="Alt text"
        value={alt}
        onChange={(event) =>
          view.dispatch(
            view.state.tr.setNodeMarkup(image.pos, undefined, {
              ...image.node.attrs,
              alt: event.target.value,
            }),
          )
        }
      />
    </section>
  );
}
