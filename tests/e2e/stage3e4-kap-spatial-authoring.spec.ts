import { expect, test } from '@playwright/test';

const kapUrl = '/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=spatial-authoring';

test('KAP spatial authoring opens in Arabic RTL with the approved source authority and original provenance', async ({ page }) => {
  await page.goto(kapUrl);
  const workspace = page.getByTestId('kap-spatial-authoring-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-conversion-status', 'conversion-required');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-KAP-OPENING-2026');
  await expect(page.getByTestId('cad-source-authority')).toContainText('founder-approved-cad-source');
  await expect(page.getByTestId('cad-source-authority')).toContainText('operational baseline: none');
  await expect(page.getByTestId('cad-source-authority')).toContainText('AUTH-KAP-DWG-FOUNDER-APPROVED-20260729');
  await expect(page.getByTestId('cad-source-authority')).toContainText('AUTH-KAP-DWG-WORKING-20260721');
  await expect(page.getByTestId('cad-source-identity')).toContainText('SOURCE-KAP-DWG-PROVISIONAL-001');
  await expect(page.getByTestId('cad-source-identity')).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  await expect(workspace).toContainText('تسجيل الالتقاط التاريخي');
  await expect(workspace).toContainText('اعتماد مصدر CAD');
  await expect(workspace).not.toContainText('/Users/mayadeen/');
});

test('conversion-required state keeps spatial authority unknown and all five KAP zones unmapped', async ({ page }) => {
  await page.goto(kapUrl);
  await expect(page.getByTestId('conversion-required-state')).toContainText('DXF export');
  await expect(page.getByTestId('conversion-required-state')).toContainText('DWG + XREF package');
  await expect(page.getByTestId('cad-spatial-authority-status')).toContainText('غير معروف');
  await expect(page.getByTestId('cad-layer-browser')).toContainText('الطبقات غير مقروءة');
  await expect(page.getByTestId('cad-xref-status')).toContainText('XREF غير قابل للفحص');
  await expect(page.getByTestId('cad-zone-mapping-panel').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('cad-zone-mapping-panel')).toContainText('0 / 5 مربوطة');
  await expect(page.getByTestId('cad-zone-mapping-panel')).toContainText('ZONE-ARRIVAL-001');
  await expect(page.getByTestId('cad-zone-mapping-panel')).toContainText('ZONE-DINNER-VIP-001');
  await expect(page.getByTestId('cad-selected-geometry')).toContainText('لا يمكن الفحص قبل التحديد');
  await expect(page.getByTestId('cad-flat-preview')).toContainText('لا توجد معاينة مسطحة بعد');
  await expect(page.getByTestId('cad-freeze-gates')).toContainText('سلطة المسارات');
  await expect(page.getByTestId('cad-freeze-gates')).toContainText('محجوب');
});

test('the review report exports sanitized lineage and the KAP spatial screen links to authoring', async ({ page }) => {
  await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=spatial');
  await page.getByTestId('spatial-authoring-open').click();
  await expect(page).toHaveURL(/workspace=spatial-authoring/);
  await expect(page.getByTestId('kap-spatial-authoring-workspace')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('cad-export-review').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kap-cad-spatial-mapping-review.json');
});

test('switching projects unloads KAP spatial content and blocks cross-project CAD access', async ({ page }) => {
  await page.goto(kapUrl);
  await page.getByTestId('project-switcher-trigger').click();
  await page.getByTestId('project-switcher-search').fill('معرض الآفاق');
  await page.getByTestId('project-switcher-search').press('Enter');
  await expect(page.getByTestId('project-switch-loading')).toBeVisible();
  await expect(page.getByTestId('executive-overview')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXHIBITION-001');
  await expect(page.getByTestId('kap-spatial-authoring-workspace')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');

  await page.goto('/?project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&workspace=spatial-authoring');
  await expect(page.getByTestId('cad-project-isolation-error')).toContainText('مواءمة KAP محجوبة');
  await expect(page.getByTestId('kap-spatial-authoring-workspace')).toHaveCount(0);
});

test('spatial authoring fits the supported command-center viewport without horizontal cropping', async ({ page }) => {
  await page.goto(kapUrl);
  await expect(page.getByTestId('kap-spatial-authoring-workspace')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const switcher = await page.getByTestId('project-switcher-trigger').boundingBox();
  const viewport = page.viewportSize();
  expect(switcher).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(switcher!.x + switcher!.width).toBeLessThanOrEqual(viewport!.width);
});
