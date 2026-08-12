import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test('Stage 3E.2 authors and freezes a governed fictional pilot without crossing project context', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  await page.getByTestId('pilot-open-technical-fixture').click();
  const workspace = page.getByTestId('pilot-authoring-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('pilot-source-classification')).toContainText('النموذج الحالي: خيالي');
  await expect(page.getByTestId('pilot-template-list')).toContainText('event.json');
  await expect(page.getByTestId('pilot-template-list')).toContainText('sources-register.csv');

  await page.getByTestId('pilot-load-incomplete').click();
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-validation-issues')).toContainText('يجب استكمال الحقل');
  await expect(page.getByTestId('pilot-compile')).toBeDisabled();

  await page.getByTestId('pilot-load-fictional').click();
  await page.getByTestId('pilot-inject-id-conflict').click();
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-id-issues')).toContainText('مكرر');

  await page.getByTestId('pilot-correct-draft').click();
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-validation-issues')).toContainText('لا توجد مشاكل');
  await page.getByTestId('pilot-compile').click();
  await expect(page.getByTestId('pilot-package-preview')).toContainText('EVENT-PACKAGE-v1-');
  const firstHash = await page.getByTestId('pilot-package-preview').locator('strong').filter({ hasText: 'EVENT-PACKAGE-v1-' }).innerText();

  await page.getByTestId('pilot-freeze').click();
  await expect(page.getByTestId('pilot-frozen-artifact')).toHaveAttribute('data-immutable', 'true');
  await expect(page.getByTestId('pilot-inject-id-conflict')).toBeDisabled();
  await expect(page.getByTestId('pilot-frozen-immutable')).toContainText(firstHash);

  await page.getByTestId('pilot-new-revision').click();
  await page.getByTestId('pilot-validate').click();
  await page.getByTestId('pilot-compile').click();
  await page.getByTestId('pilot-freeze').click();
  await expect(page.getByTestId('pilot-revision-list').locator('div')).toHaveCount(2);

  await page.getByTestId('pilot-activate').click();
  await expect(page.getByTestId('pilot-activation-status')).toContainText('لم يُفعّل أثر تأليف بعد');
  await expect(page.getByTestId('pilot-authoring-metrics')).toContainText('فشل');

  await page.getByTestId('readiness-open').click();
  await page.getByTestId('readiness-view-plan').click();
  await expect(page.getByTestId('readiness-2d-zone-ZONE-PLT-001')).toHaveCount(0);
  await expect(page.getByTestId('readiness-2d-zone-ZONE-001')).toBeVisible();
  await expect(page.getByTestId('readiness-2d-plan')).toHaveAttribute('data-spatial-bounds', /\d/);

  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
  await expect(page.getByTestId('scene-viewport')).not.toHaveAttribute('data-spatial-center', '64.75,40');
  await expect(page.getByTestId('scene-spatial-extent')).toContainText('m');

  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  const packageDownload = page.waitForEvent('download');
  await page.getByTestId('pilot-export-package').click();
  expect((await packageDownload).suggestedFilename()).toBe('frozen-pilot-event-package.json');
  const reportDownload = page.waitForEvent('download');
  await page.getByTestId('pilot-export-report').click();
  expect((await reportDownload).suggestedFilename()).toBe('pilot-authoring-validation-report.json');

  await page.getByTestId('pilot-reset-draft').click();
  await expect(page.getByTestId('pilot-revision-list').locator('div')).toHaveCount(2);
  await expect(page.getByTestId('pilot-missing-data')).toContainText('سجل المدخلات المفقودة من أحمد');

  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toContain('accessToken');
  expect(visibleText).not.toContain('Bearer ');
  expect(visibleText).not.toContain('password=');
});
