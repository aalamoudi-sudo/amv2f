import { expect, type Page } from '@playwright/test';
import { hasRenderableScenePixels, type RenderablePixelMetrics } from '../../src/test/sceneHealth';

export interface SceneMetrics extends RenderablePixelMetrics {
  cameraValid: boolean;
  sceneReady: boolean;
  cameraSettled: boolean;
  readbackSupported: boolean;
  contextLost: boolean;
}

export async function readSceneMetrics(page: Page): Promise<SceneMetrics> {
  return await page.evaluate<SceneMetrics>(() => {
    const viewport = document.querySelector<HTMLElement>('[data-testid="scene-viewport"]');
    const canvas = viewport?.querySelector<HTMLCanvasElement>('canvas');
    const baseMetrics = {
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
      sampleCount: 0,
      contentRatio: 0,
      whiteRatio: 1,
      uniqueColorCount: 0,
      colorVariance: 0,
      cameraValid: document.documentElement.dataset.mayadeenCameraValid === 'true',
      sceneReady: viewport?.dataset.sceneReady === 'true',
      cameraSettled: viewport?.dataset.cameraSettled === 'true',
      readbackSupported: false,
      contextLost: false
    };

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      return baseMetrics;
    }

    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl || gl.isContextLost()) {
      return {
        ...baseMetrics,
        contextLost: Boolean(gl?.isContextLost())
      };
    }

    const sampleColumns = 48;
    const sampleRows = 27;
    const sampleCount = sampleColumns * sampleRows;
    const pixel = new Uint8Array(4);
    const lumaValues: number[] = [];
    const colors = new Set<string>();
    let readableSamples = 0;
    let contentSamples = 0;
    let whiteSamples = 0;

    gl.finish();
    for (let row = 0; row < sampleRows; row += 1) {
      for (let column = 0; column < sampleColumns; column += 1) {
        const x = Math.min(canvas.width - 1, Math.floor(((column + 0.5) / sampleColumns) * canvas.width));
        const y = Math.min(canvas.height - 1, Math.floor(((row + 0.5) / sampleRows) * canvas.height));

        try {
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          if (gl.getError() !== gl.NO_ERROR) {
            continue;
          }
        } catch {
          continue;
        }

        readableSamples += 1;
        const red = pixel[0] ?? 0;
        const green = pixel[1] ?? 0;
        const blue = pixel[2] ?? 0;
        const backgroundDistance = Math.abs(red - 7) + Math.abs(green - 17) + Math.abs(blue - 15);
        const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

        if (backgroundDistance > 18) {
          contentSamples += 1;
        }
        if (red > 242 && green > 242 && blue > 242) {
          whiteSamples += 1;
        }

        colors.add(`${red},${green},${blue}`);
        lumaValues.push(luma);
      }
    }

    if (readableSamples === 0) {
      return {
        ...baseMetrics,
        sampleCount,
        readbackSupported: false
      };
    }

    const meanLuma = lumaValues.reduce((sum, value) => sum + value, 0) / lumaValues.length;
    const colorVariance =
      lumaValues.reduce((sum, value) => sum + (value - meanLuma) ** 2, 0) / lumaValues.length;

    return {
      ...baseMetrics,
      sampleCount,
      contentRatio: contentSamples / readableSamples,
      whiteRatio: whiteSamples / readableSamples,
      uniqueColorCount: colors.size,
      colorVariance,
      readbackSupported: true
    };
  });
}

export async function waitForSceneVisible(page: Page): Promise<SceneMetrics> {
  const viewport = page.getByTestId('scene-viewport');
  await expect(viewport).toBeVisible();

  // Wait for the renderer and camera contract before reading the WebGL framebuffer.
  // Early readback can observe the initial clear frame and mask a later rendered scene.
  await expect(viewport).toHaveAttribute('data-scene-ready', 'true', { timeout: 20_000 });
  await expect(viewport).toHaveAttribute('data-camera-settled', 'true', { timeout: 20_000 });
  await expect(page.locator('html')).toHaveAttribute('data-mayadeen-camera-valid', 'true', { timeout: 20_000 });

  await expect
    .poll(
      async () => {
        const metrics = await readSceneMetrics(page);
        return (
          metrics.readbackSupported &&
          !metrics.contextLost &&
          hasRenderableScenePixels(metrics)
        );
      },
      { timeout: 20_000, intervals: [100, 250, 500] }
    )
    .toBe(true);

  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });

  return readSceneMetrics(page);
}

export async function readSceneFingerprint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="scene-viewport"] canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    if (!canvas || !gl || canvas.width === 0 || canvas.height === 0 || gl.isContextLost()) {
      return 'scene-unavailable';
    }

    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.finish();
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    if (gl.getError() !== gl.NO_ERROR) {
      return 'scene-readback-error';
    }

    let hash = 2166136261;
    for (const value of pixels) {
      hash ^= value;
      hash = Math.imul(hash, 16777619);
    }

    return `${canvas.width}x${canvas.height}:${hash >>> 0}`;
  });
}

export async function captureSceneScreenshot(page: Page, screenshotPath: string): Promise<Buffer> {
  await waitForSceneVisible(page);
  await page.waitForTimeout(500);
  return page.screenshot({
    path: screenshotPath,
    fullPage: false,
    animations: 'disabled',
    caret: 'hide'
  });
}
