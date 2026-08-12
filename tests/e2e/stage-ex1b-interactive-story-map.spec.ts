import { expect, test, type Page } from '@playwright/test';

const kapScope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const day1Url = `/?workspace=experience-twin&${kapScope}&scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&landmark=LANDMARK-KAP-ARRIVAL&lens=experience&mapMode=story&viewMode=map-focus`;
const conferenceUrl = '/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001&mapMode=story';

function monitorPage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  return errors;
}

async function openExperienceSpace(page: Page) {
  const trigger = page.getByTestId('experience-space-menu-trigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await expect(page.getByTestId('experience-space-drawer')).toBeVisible();
}

async function expectStoryMap(page: Page) {
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-package-status', 'candidate');
  await expect(page.getByTestId('story-map-shell')).toBeVisible();
  await expect(page.getByTestId('story-map-shell')).toContainText('خريطة سردية مرشحة للمراجعة - ليست مخططًا هندسيًا');
  await expect(page.getByTestId('story-map-shell')).toContainText('بروفة سردية مرشحة - لا تمثل حركة ميدانية أو زمن وصول معتمدًا');
  await expect(workspace).not.toContainText('0% جاهزية');
}

test('renders a dominant, truthful and keyboard-operable KAP story map', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await expectStoryMap(page);

  const frame = page.getByTestId('story-map-frame');
  const size = await frame.boundingBox();
  expect(size?.height ?? 0).toBeGreaterThanOrEqual(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await frame.focus();
  await frame.press('+');
  await expect(page).toHaveURL(/mapZoom=1\.2/);
  await frame.press('ArrowLeft');
  await expect(page).toHaveURL(/mapPanX=/);
  await frame.press('0');
  await expect(page).toHaveURL(/mapZoom=1\.000/);

  const ages = page.getByTestId('story-landmark-LANDMARK-KAP-AGES-CORRIDOR');
  await ages.press('Enter');
  await expect(ages).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/landmark=LANDMARK-KAP-AGES-CORRIDOR/);
  await expect(page.getByTestId('experience-inspector')).toContainText('ممر العصور');
  expect(errors).toEqual([]);
});

