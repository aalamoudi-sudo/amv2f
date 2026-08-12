import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';
import { waitForSceneVisible } from './scene-visibility';

async function resetAndOpenDecisions(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
}

async function openValidation(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('validation-open').click();
  await expect(page.getByTestId('validation-workspace')).toBeVisible();
}

test('decision integrity stays Arabic RTL and uses explicit order-independent relationships with normalized priority', async ({ page }, testInfo) => {
  await resetAndOpenDecisions(page);
  await page.getByTestId('decision-item-DECISION-001').click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('نقاط الأولوية من 100')).toBeVisible();
  const normalizedText = await page.getByTestId('decision-normalized-priority').innerText();
  const normalizedScore = Number(normalizedText.split('/')[0]);
  expect(normalizedScore).toBeGreaterThanOrEqual(0);
  expect(normalizedScore).toBeLessThanOrEqual(100);
  await expect(page.getByText('144', { exact: true })).toHaveCount(0);

  await page.getByTestId('decision-view-2d').click();
  const firstRelation = page.getByTestId('decision-2d-relationship').locator('[data-relation-type]').first();
  await expect(firstRelation).toHaveAttribute('data-relation-type', 'affected');
  await expect(page.getByTestId('decision-related-2d-ZONE-005')).toHaveAttribute('data-relation-type', 'execution-target');
  await expect(page.getByTestId('decision-related-2d-ZONE-005')).toContainText('هدف التنفيذ');
  await expect(page.getByTestId('decision-related-2d-ROUTE-001')).toHaveAttribute('data-relation-type', 'affected');
  await page.getByTestId('decision-related-2d-ZONE-005').click();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('decision-3d-relationships')).toContainText('هدف التنفيذ');
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-005');

  expect(testInfo.project.name).toMatch(/1920x1080|2560x1080/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('lifecycle blocks incomplete approval, verification, and closure and allows a complete ordered path', async ({ page }) => {
  await resetAndOpenDecisions(page);
  await page.getByTestId('decision-item-DECISION-001').click();

  await page.getByTestId('decision-approve').click();
  await expect(page.getByTestId('decision-validation-error')).toContainText('خياراً محدداً');
  await page.getByTestId('decision-selected-option').selectOption('OPTION-001-A');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-approve').click();
  await expect(page.getByTestId('decision-details')).toContainText('معتمد');

  await page.getByTestId('decision-assigned-input').fill('منفذ قرار تجريبي');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-details')).toContainText('مسند');
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-details')).toContainText('قيد التنفيذ');

  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-validation-error')).toContainText('دليل إكمال أو ملاحظة إكمال');
  await page.getByTestId('decision-completion-note').fill('اكتمل الإجراء في تمرين التحقق المحلي.');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-details')).toContainText('مكتمل');

  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-validation-error')).toContainText('أثراً فعلياً مقاساً');
  await page.getByTestId('decision-outcome-select').selectOption('positive');
  await page.getByTestId('decision-actual-impact-input').fill('انخفض زمن تنفيذ الإجراء في حالة التحقق المحلية.');
  await page.getByTestId('decision-verified-by').fill('متحقق تجريبي');
  await page.getByTestId('decision-verified-at').fill('2030-01-01T10:00:00Z');
  await page.getByTestId('decision-verification-evidence').fill('EVIDENCE-UNKNOWN');
  await page.getByTestId('decision-save').click();
  await expect(page.getByTestId('decision-validation-error')).toContainText('غير موجود ضمن أدلة القرار');
  await page.getByTestId('decision-evidence-status').selectOption('verified');
  await page.getByTestId('decision-verification-evidence').fill('DECISION-EVIDENCE-001');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-details')).toContainText('تم التحقق');

  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-validation-error')).toContainText('اسم من أغلق القرار ووقت الإغلاق وسبباً واضحاً');
  await page.getByTestId('decision-closed-by').fill('مسؤول إغلاق تجريبي');
  await page.getByTestId('decision-closed-at').fill('2030-01-01T11:00:00Z');
  await page.getByTestId('decision-closure-reason').fill('اكتمل التحقق المحلي من الأثر.');
  await page.getByTestId('decision-lessons-learned').fill('يجب تثبيت مرجع الدليل قبل الإغلاق.');
  await page.getByTestId('decision-save').click();
  await page.getByTestId('decision-next-lifecycle').click();
  await expect(page.getByTestId('decision-details')).toContainText('مغلق');
  await expect(page.getByTestId('decision-history')).toContainText('مسودة');
  await expect(page.getByTestId('decision-history')).toContainText('مراجعة');
  await expect(page.getByTestId('decision-history')).toContainText('معتمد');
  await expect(page.getByTestId('decision-history')).toContainText('مسند');
  await expect(page.getByTestId('decision-history')).toContainText('قيد التنفيذ');
  await expect(page.getByTestId('decision-history')).toContainText('مكتمل');
  await expect(page.getByTestId('decision-history')).toContainText('تم التحقق');
  await expect(page.getByTestId('decision-history')).toContainText('مغلق');
});

test('CSV and invalid JSON imports remain preview-only and protect baseline state', async ({ page }) => {
  await openValidation(page);
  const workspace = page.getByTestId('validation-workspace');
  const baselineCount = await workspace.getAttribute('data-baseline-decision-count');

  await page.getByTestId('decision-import-file').setInputFiles(path.join(process.cwd(), 'templates/operational-decision-pack.csv'));
  await expect(page.getByTestId('decision-import-preview')).toBeVisible();
  await expect(page.getByTestId('import-error-count')).toHaveText('0');
  await expect(page.getByTestId('decision-import-accept')).toBeEnabled();
  await page.getByTestId('decision-import-accept').click();
  await expect(page.getByTestId('imported-pack-status')).toContainText('5 سجل');
  await expect(workspace).toHaveAttribute('data-baseline-decision-count', baselineCount ?? '');

  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'invalid-pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ decisionId: 'DECISION-BAD', eventId: 'EVENT-UNKNOWN', stateContext: 'scenario' }]))
  });
  await expect(page.getByTestId('decision-import-errors')).toBeVisible();
  await expect(page.getByTestId('decision-import-accept')).toBeDisabled();
  await expect(workspace).toHaveAttribute('data-baseline-decision-count', baselineCount ?? '');
});

