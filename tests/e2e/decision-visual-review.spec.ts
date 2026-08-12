import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';
import { captureSceneScreenshot, waitForSceneVisible } from './scene-visibility';

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(process.cwd(), 'test-results', 'legacy-visual', 'decision-center', projectName);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function captureElement(page: Page, testId: string, filePath: string) {
  const element = page.getByTestId(testId);
  await element.scrollIntoViewIfNeeded();
  await expect(element).toBeVisible();
  await element.screenshot({ path: filePath, animations: 'disabled' });
}

test('decision engine visual review', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();

  await page.screenshot({ path: path.join(directory, '01-decision-center-overview.png'), fullPage: false, animations: 'disabled' });
  await captureElement(page, 'decision-open-queue', path.join(directory, '02-critical-decisions-queue.png'));
  await captureElement(page, 'decision-priority-board', path.join(directory, '03-priority-board.png'));
  await page.getByTestId('decision-item-DECISION-001').click();
  await captureElement(page, 'decision-details', path.join(directory, '04-decision-details.png'));
  await captureElement(page, 'decision-trust-panel', path.join(directory, '05-evidence-confidence.png'));

  await page.getByTestId('decision-view-2d').click();
  await captureElement(page, 'decision-2d-relationship', path.join(directory, '06-2d-relationship.png'));
  await page.getByTestId('decision-related-2d-ZONE-005').click();
  await waitForSceneVisible(page);
  await captureSceneScreenshot(page, path.join(directory, '07-decision-linked-3d.png'));

  await page.getByTestId('decision-view-list').click();
  await page.getByTestId('decision-item-DECISION-003').click();
  await captureElement(page, 'decision-trust-panel', path.join(directory, '08-low-confidence.png'));
  await page.getByTestId('decision-create-open').click();
  await captureElement(page, 'decision-create-form', path.join(directory, '09-create-demo-decision.png'));
  await page.getByTestId('decision-create-title').fill('قرار بصري تجريبي');
  await page.getByTestId('decision-create-description').fill('قرار عام للمراجعة.');
  await page.getByTestId('decision-create-owner').fill('مالك تجريبي');
  await page.getByTestId('decision-create-responsible').fill('مسؤول تجريبي');
  await page.getByTestId('decision-create-submit').click();
  await page.getByTestId('decision-evidence-input').fill('دليل اعتماد تجريبي');
  await page.getByTestId('decision-status-select').selectOption('review');
  await page.getByTestId('decision-selected-option').selectOption('OPTION-DRAFT');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-approve').click();
  await captureElement(page, 'decision-details', path.join(directory, '10-approved-state.png'));
  await captureElement(page, 'decision-lifecycle-actions', path.join(directory, '11-lifecycle-state.png'));
  await page.screenshot({ path: path.join(directory, `12-ultrawide-${testInfo.project.name}.png`), fullPage: false, animations: 'disabled' });
});
