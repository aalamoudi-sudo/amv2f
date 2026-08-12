import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';
import { captureSceneScreenshot, waitForSceneVisible } from './scene-visibility';

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(process.cwd(), 'test-results', 'legacy-visual', 'readiness', projectName);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function captureElement(page: Page, testId: string, filePath: string) {
  const element = page.getByTestId(testId);
  await element.scrollIntoViewIfNeeded();
  await expect(element).toBeVisible();
  await element.screenshot({ path: filePath, animations: 'disabled' });
}

test('readiness operational pack visual review', async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const reviewDirectory = reviewDirectoryFor(testInfo.project.name);

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('readiness-open').click();
  await expect(page.getByTestId('readiness-workspace')).toBeVisible();

  await page.screenshot({ path: path.join(reviewDirectory, '15-readiness-viewport.png'), fullPage: false, animations: 'disabled' });
  await captureElement(page, 'readiness-intervention-queue', path.join(reviewDirectory, '16-intervention-queue.png'));
  await captureElement(page, 'readiness-trust-panel', path.join(reviewDirectory, '17-data-trust-panel.png'));

  await page.getByTestId('readiness-zone-row-ZONE-005').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '18-selected-zone-details.png'));
  await captureElement(page, 'readiness-decision-summary', path.join(reviewDirectory, '19-readiness-decision-summary.png'));

  await page.getByTestId('readiness-view-plan').click();
  await captureElement(page, 'readiness-2d-plan', path.join(reviewDirectory, '20-2d-plan.png'));

  await page.getByTestId('readiness-view-3d').click();
  await waitForSceneVisible(page);
  await captureSceneScreenshot(page, path.join(reviewDirectory, '21-3d-view.png'));

  await page.getByTestId('readiness-view-list').click();
  await page.getByTestId('readiness-zone-row-ZONE-002').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '22-zone-missing-evidence.png'));

  await page.getByTestId('readiness-zone-row-ZONE-004').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '23-zone-low-confidence.png'));

  await page.getByTestId('readiness-zone-row-ZONE-005').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '24-zone-opening-impact.png'));
  await page.getByTestId('readiness-zone-row-ZONE-002').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '25-zone-visitor-route-impact.png'));

  await page.getByTestId('readiness-approval-select').selectOption('approved');
  await page.getByTestId('readiness-save').click();
  await captureElement(page, 'readiness-validation-error', path.join(reviewDirectory, '26-validation-error.png'));

  await page.getByTestId('readiness-approval-select').selectOption('submitted');
  await page.getByTestId('readiness-evidence-input').fill('دليل تحقق محلي للمراجعة');
  await page.getByTestId('readiness-required-action').fill('استكمال تحقق الحالة قبل المراجعة.');
  await page.getByTestId('readiness-change-reason').fill('تحديث بصري محلي');
  await page.getByTestId('readiness-save').click();
  await captureElement(page, 'readiness-details', path.join(reviewDirectory, '27-local-readiness-edit.png'));

  await page.getByTestId('readiness-reset-demo-open').click();
  await page.getByRole('button', { name: 'إعادة البيانات', exact: true }).click();
  await expect(page.getByTestId('readiness-details')).toContainText('ZONE-001');
  await page.screenshot({ path: path.join(reviewDirectory, `28-layout-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`), fullPage: false, animations: 'disabled' });
});
