/**
 * Image import + automatic compression (root §2.3: "large files crawl with
 * embedded media"). The dimension maths are pure and tested; the actual
 * raster compression needs a 2D context and is browser-only — in jsdom (no
 * context) compressImage returns the input unchanged so it degrades gracefully.
 */

export const MAX_IMPORT_WIDTH = 1280;
export const DEFAULT_QUALITY = 0.8;

/** Target dimensions that fit within maxWidth, preserving aspect ratio. Never upscales. */
export function scaledDimensions(
  width: number,
  height: number,
  maxWidth: number = MAX_IMPORT_WIDTH,
): { width: number; height: number } {
  if (width <= maxWidth || width <= 0) return { width, height };
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

/**
 * Compress a data-URL image: downscale to maxWidth and re-encode as JPEG at the
 * given quality. Browser-only (needs Image + canvas 2D); returns the original
 * data URL unchanged where no 2D context is available (e.g. jsdom).
 */
export function compressImage(
  dataUrl: string,
  maxWidth: number = MAX_IMPORT_WIDTH,
  quality: number = DEFAULT_QUALITY,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context || typeof Image === 'undefined') {
      resolve(dataUrl); // no 2D context (e.g. jsdom) — degrade gracefully
      return;
    }
    const image = new Image();
    image.onload = () => {
      const size = scaledDimensions(image.width, image.height, maxWidth);
      canvas.width = size.width;
      canvas.height = size.height;
      context.drawImage(image, 0, 0, size.width, size.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

/** Read a File as a data URL (browser FileReader). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
