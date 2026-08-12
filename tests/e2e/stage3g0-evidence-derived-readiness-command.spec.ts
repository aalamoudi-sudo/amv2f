import { expect, test, type Page } from '@playwright/test';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const readinessUrl = `/?workspace=readiness&project=${projectId}&event=${eventId}&venue=${venueId}`;

function monitorPage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function expectKapReadiness(page: Page) {
  const workspace = page.getByTestId('readiness-command-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-readiness-posture', 'unassessed');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.locator('main[data-event-id]')).toHaveAttribute('data-event-id', eventId);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

test('loads KAP readiness as evidence-derived unassessed truth with approved sources and a dominant blocker', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(readinessUrl);
  await expectKapReadiness(page);

  await expect(page.getByTestId('readiness-executive-posture')).toContainText('غير مُقيّم');
  await expect(page.getByTestId('readiness-executive-posture')).toContainText('معايير الجاهزية التشغيلية غير مسلّمة');
  await expect(page.getByTestId('readiness-executive-posture')).toContainText('مكتب إدارة المشروع');
  await expect(page.getByTestId('readiness-critical-command-strip')).toContainText('تقديم واعتماد حزمة متطلبات تشغيلية');
  await expect(page.getByText('مصدر حوكمة المشروع معتمد من المؤسس').first()).toBeVisible();
  await expect(page.getByText('مصدر CAD معتمد من المؤسس').first()).toBeVisible();
  await expect(page.getByText('سلامة ملف CAD متحققة').first()).toBeVisible();
  await expect(page.getByTestId('readiness-command-workspace').getByRole('slider')).toHaveCount(0);
  await expect(page.getByTestId('readiness-command-workspace')).not.toContainText('0% جاهزية');

  const bounds = await page.getByTestId('readiness-command-workspace').evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  expect(bounds.body).toBeLessThanOrEqual(bounds.viewport);
  expect(errors).toEqual([]);
});

test('filters requirements by workstream and keeps evidence, verification, internal approval, and client acceptance distinct', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(readinessUrl);
  await expectKapReadiness(page);

  await page.getByTestId('readiness-view-matrix').click();
  await expect(page.getByTestId('readiness-requirement-matrix')).toBeVisible();
  await page.getByTestId('readiness-workstream-filter').selectOption('WORKSTREAM-KAP-EXECUTION');
  await expect(page.getByTestId('readiness-requirement-matrix')).toContainText('الإنجاز الميداني الحالي');
  await expect(page.getByTestId('readiness-requirement-matrix')).not.toContainText('التحقق من المقياس');

  await page.getByTestId('readiness-view-flow').click();
  const flow = page.getByTestId('readiness-evidence-approval-flow');
  await expect(flow).toContainText('الدليل');
  await expect(flow).toContainText('التحقق');
  await expect(flow).toContainText('اعتماد داخلي');
  await expect(flow).toContainText('قبول العميل');
  await page.getByTestId('readiness-policy-preview').selectOption('evidence-submitted');
  await expect(flow).toContainText('مرفق لا يعني متحققًا');
  await page.getByTestId('readiness-policy-preview').selectOption('client-acceptance-pending');
  await expect(flow).toContainText('معاينة سياسة عامة غير تشغيلية');
  await page.getByTestId('readiness-policy-preview').selectOption('expired-evidence');
  await expect(flow).toContainText('منتهي الصلاحية');
  expect(errors).toEqual([]);
});

test('synchronizes map selection, exposes the governance conflict, and creates only an unapproved decision draft', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(readinessUrl);
  await expectKapReadiness(page);

  await page.getByTestId('readiness-view-governance').click();
  await expect(page.getByTestId('execution-assignment-conflict')).toContainText('assignmentStatus = conflicted');
  await expect(page.getByTestId('execution-assignment-conflict')).toContainText('لا يحجب المسارات غير المرتبطة');

  await page.getByTestId('readiness-view-map').click();
  await expect(page.getByTestId('readiness-spatial-map')).toBeVisible();
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);
  await page.getByTestId('readiness-search-toggle').click();
  await page.getByRole('textbox', { name: 'البحث في قيادة الجاهزية' }).fill('ممر العصور');
  await page.getByRole('option').filter({ hasText: 'ممر العصور' }).click();
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('readiness-map-full-view')).toContainText('ENTITY-KAP-OP-006');
  await expect(page.getByTestId('readiness-map-full-view')).toContainText('الموضع المرشح لا يثبت الجاهزية');

  await page.getByTestId('readiness-view-overview').click();
  await page.getByTestId('create-readiness-decision-draft').click();
  const draft = page.getByTestId('readiness-decision-draft');
  await expect(draft).toContainText('مسودة قرار محلية · غير معتمدة');
  await expect(draft).toContainText('لا تغيّر الجاهزية');
  await expect(page.getByTestId('readiness-command-workspace')).toHaveAttribute('data-readiness-posture', 'unassessed');
  expect(errors).toEqual([]);
});

test('previews local authoring before activation and restores deep links without cross-project fallback', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(`${readinessUrl}&readinessView=flow`);
  await expectKapReadiness(page);
  await expect(page.getByTestId('readiness-view-flow')).toHaveAttribute('aria-current', 'page');

  await page.getByTestId('readiness-technical-drawer-open').click();
  await expect(page.getByTestId('readiness-source-truth-drawer')).toContainText('8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb');
  await expect(page.getByTestId('readiness-source-truth-drawer')).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  await expect(page.getByTestId('readiness-local-authoring')).toContainText('لا ترقية إلى baseline');
  await page.getByTestId('readiness-authoring-reason').fill('مراجعة محلية لملكية متطلب التحضير.');
  await page.getByTestId('readiness-authoring-preview').click();
  await expect(page.getByTestId('readiness-authoring-diff')).toContainText('ownerRoleId');
  await expect(page.getByTestId('readiness-authoring-activate')).toBeEnabled();
  await page.getByTestId('readiness-authoring-activate').click();
  await expect(page.getByTestId('readiness-local-authoring')).toContainText('لم يتغير baseline');

  await page.reload();
  await expectKapReadiness(page);
  await expect(page.getByTestId('readiness-view-flow')).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await page.goForward();
  await expectKapReadiness(page);

  await page.goto('/?workspace=readiness&project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&venue=VENUE-DEMO-001');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-DEMO-LOCAL-001');
  await expect(page.getByText('legacy-temporary-demo').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('حدائق الملك عبدالله');
  expect(errors).toEqual([]);
});
