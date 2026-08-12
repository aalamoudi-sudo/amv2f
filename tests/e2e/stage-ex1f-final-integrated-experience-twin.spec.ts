import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const projectId = 'PROJECT-KAP-OPENING-2026';
const scope = `project=${projectId}&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001`;
const experienceUrl = `/?workspace=experience-twin&${scope}`;

async function openExperienceSpace(page: Page) {
  const trigger = page.getByTestId('experience-space-menu-trigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await expect(page.getByTestId('experience-space-drawer')).toBeVisible();
}

async function selectExperienceMode(page: Page, mode: string) {
  await openExperienceSpace(page);
  await page.getByTestId(`experience-review-mode-${mode}`).click();
}

async function expectIntegratedWorkspace(page: Page) {
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-project-id', projectId);
  await expect(page.getByTestId('experience-integrated-review')).toHaveCount(1);
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('لا يمكن تحديدها');
  await expect(workspace).not.toContainText('0% جاهزية');
}

test('communicates the KAP Experience Twin context within the first view', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await expect(page.getByTestId('experience-compact-bar')).toBeVisible();
  await expect(page.getByTestId('experience-review-overview')).toBeVisible();
  await expect(page.getByTestId('experience-start-from-gate')).toContainText('ابدأ رحلة التجربة');
  await expect(page.getByTestId('experience-hero-spatial')).toContainText('مرجع 2D محسن');
  const context = page.getByTestId('experience-review-context-strip');
  await expect(page.getByTestId('experience-twin-workspace')).toContainText('مشروع تدشين حدائق الملك عبدالله');
  await expect(context).toContainText('31 أكتوبر – 3 نوفمبر 2026');
  await expect(context).toContainText('أربعة أيام');
  await expect(context).toContainText('اليوم الأول');
  await expect(context).toContainText('الموظفون وعائلاتهم');
  await expect(context).toContainText('الاستقبال');
  await expect(context).toContainText('البوابات');
  await expect(context).toContainText('معاينة مرجعية مسطحة');
  await expect(context).toContainText('الجاهزية التشغيلية');
  await expect(page.getByTestId('experience-persona-select')).toBeVisible();
  await expect(page.locator('.experience-review-days button')).toHaveCount(4);
  await expect(page.locator('.experience-review-destinations button')).toHaveCount(11);
  await openExperienceSpace(page);
  for (const [mode, label] of [
    ['overview', 'نظرة التجربة'], ['days', 'الأيام الأربعة'], ['journey', 'رحلة الزائر'],
    ['story', 'خريطة القصة'], ['scenes', 'المشاهد'], ['command', 'القيادة'],
    ['sources', 'الحقيقة والمصادر'], ['delivery', 'ما تم / ما التالي'], ['presentation', 'عرض العميل']
  ] as const) await expect(page.getByTestId(`experience-review-mode-${mode}`)).toContainText(label);
  await expect(page.getByTestId('experience-review-open-rehearsal')).toContainText('البروفة الرقمية');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('experience-space-drawer')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('synchronizes the four-day visual control without leaking prior day state', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await selectExperienceMode(page, 'days');
  const days = page.getByTestId('experience-review-days-workspace').locator(':scope > button');
  await expect(days).toHaveCount(4);
  await expect(days.nth(0)).toContainText(/(?:31|٣١) أكتوبر/);
  await expect(days.nth(1)).toContainText(/(?:1|١) نوفمبر/);
  await expect(days.nth(2)).toContainText('3 بدائل غير مختارة');
  await expect(days.nth(3)).toContainText('Web3D تصميمي متحقق · غير مسجل هندسيًا');

  await days.nth(2).click();
  await expect(page).toHaveURL(/day=DAY-KAP-2026-11-02/);
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('اليوم الثالث');
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-11-02');
  const thirdDayPersona = new URL(page.url()).searchParams.get('persona');
  await days.nth(3).click();
  await expect(page).toHaveURL(/day=DAY-KAP-2026-11-03/);
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('اليوم الرابع');
  await expect(page.getByTestId('experience-persona-select')).toHaveValue(new URL(page.url()).searchParams.get('persona') ?? '');
  expect(new URL(page.url()).searchParams.get('persona')).not.toBe(thirdDayPersona);
});

test('synchronizes day, destination, marker, inspector and URL selection', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-11-02');
  await expect(page).toHaveURL(/day=DAY-KAP-2026-11-02/);
  await selectExperienceMode(page, 'command');
  await page.getByTestId('experience-command-reveal').getByRole('button', { name: 'إغلاق عرض ما وراء التجربة' }).click();
  await page.getByTestId('experience-marker-ENTITY-KAP-OP-006').click();
  await expect(page).toHaveURL(/entity=ENTITY-KAP-OP-006/);
  await expect(page.getByTestId('experience-marker-ENTITY-KAP-OP-006')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('experience-inspector')).toContainText('ENTITY-KAP-OP-006');
  await page.getByTestId('experience-behind-the-experience').click();
  await expect(page.getByTestId('experience-review-route-candidates')).toContainText('مقترح دخول اليوم الثالث 1');
  await expect(page.getByTestId('experience-review-route-candidates')).toContainText('مقترح دخول اليوم الثالث 2');
  await expect(page.getByTestId('experience-review-route-candidates')).toContainText('مقترح دخول اليوم الثالث 3');
  await expect(page.getByTestId('experience-review-route-candidates')).toContainText('غير مختار');
});