test('synchronizes narrative walking without claiming a field route', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await expectStoryMap(page);

  await page.getByTestId('story-map-walk-start').click();
  await expect(page.getByTestId('story-map-visitor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'إيقاف البروفة مؤقتًا' })).toBeVisible();
  await page.getByRole('button', { name: 'إيقاف البروفة مؤقتًا' }).click();
  await page.getByRole('button', { name: 'الخطوة التالية' }).click();
  await expect(page).toHaveURL(/landmark=LANDMARK-KAP-RECEPTION/);
  await page.getByRole('button', { name: 'الخطوة التالية' }).click();
  await expect(page).toHaveURL(/landmark=LANDMARK-KAP-GARDENS-MODEL/);
  await page.getByTestId('experience-inspector-toggle').click();
  await expect(page.getByTestId('experience-inspector')).toContainText('مجسم الحدائق');

  const body = await page.locator('body').innerText();
  expect(body).toContain('لا مقياس · لا مسافات · لا زمن وصول');
  expect(body).not.toContain('SpatialRoute');
  expect(body).not.toContain('مسافة الوصول');
  expect(errors).toEqual([]);
});

test('preserves separate 1 November ceremony contexts without a route or fake anchor', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-11-01');
  await expect(page.getByTestId('story-map-journey-not-applicable-20261101')).toContainText('لا خط انتقال ولا مدة سفر ولا افتراض جمهور مشترك');
  await expect(page.getByTestId('story-map-dual-site-transition')).toHaveCount(0);
  await expect(page.locator('.story-map-route')).toHaveCount(0);
  await openExperienceSpace(page);
  await expect(page.getByTestId('experience-site-context')).toContainText('سياقان احتفاليان منفصلان · لا رحلة أو انتقال مشترك');
  await page.getByRole('button', { name: 'إغلاق القائمة' }).click();

  await page.getByTestId('experience-step-STEP-KAP-ROYAL-MAIN-SHOW').click();
  await expect(page.getByTestId('story-map-unresolved-list')).toContainText('العرض الرئيسي');
  await expect(page).not.toHaveURL(/landmark=LANDMARK-KAP-MAIN-SHOW/);
  await expect(page.locator('[data-testid="story-landmark-LANDMARK-KAP-MAIN-SHOW"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('supports layers, opacity, day and source comparisons, presentation, and URL restoration', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await expectStoryMap(page);

  await page.getByTestId('story-map-layers-toggle').click();
  const layerPanel = page.getByTestId('story-map-layer-panel');
  await expect(layerPanel).toBeVisible();
  const opacity = layerPanel.getByRole('slider').first();
  await opacity.fill('0.4');
  await expect(page).toHaveURL(/mapOpacity=/);
  await layerPanel.getByRole('checkbox').first().uncheck();
  await expect(page).toHaveURL(/mapLayers=/);
  await page.getByRole('button', { name: 'إغلاق الطبقات' }).click();

  await page.getByTestId('story-map-comparison-toggle').click();
  await page.getByTestId('story-map-compare-mode').selectOption('day');
  await expect(page.getByTestId('story-map-comparison-panel')).toContainText('محطات مشتركة');
  await page.getByTestId('story-map-compare-mode').selectOption('source');
  await expect(page.getByTestId('story-map-source-comparison')).toContainText('لا توجد محاذاة هندسية مثبتة');

  await page.getByTestId('story-map-presentation').click();
  await expect(page.getByTestId('story-map-shell')).toHaveClass(/is-presentation/);
  await expect(page.getByTestId('story-map-authoring-open')).toHaveCount(0);
  await page.getByTestId('story-map-exit-presentation').click();
  await page.reload();
  await page.getByTestId('story-map-comparison-toggle').click();
  await expect(page.getByTestId('story-map-compare-mode')).toHaveValue('source');
  expect(errors).toEqual([]);
});

test('authors only a local immutable candidate revision with undo, redo and cancel', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await expectStoryMap(page);
  await page.getByTestId('story-map-authoring-open').click();

  const panel = page.getByTestId('story-map-authoring-panel');
  await expect(panel).toContainText('تحرير بصري مرشح — ليس إحداثيات مساحية');
  await panel.getByRole('combobox').first().selectOption('LANDMARK-KAP-ARRIVAL');
  await page.getByRole('button', { name: 'تحريك التسمية للأعلى' }).click();
  await expect(panel.getByRole('button', { name: /تراجع/ })).toBeEnabled();
  await panel.getByRole('button', { name: /تراجع/ }).click();
  await expect(panel.getByRole('button', { name: /إعادة/ })).toBeEnabled();
  await panel.getByRole('button', { name: /إعادة/ }).click();

  await panel.getByRole('textbox').fill('تحسين موضع تسمية البوابة للمراجعة البصرية');
  await page.getByTestId('story-map-save-revision').click();
  await expect(page.getByTestId('story-map-shell')).toContainText('R2 · مراجعة محلية مرشحة');
  await expect(panel).toContainText('candidate');
  await panel.getByRole('button', { name: /استعادة R1/ }).click();
  await expect(page.getByTestId('story-map-shell')).toContainText('R1 · المراجعة المصدرية');

  await page.getByRole('button', { name: 'إغلاق التأليف' }).click();
  await expect(panel).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('keeps panorama unavailable, loads only verified KAP Web3D, and reuses contracts without leakage', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(day1Url);
  await expectStoryMap(page);
  await openExperienceSpace(page);
  await page.getByTestId('experience-map-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('مشاهد 360° قيد التسليم من استوديو التصميم');
  await openExperienceSpace(page);
  await page.getByTestId('experience-map-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');

  await page.goto(conferenceUrl);
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(page.getByTestId('story-map-shell')).toBeVisible();
  await expect(workspace).toContainText('مرجع خيالي بلا تاريخ تشغيلي');
  const text = await workspace.innerText();
  expect(text).not.toContain('KAP');
  expect(text).not.toContain('حدائق الملك عبدالله');
  expect(text).not.toContain('Ahmed');
  expect(errors).toEqual([]);
});
