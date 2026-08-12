import { expect, test, openTechnicalWorkspace } from './test-fixtures';
import { readSceneMetrics, waitForSceneVisible } from './scene-visibility';

test('Arabic RTL operational flow works end to end', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('command-open').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('scene-viewport')).toBeVisible();
  await expect(page.getByTestId('system-status')).toContainText('النظام');
  await waitForSceneVisible(page);

  await page.getByTestId('zone-list-item-ZONE-002').click();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('selected-entity-panel')).toContainText('منطقة المعارض');
  await expect(page.getByTestId('selected-entity-panel')).toContainText('ZONE-002');

  await page.getByTestId('status-select').selectOption('highRisk');
  await expect(page.getByTestId('status-select')).toHaveValue('highRisk');
  await waitForSceneVisible(page);

  await page.reload();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('selected-entity-panel')).toContainText('منطقة المعارض');
  await expect(page.getByTestId('status-select')).toHaveValue('highRisk');

  const evacuationRouteToggle = page.getByTestId('route-toggle-ROUTE-002');
  await evacuationRouteToggle.check();
  await expect(evacuationRouteToggle).toBeChecked();

  await page.getByTestId('scenario-start').click();
  await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('scenario-message')).toContainText('بدء رحلة الزائر');
  await expect(page.getByTestId('scenario-progress')).toHaveAttribute('style', /width:\s*25%/);

  await openTechnicalWorkspace(page, 'projection-open');
  await expect(page.getByTestId('projection-mode')).toBeVisible();
  await expect(page.getByTestId('projection-preset')).toBeVisible();
  await page.getByTestId('projection-close').click();
  await waitForSceneVisible(page);
  const metrics = await readSceneMetrics(page);
  expect(metrics.cameraValid).toBe(true);
  expect(metrics.contentRatio).toBeGreaterThan(0.08);

  await page.getByTestId('reset-demo-open').click();
  await page.getByRole('button', { name: 'إعادة البيانات' }).click();
  await page.getByTestId('zone-list-item-ZONE-002').click();
  await expect(page.getByTestId('status-select')).toHaveValue('preparing');
});
