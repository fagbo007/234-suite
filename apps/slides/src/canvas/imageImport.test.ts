import { describe, expect, it } from 'vitest';
import { scaledDimensions } from './imageImport';

describe('scaledDimensions', () => {
  it('leaves images at or below the max width untouched', () => {
    expect(scaledDimensions(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(scaledDimensions(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
  });

  it('downscales wider images, preserving aspect ratio', () => {
    expect(scaledDimensions(2560, 1440, 1280)).toEqual({ width: 1280, height: 720 });
    expect(scaledDimensions(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
  });

  it('never upscales and tolerates degenerate sizes', () => {
    expect(scaledDimensions(0, 0, 1280)).toEqual({ width: 0, height: 0 });
  });
});