test('shows source reconciliation and complete conflicts without restricted details', async ({ page }) => {
  await page.goto(`${experienceUrl}&experienceMode=sources`);
  await expectIntegratedWorkspace(page);
  const sourceView = page.getByTestId('experience-review-sources');
  await expect(sourceView).toContainText('V 16 عرض الأمين final 12 Jul.pdf');
  await expect(sourceView).toContainText('مقترحات الدخول لكل الايام V.02.pdf');
  await expect(sourceView).toContainText('حفل التدشين - الملف العام.pdf');
  await expect(sourceView).toContainText('اقتراحات الدخول V.11.pdf');
  await expect(sourceView.getByRole('option')).toHaveCount(13);
  await sourceView.getByRole('option', { name: /تفاصيل HSE مقيدة/ }).click();
  await expect(page.getByTestId('experience-review-conflict-detail')).toContainText('التفاصيل المقيدة مستبعدة');
  const text = await sourceView.innerText();
  expect(text).not.toMatch(/150\s*(متر|m)|24\.7\d|46\.7\d/i);
  expect(text).not.toMatch(/[a-f0-9]{64}/i);
});

test('shows candidate content and truthful missing 360 and production GLB states', async ({ page }) => {
  await page.goto(`${experienceUrl}&experienceMode=assets`);
  await expectIntegratedWorkspace(page);
  const assets = page.getByTestId('experience-review-assets');
  await expect(assets).toContainText('تصوير KAP 360');
  await expect(assets).toContainText('نموذج KAP ثلاثي الأبعاد للإنتاج');
  await expect(assets).toContainText('مراجع التصميم المسطحة');
  const content = page.getByTestId('experience-review-content-candidates');
  await expect(content).toContainText('الرياض من الفتح حتى الحدائق');
  await expect(content).toContainText('سفينة البقاء');
  await expect(content).toContainText('رحلة الزمن الأخضر · قرابة 3 دقائق');
  await expect(content).toContainText('7 محطات');
  await expect(content).toContainText('لا يوجد خيار معتمد');
});

test('shows the controlled Wave B receipt and pending Wave C without claiming acceptance or binding', async ({ page }) => {
  await page.goto(`${experienceUrl}&experienceMode=delivery`);
  await expectIntegratedWorkspace(page);
  const dashboard = page.getByTestId('experience-delivery-dashboard');
  await expect(dashboard).toContainText('ما تم بناؤه');
  await expect(dashboard).toContainText('ما التالي');
  const operationalLane = page.getByTestId('experience-delivery-lane-operational');
  await expect(operationalLane).toContainText('استُلمت V.11 وتحققت بصمتها');
  await expect(operationalLane).toContainText('1 مستلم');
  await expect(operationalLane).toContainText('المقبول0');
  await expect(operationalLane).toContainText('جاهزية الربطمحجوبة');
  await expect(page.getByTestId('experience-delivery-lane-studio-3d')).toContainText('مشاهد 360° والنماذج ثلاثية الأبعاد قيد التسليم والتحسين');
  await expect(dashboard).toContainText('معاينة');
  await expect(dashboard).toContainText('تحقق');
  await expect(dashboard).toContainText('قبول مرشح');
  await expect(dashboard).toContainText('الربط لم يبدأ');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('لا يمكن تحديدها');
});

test('keeps optional flat references safe, panorama missing, and verified Web3D explicitly candidate', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await selectExperienceMode(page, 'scenes');
  await expect(page.getByTestId('scene-load-state')).toContainText('ملف المشهد المحلي غير موجود');
  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('مشاهد 360° قيد التسليم من استوديو التصميم');
  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');
});

test('keeps day two visible but operationally not applicable and the show unanchored', async ({ page }) => {
  await page.goto(`${experienceUrl}&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-MAIN-SHOW&mapMode=operational&experienceMode=journey`);
  await expectIntegratedWorkspace(page);
  await openExperienceSpace(page);
  await expect(page.getByTestId('experience-day-attendance')).toContainText('الحضور غير محدد');
  await expect(page.getByTestId('experience-site-context')).toContainText('سياقان احتفاليان منفصلان · لا رحلة أو انتقال مشترك');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('experience-day2-no-operational-journey')).toContainText('لا رحلة تشغيلية');
  await expect(page.getByTestId('experience-show-unresolved')).toContainText('لا توجد مرساة أو نقطة بديلة');
  await expect(page.getByTestId('experience-map-surface')).not.toContainText('مسار معتمد');
  await expect(page).not.toHaveURL(/route=/);
});

