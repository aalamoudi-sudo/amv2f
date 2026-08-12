export interface CameraStateLike {
  position: readonly number[];
  near: number;
  far: number;
}

export interface RenderablePixelMetrics {
  width: number;
  height: number;
  sampleCount: number;
  contentRatio: number;
  whiteRatio: number;
  uniqueColorCount: number;
  colorVariance: number;
}

export const sceneVisibilityThresholds = {
  minimumContentRatio: 0.08,
  maximumWhiteRatio: 0.75,
  minimumUniqueColorCount: 8,
  minimumColorVariance: 4
} as const;

export function isValidCameraState(camera: CameraStateLike): boolean {
  return (
    camera.position.length === 3 &&
    camera.position.every(Number.isFinite) &&
    Number.isFinite(camera.near) &&
    Number.isFinite(camera.far) &&
    camera.near > 0 &&
    camera.far > camera.near
  );
}

export function hasRenderableScenePixels(metrics: RenderablePixelMetrics): boolean {
  return (
    metrics.width > 0 &&
    metrics.height > 0 &&
    metrics.sampleCount > 0 &&
    metrics.contentRatio > sceneVisibilityThresholds.minimumContentRatio &&
    metrics.whiteRatio < sceneVisibilityThresholds.maximumWhiteRatio &&
    metrics.uniqueColorCount >= sceneVisibilityThresholds.minimumUniqueColorCount &&
    metrics.colorVariance > sceneVisibilityThresholds.minimumColorVariance
  );
}
