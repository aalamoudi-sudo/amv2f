import { enterOperationalCommand, expect, test } from './test-fixtures';
import { waitForSceneVisible } from './scene-visibility';

test('zone readiness workspace supports the local operational validation workflow', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await enterOperationalCommand(page);
  await page.getByTestId('readiness-open').click();
  await expect(page.getByTestId('readiness-workspace')).toBeVisible();
  await expect(page.getByText('بيانات تجريبية مؤقتة').first()).toBeVisible();
  await expect(page.getByTestId('readiness-zone-table')).toBeVisible();
  await expect(page.getByTestId('readiness-intervention-queue')).toBeVisible();
  await expect(page.getByTestId('readiness-trust-panel')).toContainText('عقد غير مكتمل');

  await page.getByTestId('readiness-zone-row-ZONE-005').click();
  await expect(page.getByTestId('readiness-details')).toContainText('ZONE-005');

  await page.getByTestId('readiness-view-plan').click();
  await expect(page.getByTestId('readiness-2d-plan')).toBeVisible();
  await expect(page.getByTestId('readiness-2d-zone-ZONE-005')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('readiness-2d-zone-ZONE-007').click();
  await expect(page.getByTestId('readiness-details')).toContainText('ZONE-007');
  await expect(page.getByTestId('readiness-2d-zone-ZONE-007')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('readiness-view-3d').click();
  await expect(page.getByTestId('readiness-3d-view')).toBeVisible();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-007');

  await page.getByTestId('readiness-view-list').click();
  await page.getByTestId('readiness-zone-row-ZONE-002').click();
  await page.getByTestId('readiness-view-3d').click();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-002');
  await page.getByTestId('readiness-view-list').click();
  await page.getByTestId('readiness-zone-row-ZONE-002').click();
  await page.getByTestId('readiness-approval-select').selectOption('approved');
  await page.getByTestId('readiness-save').click();
  await expect(page.getByTestId('readiness-validation-error')).toContainText('الدليل المنظم');

  await page.getByTestId('readiness-approval-select').selectOption('submitted');
  await page.getByTestId('readiness-evidence-input').fill('قائمة تحقق تجريبية محدثة');
  const futureTargetDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.getByTestId('readiness-target-date').fill(futureTargetDate);
  await page.getByTestId('readiness-change-reason').fill('تحديث اختبار المتصفح');
  await page.getByTestId('readiness-save').click();
  await expect(page.getByTestId('readiness-details')).toContainText('قائمة تحقق تجريبية محدثة');

  await page.getByTestId('readiness-reset-demo-open').click();
  await page.getByRole('button', { name: 'إعادة البيانات', exact: true }).click();
  await expect(page.getByTestId('readiness-details')).toContainText('ZONE-001');
  await expect(page.getByTestId('readiness-details')).toContainText('قائمة تحقق الاستقبال');
});