test('runs a 14-step Arabic client presentation without technical or restricted data', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await page.getByTestId('experience-presentation-open').click();
  const presentation = page.getByTestId('experience-client-presentation');
  await expect(presentation).toBeVisible();
  await expect(presentation.locator('.experience-presentation-steps button')).toHaveCount(14);
  await expect(presentation).toContainText('رؤية تجربة متكاملة لأربعة أيام');
  await expect(presentation).toContainText('لا يمكن تحديدها');
  const presentationText = await presentation.innerText();
  expect(presentationText).not.toMatch(/ENTITY-|SOURCE-|TRACE-|[a-f0-9]{64}/i);
  await presentation.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page).toHaveURL(/experienceMode=presentation/);
  await expect(page).toHaveURL(/presentationStep=2/);
  await presentation.press('Escape');
  await expect(presentation).toHaveCount(0);
  await expect(page).toHaveURL(/experienceMode=overview/);
});

test('traps presentation focus and disables guided advance for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${experienceUrl}&experienceMode=presentation&presentationStep=1&presentationState=playing`);
  await expectIntegratedWorkspace(page);

  const presentation = page.getByTestId('experience-client-presentation');
  const close = presentation.getByRole('button', { name: 'إغلاق عرض العميل' });
  const next = presentation.getByRole('button', { name: 'التالي', exact: true });
  await expect(presentation).toBeVisible();

  await next.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(next).toBeFocused();

  await page.waitForTimeout(8_250);
  await expect(page).toHaveURL(/presentationStep=1/);
  await expect(presentation).toContainText('رؤية تجربة متكاملة لأربعة أيام');
});

test('restores integrated review mode with refresh and browser back-forward', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await selectExperienceMode(page, 'command');
  await selectExperienceMode(page, 'sources');
  await expect(page).toHaveURL(/experienceMode=sources/);
  await page.goBack();
  await expect(page.getByTestId('experience-integrated-review')).toHaveAttribute('data-review-mode', 'command');
  await page.goForward();
  await expect(page.getByTestId('experience-integrated-review')).toHaveAttribute('data-review-mode', 'sources');
  await page.reload();
  await expect(page.getByTestId('experience-integrated-review')).toHaveAttribute('data-review-mode', 'sources');
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }]) {
  test(`keeps Story Map and Scene surfaces dominant at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(experienceUrl);
    await expectIntegratedWorkspace(page);
    const workspace = page.getByTestId('experience-twin-workspace');

    await selectExperienceMode(page, 'story');
    const map = page.getByTestId('experience-map-surface');
    const mapBox = await map.boundingBox();
    const workspaceBox = await workspace.boundingBox();
    expect(mapBox?.height ?? 0).toBeGreaterThanOrEqual(360);
    expect((mapBox?.width ?? 0) / Math.max(workspaceBox?.width ?? 1, 1)).toBeGreaterThanOrEqual(0.55);

    await selectExperienceMode(page, 'scenes');
    const scene = page.getByTestId('experience-scene-panel');
    const sceneBox = await scene.boundingBox();
    expect(sceneBox?.height ?? 0).toBeGreaterThanOrEqual(360);
    expect((sceneBox?.width ?? 0) / Math.max(workspaceBox?.width ?? 1, 1)).toBeGreaterThanOrEqual(0.55);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
}

test('opens the existing controlled rehearsal from the integrated entry without truth promotion', async ({ page }) => {
  await page.goto(experienceUrl);
  await expectIntegratedWorkspace(page);
  await openExperienceSpace(page);
  await page.getByTestId('experience-review-open-rehearsal').click();
  await expect(page).toHaveURL(/workspace=experience-rehearsal/);
  await expect(page.getByTestId('experience-rehearsal-workspace')).toContainText('هذه بروفة رقمية مرشحة وليست تنفيذًا حيًا أو اعتمادًا تشغيليًا');
  await expect(page.getByTestId('experience-rehearsal-workspace')).toContainText('الجاهزية: لا يمكن تحديدها');
});

test('does not leak the KAP review projection into a fictional project', async ({ page }) => {
  await page.goto('/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001');
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(page.getByTestId('experience-integrated-review')).toHaveCount(0);
  const text = await workspace.innerText();
  expect(text).not.toContain('حدائق الملك عبدالله');
  expect(text).not.toContain('ENTITY-KAP');
  expect(text).not.toContain('45 لحظة');
});
