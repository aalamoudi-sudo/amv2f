import { enterOperationalCommand, expect, test } from './test-fixtures';
import { waitForSceneVisible } from './scene-visibility';

test('universal decision center supports a local decision lifecycle', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await expect(page.getByText('بيانات تجريبية مؤقتة').first()).toBeVisible();
  await expect(page.getByTestId('decision-summary')).toBeVisible();
  await expect(page.getByTestId('decision-open-queue')).toBeVisible();
  await expect(page.getByTestId('decision-priority-board')).toBeVisible();
  await expect(page.getByTestId('decision-trust-panel')).toBeVisible();

  await page.getByTestId('decision-item-DECISION-001').click();
  await expect(page.getByTestId('decision-details')).toContainText('تثبيت جاهزية المنطقة');

  await page.getByTestId('decision-view-2d').click();
  await expect(page.getByTestId('decision-2d-relationship')).toBeVisible();
  await page.getByTestId('decision-related-2d-ZONE-005').click();
  await expect(page.getByTestId('decision-3d-view')).toBeVisible();
  await waitForSceneVisible(page);
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-005');

  await page.getByTestId('decision-view-list').click();
  await page.getByTestId('decision-create-open').click();
  await page.getByTestId('decision-create-title').fill('قرار اختبار قابل لإعادة الاستخدام');
  await page.getByTestId('decision-create-description').fill('وصف قرار عام مستقل عن نوع الحدث.');
  await page.getByTestId('decision-create-type').selectOption('resource-allocation');
  await page.getByTestId('decision-create-owner').fill('مالك القرار التجريبي');
  await page.getByTestId('decision-create-responsible').fill('منفذ القرار التجريبي');
  await page.getByTestId('decision-create-submit').click();
  await expect(page.getByTestId('decision-details')).toContainText('قرار اختبار قابل لإعادة الاستخدام');

  await page.getByTestId('decision-status-select').selectOption('review');
  await page.getByTestId('decision-evidence-input').fill('دليل قرار محلي موثق');
  await page.getByTestId('decision-selected-option').selectOption('OPTION-DRAFT');
  await page.getByTestId('decision-save').click();
  await expect(page.getByTestId('decision-details')).toContainText('دليل قرار محلي موثق');
  await page.getByTestId('decision-approve').click();
  await expect(page.getByTestId('decision-details')).toContainText('معتمد');

  await expect(page.getByTestId('decision-details')).toContainText('معتمد');
  await expect(page.getByTestId('decision-history')).toContainText('مراجعة');
});
