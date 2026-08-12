import { expect, test, type Page } from '@playwright/test';
import { ensureSpatialMarkerInteractive } from './spatial-marker-helpers';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl = `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;

function monitorPage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openPack(page: Page, view = 'summary') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.locator('main[data-event-id]')).toHaveAttribute('data-event-id', eventId);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

test('loads the real KAP candidate and distinguishes preparation completeness from operational readiness', async ({ page }) => {
  const errors = monitorPage(page);
  await openPack(page);

  await expect(page.getByTestId('operational-readiness-cannot-determine')).toHaveText('لا يمكن التحديد');
  await expect(page.getByTestId('pack-preparation-completeness')).toContainText('٦١٫٧٪');
  await expect(page.getByTestId('readiness-pack-summary-view')).toContainText('ليست نسبة جاهزية تشغيلية');
  await expect(page.getByTestId('readiness-pack-summary-view')).toContainText('المجهول ليس صفرًا');
  await expect(page.getByTestId('readiness-pack-summary-view')).toContainText('سلطة قرار الافتتاح');
  await expect(page.getByTestId('readiness-pack-summary-view')).toContainText('٥ تعارضات مفتوحة');
  await expect(page.getByTestId('operational-readiness-pack-workspace').getByRole('slider')).toHaveCount(0);

  const bounds = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    contentHeight: document.querySelector('.orp-content')?.getBoundingClientRect().height ?? 0
  }));
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1);
  expect(bounds.contentHeight).toBeGreaterThanOrEqual(440);
  expect(errors).toEqual([]);
});

test('shows exact source fingerprints, locators, and the employee reference limitation', async ({ page }) => {
  const errors = monitorPage(page);
  await openPack(page, 'sources');

  const governance = page.getByTestId('source-record-SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001');
  await expect(governance).toContainText('البصمة متطابقة');
  await expect(governance).toContainText('مرجع حوكمة مشروع معتمد من المؤسس');
  await page.getByTestId('source-trace-open-SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001').click();
  await page.getByTestId('source-trace-drawer').getByRole('button', { name: 'البصمة والمعرّفات' }).click();
  await expect(page.getByTestId('readiness-pack-technical-drawer')).toContainText('Content SHA');
  await expect(page.getByTestId('readiness-pack-technical-drawer')).toContainText(
    '9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97'
  );
  await page.getByRole('button', { name: 'إغلاق الحقيقة التقنية' }).click();
  await page.getByRole('button', { name: 'إغلاق محدد المصدر' }).click();

  const employee = page.getByTestId('source-record-SOURCE-ASSET-KAP-EMPLOYEE-XLSX-001');
  await expect(employee).toContainText('مرجع أسماء موظفين محدود السلطة');
  await expect(employee).toContainText('1');
  const employeeLimits = employee.getByRole('button', { name: 'حدود السلطة' });
  await expect(employeeLimits).toHaveCount(1);
  await employeeLimits.click();
  await expect(employee).toContainText('لا يثبت تعيينًا في المشروع');
  await page.getByTestId('source-trace-select-TRACE-KAP-EMPLOYEE-MUHAMMAD-R28').click();
  await expect(page.getByTestId('source-trace-drawer')).toContainText('ورقة موظفين ميادين · صف 28');
  await expect(page.getByTestId('source-trace-drawer')).toContainText('لا يثبت دورًا أو سلطة في المشروع');
  await page.getByRole('button', { name: 'البصمة والمعرّفات' }).click();

  const technical = page.getByTestId('readiness-pack-technical-drawer');
  await expect(technical).toContainText('8b45cff4b505d5e1b08088c84426d46895d4cb127580e2c388a655cc44bf63fb');
  await expect(technical).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  await expect(technical).toContainText('fac606e4517e8d6e2f070dab4582d980b932c8eca2d9f5a0f3ea0fb18a746aec');
  expect(errors).toEqual([]);
});

test('separates workstream assignment from verification, approval, acceptance, HSE and opening authority', async ({ page }) => {
  const errors = monitorPage(page);
  await openPack(page, 'workstreams');

  await expect(page.getByTestId('workstream-WORKSTREAM-KAP-OPERATIONS')).toContainText('ماجد قاسم');
  await expect(page.getByTestId('workstream-WORKSTREAM-KAP-CREATIVE-CONTENT')).toContainText('إبراهيم الغمري');
  await expect(page.getByTestId('workstream-WORKSTREAM-KAP-EXECUTION')).toContainText('تعارض تعيين');
  const comparison = page.getByTestId('execution-candidate-comparison');
  await expect(comparison).toContainText('محمد إبراهيم');
  await expect(comparison).toContainText('شريحة 3');
  await expect(comparison).toContainText('جوزيف حداد');
  await expect(comparison).toContainText('شريحة 7');
  await expect(comparison).toContainText('القرار: غير محسوم');
  await expect(comparison).toContainText('المخوّل بالحسم: غير معروف');
  await expect(comparison).toContainText('التغطية المحتسبة: لا أحد');
  await expect(page.getByTestId('governance-conflict-register')).toContainText('٥ تعارضات غير محلولة');

  await page.getByTestId('readiness-pack-view-authorities').click();
  const authorityView = page.getByTestId('readiness-pack-authorities-view');
  await expect(authorityView).toBeVisible();
  await expect(page.getByTestId('authority-hse-authority-unknown')).toContainText('غير معيّن');
  await expect(page.getByTestId('authority-engineering-authority-unknown')).toContainText('غير معيّن');
  await expect(page.getByTestId('authority-route-authority-unknown')).toContainText('غير معيّن');
  await expect(page.getByTestId('authority-opening-authority-unknown')).toContainText('غير معيّن');
  await expect(page.getByTestId('pack-authority-boundary')).toContainText('ولا يثبت جاهزية المشروع');
  await expect(authorityView).not.toContainText('أحمدجهة HSE');
  expect(errors).toEqual([]);
});

test('creates an immutable local candidate diff, blocks invalid edits and freeze, then rolls back', async ({ page }) => {
  const errors = monitorPage(page);
  await openPack(page, 'requirements');

  await page.getByTestId('readiness-pack-requirement-REQ-KAP-GOV-STRATEGIC-OBJECTIVE').click();
  await expect(page.getByTestId('requirement-inspector')).toBeVisible();
  await page.getByTestId('candidate-edit-open').click();
  await expect(page.getByTestId('candidate-edit-drawer')).toContainText('لا يثبت الإنجاز');

  await page.getByLabel('تعريف الإكمال المرشح').fill('');
  await page.getByTestId('candidate-edit-preview').click();
  await expect(page.getByTestId('candidate-authoring-message')).toContainText('سبب التغيير إلزامي');

  await page.getByLabel('تعريف الإكمال المرشح').fill('إصدار موثق مع سجل مراجعة واعتماد تسليم، دون ادعاء إنجاز ميداني.');
  await page.getByLabel('سبب التغيير الإلزامي').fill('توضيح تعريف الإكمال المرشح للمراجعة المؤسسية.');
  await page.getByTestId('candidate-edit-preview').click();
  await expect(page.getByTestId('candidate-revision-diff')).toContainText('قبل / بعد');
  await expect(page.getByTestId('candidate-revision-diff')).toContainText('completionDefinition');
  await page.getByTestId('candidate-edit-apply').click();

  await page.getByTestId('readiness-pack-view-eligibility').click();
  await expect(page.getByTestId('pre-freeze-gate-group')).toContainText('محجوب ١٥ من');
  await expect(page.getByTestId('pre-activation-gate-group')).toContainText('محجوب ٥ من');
  await expect(page.getByTestId('readiness-pack-eligibility-view')).toContainText('R2');
  await page.getByTestId('candidate-freeze-attempt').click();
  await expect(page.getByTestId('freeze-blocked-message')).toContainText('تعذر التجميد');
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toContainText('غير مقيمة · لا يمكن التحديد');

  await page.getByTestId('candidate-rollback-r1').click();
  await expect(page.getByTestId('readiness-pack-eligibility-view')).toContainText('المراجعات والفروقات');
  await expect(page.getByTestId('readiness-pack-eligibility-view')).toContainText('R1');
  await page.reload();
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toContainText('مرشح للمراجعة · R1');
  expect(errors).toEqual([]);
});

test('links requirements to existing candidate entities without inventing a marker and creates only a decision draft', async ({ page }) => {
  const errors = monitorPage(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPack(page, 'spatial');
  await expect(page.getByTestId('readiness-spatial-map')).toBeVisible();
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);

  await page.getByTestId('spatial-requirement-REQ-KAP-SCOPE-TECHNICAL-ARTISTIC-SHOWS').click();
  await expect(page.getByTestId('unresolved-spatial-no-marker')).toContainText('لم تُنشأ علامة أو نقطة أو مسار بديل');
  await expect(page.locator('[data-candidate-id="ZONE-SHOW-001"]')).toHaveCount(0);

  await page.getByTestId('spatial-requirement-REQ-KAP-SCOPE-TRANSPORT-TOURS-MEDIA').click();
  const marker = await ensureSpatialMarkerInteractive(page, 3, 'keyboard');
  await marker.focus();
  await marker.press('Enter');
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('readiness-pack-spatial-view')).toContainText('متطلبات مرتبطة بالعنصر');
  await page.getByRole('button', { name: 'مسودة قرار من العائق' }).click();
  const decision = page.getByTestId('readiness-pack-decision-draft');
  await expect(decision).toContainText('Decision Draft · لم تعتمد');
  await expect(decision).toContainText('الجاهزية لم تتغير');
  await expect(decision).toContainText('الأساس لم يتغير');
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toContainText('غير مقيمة · لا يمكن التحديد');
  expect(errors).toEqual([]);
});

test('restores valid deep links and browser history while rejecting foreign project state without demo fallback', async ({ page }) => {
  const errors = monitorPage(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPack(page, 'authorities');
  await expect(page.getByTestId('readiness-pack-view-authorities')).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByTestId('readiness-pack-view-authorities')).toHaveAttribute('aria-current', 'page');

  await page.getByTestId('readiness-pack-view-evidence').focus();
  await page.getByTestId('readiness-pack-view-evidence').press('Enter');
  await expect(page.getByTestId('readiness-pack-view-evidence')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('readiness-pack-view-eligibility').click();
  await page.goBack();
  await expect(page.getByTestId('readiness-pack-view-evidence')).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page.getByTestId('readiness-pack-view-eligibility')).toHaveAttribute('aria-current', 'page');

  const transition = await page.getByTestId('readiness-pack-view-eligibility').evaluate((element) =>
    getComputedStyle(element).transitionDuration
  );
  expect(['0s', '0.001ms', '1e-06s']).toContain(transition);

  await page.goto('/?workspace=readiness-pack&project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&venue=VENUE-DEMO-001&readinessPackView=summary');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-DEMO-LOCAL-001');
  await expect(page.getByTestId('operational-readiness-pack-unavailable')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('ماجد قاسم');
  await expect(page.locator('body')).not.toContainText('حزمة الجاهزية التشغيلية المرشحة لافتتاح حدائق الملك عبدالله');
  expect(errors).toEqual([]);
});
