import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';
import { waitForSceneVisible } from './scene-visibility';

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(process.cwd(), 'test-results', 'legacy-visual', 'stage3c', projectName);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function captureElement(page: Page, testId: string, filePath: string) {
  const element = page.getByTestId(testId);
  await element.scrollIntoViewIfNeeded();
  await expect(element).toBeVisible();
  await element.screenshot({ path: filePath, animations: 'disabled' });
}

async function reachCompletedDecision(page: Page) {
  await page.getByTestId('decision-selected-option').selectOption('OPTION-001-A');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-approve').click();
  await page.getByTestId('decision-assigned-input').fill('منفذ قرار تجريبي');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await page.getByTestId('decision-completion-note').fill('اكتمل الإجراء في التحقق البصري المحلي.');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
}

test('Stage 3C decision validation visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await page.getByTestId('decision-item-DECISION-001').click();

  await page.screenshot({ path: path.join(directory, '01-decision-center-overview.png'), fullPage: false, animations: 'disabled' });
  await captureElement(page, 'decision-priority-explanation', path.join(directory, '02-normalized-priority.png'));
  await captureElement(page, 'decision-priority-factors', path.join(directory, '03-priority-factor-explanation.png'));
  await page.getByTestId('decision-view-2d').click();
  await captureElement(page, 'decision-2d-relationship', path.join(directory, '04-explicit-2d-relationships.png'));
  await page.getByTestId('decision-related-2d-ZONE-005').click();
  await waitForSceneVisible(page);
  await captureElement(page, 'decision-3d-view', path.join(directory, '05-explicit-3d-relationships.png'));

  await reachCompletedDecision(page);
  await page.getByTestId('decision-next-lifecycle').click();
  await captureElement(page, 'decision-validation-error', path.join(directory, '06-verification-blocked.png'));
  await page.getByTestId('decision-outcome-select').selectOption('positive');
  await page.getByTestId('decision-actual-impact-input').fill('تم قياس أثر محلي إيجابي في حالة العرض.');
  await page.getByTestId('decision-evidence-status').selectOption('verified');
  await page.getByTestId('decision-verified-by').fill('متحقق تجريبي');
  await page.getByTestId('decision-verified-at').fill('2030-01-01T10:00:00Z');
  await page.getByTestId('decision-verification-evidence').fill('DECISION-EVIDENCE-001');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-state-summary')).toContainText('تم التحقق');
  await captureElement(page, 'decision-state-summary', path.join(directory, '07-valid-verified-decision.png'));

  await page.getByTestId('decision-next-lifecycle').click();
  await captureElement(page, 'decision-validation-error', path.join(directory, '08-closure-blocked.png'));
  await page.getByTestId('decision-closed-by').fill('مسؤول إغلاق تجريبي');
  await page.getByTestId('decision-closed-at').fill('2030-01-01T11:00:00Z');
  await page.getByTestId('decision-closure-reason').fill('اكتمل التحقق المحلي من الأثر.');
  await page.getByTestId('decision-lessons-learned').fill('لا يغلق القرار قبل توثيق دليل التحقق.');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-state-summary')).toContainText('مغلق');
  await captureElement(page, 'decision-state-summary', path.join(directory, '09-valid-closed-decision.png'));

  await page.getByTestId('validation-open').click();
  await page.getByTestId('decision-import-file').setInputFiles(path.join(process.cwd(), 'templates/operational-decision-pack.csv'));
  await captureElement(page, 'decision-import-preview', path.join(directory, '10-import-preview.png'));
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'invalid-pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ decisionId: 'DECISION-BAD', stateContext: 'scenario' }]))
  });
  await captureElement(page, 'decision-import-errors', path.join(directory, '11-import-validation-errors.png'));
  await page.getByTestId('decision-import-reset').click();
  await page.getByTestId('decision-import-file').setInputFiles(path.join(process.cwd(), 'templates/operational-decision-pack.json'));
  await page.getByTestId('decision-import-accept').click();
  await page.screenshot({ path: path.join(directory, '12-operational-validation-workspace.png'), fullPage: false, animations: 'disabled' });

  await page.getByTestId('validation-timer-start').click();
  await page.waitForTimeout(1_100);
  await captureElement(page, 'validation-timer-panel', path.join(directory, '13-validation-timer-running.png'));
  await page.getByTestId('validation-timer-stop').click();
  await page.getByTestId('validation-selected-decision').fill('DECISION-001');
  await page.getByTestId('validation-owner').fill('قائد التشغيل التجريبي');
  await page.getByTestId('validation-action').fill('استكمال الدليل قبل التنفيذ.');
  await page.getByTestId('validation-evidence-gap').check();
  await page.getByTestId('validation-authority-gap').check();
  await page.getByTestId('validation-save-result').click();
  await captureElement(page, 'validation-result', path.join(directory, '14-validation-result.png'));
  await page.screenshot({ path: path.join(directory, `15-full-${testInfo.project.name}.png`), fullPage: false, animations: 'disabled' });
});
