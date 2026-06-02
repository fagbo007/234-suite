import { useEffect, useRef } from 'react';
import { type Slide } from '../model/types';
import styles from './SlideCanvas.module.css';

export interface SlideCanvasProps {
  slide: Slide | undefined;
}

/**
 * Renders the active slide's objects onto a Fabric.js canvas. Fabric needs a 2D
 * context, which jsdom does not provide — initialisation is guarded so the
 * component still mounts under test. Real canvas rendering is validated
 * in-browser once the Tauri window exists.
 */
export function SlideCanvas({ slide }: SlideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !el.getContext('2d')) return; // no 2D context (e.g. jsdom)

    let disposed = false;
    let canvas: import('fabric').Canvas | undefined;

    void (async () => {
      const { Canvas, Textbox, Rect, FabricImage } = await import('fabric');
      if (disposed) return;
      canvas = new Canvas(el, { backgroundColor: 'white' });
      for (const object of slide?.objects ?? []) {
        if (object.kind === 'text') {
          canvas.add(
            new Textbox(object.text, {
              left: object.x,
              top: object.y,
              width: object.width,
              fontSize: object.fontSize,
            }),
          );
        } else if (object.kind === 'rect') {
          canvas.add(
            new Rect({
              left: object.x,
              top: object.y,
              width: object.width,
              height: object.height,
              fill: object.fill,
            }),
          );
        } else {
          const image = await FabricImage.fromURL(object.src);
          if (disposed) return;
          image.set({ left: object.x, top: object.y });
          canvas.add(image);
        }
      }
      canvas.renderAll();
    })();

    return () => {
      disposed = true;
      void canvas?.dispose();
    };
  }, [slide]);

  return (
    <div className={styles.stage}>
      <canvas ref={canvasRef} width={960} height={540} aria-label="Slide canvas" />
    </div>
  );
}
