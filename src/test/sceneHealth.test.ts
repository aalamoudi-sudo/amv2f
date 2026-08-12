import { describe, expect, it } from 'vitest';
import { hasRenderableScenePixels, isValidCameraState, type RenderablePixelMetrics } from './sceneHealth';

const healthyPixels: RenderablePixelMetrics = {
  width: 1920,
  height: 1080,
  sampleCount: 1296,
  contentRatio: 0.42,
  whiteRatio: 0.01,
  uniqueColorCount: 120,
  colorVariance: 280
};

describe('scene health gates', () => {
  it('accepts a finite camera with a usable clipping range', () => {
    expect(
      isValidCameraState({
        position: [23, 20, 23],
        near: 0.1,
        far: 240
      })
    ).toBe(true);
  });

  it('rejects invalid camera coordinates and clipping ranges', () => {
    expect(isValidCameraState({ position: [Number.NaN, 20, 23], near: 0.1, far: 240 })).toBe(false);
    expect(isValidCameraState({ position: [23, 20, 23], near: 0, far: 240 })).toBe(false);
    expect(isValidCameraState({ position: [23, 20, 23], near: 1, far: 1 })).toBe(false);
  });

  it('accepts a varied operational frame', () => {
    expect(hasRenderableScenePixels(healthyPixels)).toBe(true);
  });

  it('rejects blank and mostly-white frames', () => {
    expect(
      hasRenderableScenePixels({
        ...healthyPixels,
        uniqueColorCount: 1,
        colorVariance: 0
      })
    ).toBe(false);
    expect(
      hasRenderableScenePixels({
        ...healthyPixels,
        whiteRatio: 0.9
      })
    ).toBe(false);
  });
});
