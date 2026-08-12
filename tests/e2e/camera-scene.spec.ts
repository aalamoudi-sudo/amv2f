import { expect, test, openTechnicalWorkspace } from './test-fixtures';
import { readSceneMetrics, waitForSceneVisible } from './scene-visibility';

test.describe('camera and scene health', () => {
  test('renders a non-empty WebGL frame after scene and camera settle', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('command-open').click();

    const metrics = await waitForSceneVisible(page);

    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.height).toBeGreaterThan(0);
    expect(metrics.readbackSupported).toBe(true);
    expect(metrics.cameraValid).toBe(true);
    expect(metrics.sceneReady).toBe(true);
    expect(metrics.cameraSettled).toBe(true);
    expect(metrics.contentRatio).toBeGreaterThan(0.08);
    expect(metrics.whiteRatio).toBeLessThan(0.75);
    expect(metrics.uniqueColorCount).toBeGreaterThanOrEqual(8);
  });

  test('keeps the camera valid and the scene visible across operator, top, and projection views', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('command-open').click();
    await waitForSceneVisible(page);

    for (const viewMode of ['top', 'operator'] as const) {
      const control = page.getByTestId(`view-mode-${viewMode}`);
      await control.click();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      const metrics = await waitForSceneVisible(page);
      expect(metrics.cameraValid).toBe(true);
      expect(metrics.contentRatio).toBeGreaterThan(0.08);
    }

    await openTechnicalWorkspace(page, 'projection-open');
    await expect(page.getByTestId('projection-mode')).toBeVisible();
    const projectionMetrics = await waitForSceneVisible(page);
    expect(projectionMetrics.cameraValid).toBe(true);
    expect(projectionMetrics.cameraSettled).toBe(true);

    const finalMetrics = await readSceneMetrics(page);
    expect(finalMetrics.contentRatio).toBeGreaterThan(0.08);
    expect(finalMetrics.whiteRatio).toBeLessThan(0.75);
  });
});