test('local operational validation timer records and exports an anonymous result without baseline mutation', async ({ page }, testInfo) => {
  await openValidation(page);
  const workspace = page.getByTestId('validation-workspace');
  const baselineCount = await workspace.getAttribute('data-baseline-decision-count');
  await expect(page.getByTestId('validation-local-label')).toContainText('أداة تحقق محلية');

  await page.getByTestId('validation-mode-hybrid').click();
  await page.getByTestId('validation-timer-start').click();
  await page.waitForTimeout(1_100);
  await expect(page.getByTestId('validation-timer')).not.toHaveText('00:00');
  await page.getByTestId('validation-timer-stop').click();
  await page.getByTestId('validation-selected-decision').fill('DECISION-001');
  await page.getByTestId('validation-owner').fill('قائد التشغيل التجريبي');
  await page.getByTestId('validation-action').fill('استكمال الدليل والسلطة قبل التنفيذ.');
  await page.getByTestId('validation-evidence-gap').check();
  await page.getByTestId('validation-authority-gap').check();
  await page.getByTestId('validation-critical-errors').fill('0');
  await page.getByTestId('validation-save-result').click();
  await expect(page.getByTestId('validation-result-count')).toContainText('1');
  await expect(page.getByTestId('validation-result')).toContainText('أخطاء حرجة 0');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('validation-export-csv').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('decision-validation-results.csv');
  await expect(workspace).toHaveAttribute('data-baseline-decision-count', baselineCount ?? '');
  expect(testInfo.project.name).toMatch(/1920x1080|2560x1080/);
});
