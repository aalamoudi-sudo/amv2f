import { expect, test, type Page } from '@playwright/test';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const scope = `project=${projectId}&event=${eventId}&venue=${venueId}`;
const experienceUrl = `/?workspace=experience-twin&${scope}&scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&lens=experience&mapMode=illustrated&viewMode=split`;
const conferenceUrl = '/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001&experienceMode=story';

async function openExperienceSpace(page: Page) {
  const trigger = page.getByTestId('experience-space-menu-trigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await expect(page.getByTestId('experience-space-drawer')).toBeVisible();
}

function monitorPage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  return errors;
}

async function expectKapExperience(page: Page) {
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-package-status', 'candidate');
  await expect(workspace).toHaveAttribute('data-project-id', projectId);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.getByTestId('experience-truth-open')).toBeVisible();
  await expect(workspace).toContainText('لا يمكن تحديدها');
  await expect(workspace).not.toContainText('0% جاهزية');
}

test('opens additively from the portfolio and presents the complete four-day gate-to-gate workspace', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto('/?workspace=portfolio');
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card.getByTestId('experience-twin-open')).toContainText('ادخل إلى عالم الفعالية');
  await card.getByTestId('experience-twin-open').click();
  await expectKapExperience(page);
  await expect(page).toHaveURL(/workspace=experience-twin/);
  await expect(page.getByTestId('experience-review-overview').getByRole('heading', { name: 'مشروع تدشين حدائق الملك عبدالله' })).toBeVisible();
  await expect(page.getByTestId('experience-start-from-gate')).toContainText('ابدأ رحلة التجربة');

  const dayOptions = await page.getByTestId('experience-day-select').locator('option').allTextContents();
  expect(dayOptions).toEqual(expect.arrayContaining(['اليوم الأول · ما قبل التدشين', 'اليوم الثاني · التدشين الملكي', 'اليوم الثالث · زيارة أمير منطقة الرياض', 'اليوم الرابع · المؤتمر الصحفي']));
  await expect(page.getByTestId('experience-rehearsal')).toContainText('تسلسل مرشح للمراجعة، وليس محاكاة تشغيلية حية');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  const forbidden = ['360 متاح', 'جولة 360', 'معتمد هندسيًا', 'جاهز تشغيليًا', 'تتبع لحظي', 'خريطة الزائر النهائية', 'التصميم المنفذ', 'As-built', 'Digital Twin live'];
  const body = await page.locator('body').innerText();
  forbidden.forEach((claim) => expect(body).not.toContain(claim));
  expect(body.replaceAll('لا مسار معتمد', '')).not.toContain('مسار معتمد');
  expect(body.replaceAll('لا توجد بيانات تشغيلية حية', '')).not.toContain('بيانات حية');
  expect(errors).toEqual([]);
});

test('switches scenarios, days, personas, and lenses without inventing a fallback journey', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(experienceUrl);
  await expectKapExperience(page);
  await openExperienceSpace(page);

  await page.getByTestId('experience-scenario-select').selectOption('SCENARIO-KAP-CELEBRATORY-2026');
  await expect(page.getByTestId('experience-day-select')).toBeDisabled();
  await expect(page.getByTestId('experience-rehearsal')).toContainText('لم تُفصّل له أيام أو رحلة');
  await expect(page.locator('.experience-scenario-fact')).toContainText('700');
  await expect(page.locator('.experience-scenario-fact')).toContainText('مشاركة المجتمع وتقدير الداعمين');

  await page.getByTestId('experience-scenario-select').selectOption('SCENARIO-KAP-BASIC-2026');
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-11-01');
  await expect(page.getByTestId('experience-site-context')).toContainText('قصر العوجا + حدائق الملك عبدالله');
  await expect(page.getByTestId('experience-site-context')).toContainText('سياقان احتفاليان منفصلان · لا رحلة أو انتقال مشترك');
  await expect(page.getByTestId('experience-day-attendance')).toContainText('الحضور غير محدد');

  await expect(page.getByTestId('experience-persona-select').locator('option[value="PERSONA-KAP-REGIONAL-LEADERSHIP"]')).toHaveCount(0);
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-11-01');
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-11-02');
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-11-02');
  await expect(page.getByTestId('experience-rehearsal')).toContainText('زيارة أمير منطقة الرياض');
  await expect(page).toHaveURL(/persona=PERSONA-KAP-REGIONAL-LEADERSHIP/);

  await page.getByTestId('experience-lens-select').selectOption('operations');
  await expect(page).toHaveURL(/lens=operations/);
  await page.getByTestId('experience-lens-select').selectOption('readiness-and-decisions');
  await page.keyboard.press('Escape');
  await page.getByTestId('experience-inspector-toggle').click();
  await expect(page.getByTestId('experience-inspector')).toContainText('لا يمكن تحديدها');
  await expect(page.getByTestId('experience-inspector')).toContainText('لا توجد قرارات قانونية مرتبطة');
  expect(errors).toEqual([]);
});

test('synchronizes timeline, exact map markers, inspector, scene, and URL', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(`${experienceUrl.replace('mapMode=illustrated', 'mapMode=operational')}`);
  await expectKapExperience(page);
  await expect(page.locator('[data-testid^="experience-marker-ENTITY-KAP-OP-"]')).toHaveCount(11);
  await expect(page.getByTestId('experience-marker-ENTITY-KAP-OP-001')).toHaveAttribute('aria-pressed', 'true');

  const marker6 = page.getByTestId('experience-marker-ENTITY-KAP-OP-006');
  await marker6.click();
  await expect(marker6).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('experience-marker-ENTITY-KAP-OP-007')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('experience-inspector')).toContainText('ممر العصور');
  await expect(page).toHaveURL(/entity=ENTITY-KAP-OP-006/);
  await expect(page).toHaveURL(/step=STEP-KAP-PREOPEN-AGES/);
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-AGES')).toHaveAttribute('aria-current', 'step');

  const marker7 = page.getByTestId('experience-marker-ENTITY-KAP-OP-007');
  await marker7.press('Enter');
  await expect(marker7).toHaveAttribute('aria-pressed', 'true');
  await expect(marker6).toHaveAttribute('aria-pressed', 'false');
  await expect(page).toHaveURL(/entity=ENTITY-KAP-OP-007/);
  await expect(page.getByTestId('experience-inspector')).toContainText('العشاء');

  await page.getByTestId('experience-step-STEP-KAP-PREOPEN-PHOTO').click();
  await expect(page).toHaveURL(/step=STEP-KAP-PREOPEN-PHOTO/);
  await expect(page).toHaveURL(/scene=SCENE-KAP-P8/);
  await expect(page.getByTestId('experience-marker-ENTITY-KAP-OP-009')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('runs, pauses, advances, rewinds, jumps, and restarts only the authored rehearsal sequence', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(experienceUrl);
  await expectKapExperience(page);
  const current = page.locator('[data-testid^="experience-step-"][aria-current="step"]');
  await expect(current).toContainText('الاستقبال');

  await page.getByRole('button', { name: 'تشغيل البروفة' }).click();
  await expect(page.getByRole('button', { name: 'إيقاف البروفة مؤقتًا' })).toBeVisible();
  await page.getByRole('button', { name: 'إيقاف البروفة مؤقتًا' }).click();
  await expect(page.getByRole('button', { name: 'تشغيل البروفة' })).toBeVisible();
  await page.getByRole('button', { name: 'الخطوة التالية' }).click();
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-MODEL')).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'الخطوة التالية' }).click();
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-AGES')).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'الخطوة السابقة' }).click();
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-MODEL')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('experience-step-STEP-KAP-PREOPEN-RECOGNITION').click();
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-RECOGNITION')).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'إعادة البروفة' }).click();
  await expect(page.getByTestId('experience-step-STEP-KAP-PREOPEN-ARRIVAL')).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('experience-twin-workspace')).toHaveAttribute('data-package-status', 'candidate');
  expect(errors).toEqual([]);
});

test('shows source previews only as candidate design, keeps 360 absent, and loads only the verified Web3D derivative', async ({ page }) => {
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+qX6uWQAAAABJRU5ErkJggg==', 'base64');
  await page.route('**/local-assets/experience/**', async (route) => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }));
  await page.goto(experienceUrl);
  await expectKapExperience(page);
  await expect(page.locator('.experience-illustrated-map img')).toBeVisible();
  await expect(page.getByTestId('experience-scene-panel')).toContainText('تصميم مرشح من مصدر مقدم من المؤسس');

  await openExperienceSpace(page);
  await page.getByTestId('experience-map-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('مشاهد 360° قيد التسليم من استوديو التصميم');
  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');

  await openExperienceSpace(page);
  await page.getByRole('button', { name: 'التأليف المرشح' }).click();
  const editor = page.getByRole('textbox', { name: 'JSON حزمة التجربة' });
  const pack = JSON.parse(await editor.inputValue()) as { sceneAssets: Array<Record<string, unknown>> };
  const map = pack.sceneAssets.find((asset) => asset.assetId === 'SCENE-KAP-P52')!;
  map.medium = 'panorama-equirectangular';
  map.orientation = { projection: 'perspective', headingDegrees: null };
  map.dimensions = { width: 1600, height: 900, unit: 'pixel', status: 'source-reported' };
  await editor.fill(JSON.stringify(pack));
  await page.getByRole('button', { name: 'تحقق' }).click();
  await expect(page.getByTestId('experience-authoring-drawer').locator('output')).toContainText('التحقق محجوب');
  await expect(page.getByTestId('experience-authoring-drawer').locator('output')).toContainText('2:1');
  await expect(page.getByTestId('experience-authoring-drawer')).toContainText('لا يوجد زر تفعيل');
});

test('keeps unresolved show moments unanchored and 1 November without a shared journey', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(experienceUrl);
  await expectKapExperience(page);
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-11-01');
  await openExperienceSpace(page);
  await page.getByTestId('experience-map-mode-operational').click();
  await page.getByTestId('experience-step-STEP-KAP-ROYAL-MAIN-SHOW').click();
  await expect(page.getByTestId('experience-show-unresolved')).toContainText('غير محسوم مكانيًا');
  await expect(page.getByTestId('experience-show-unresolved')).toContainText('لا توجد مرساة أو نقطة بديلة');
  await expect(page).not.toHaveURL(/entity=/);
  await expect(page.locator('[data-testid^="experience-marker-ENTITY-KAP-OP-"][aria-pressed="true"]')).toHaveCount(0);
  await openExperienceSpace(page);
  await expect(page.getByTestId('experience-site-context')).toContainText('سياقان احتفاليان منفصلان · لا رحلة أو انتقال مشترك');
  await expect(page.getByTestId('experience-day2-no-operational-journey')).toContainText('لا رحلة تشغيلية');
  expect(errors).toEqual([]);
});

test('restores deep links and history while rejecting foreign context without a demo fallback', async ({ page }) => {
  const errors = monitorPage(page);
  const day4 = experienceUrl
    .replace('DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-03')
    .replace('PERSONA-KAP-EMPLOYEE-FAMILY', 'PERSONA-KAP-MEDIA-CONTENT')
    .replace('JOURNEY-KAP-PREOPEN-2026', 'JOURNEY-KAP-PRESS-2026')
    .replace('STEP-KAP-PREOPEN-ARRIVAL', 'STEP-KAP-PRESS-ARRIVAL');
  await page.goto(day4);
  await expectKapExperience(page);
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-11-03');
  await page.getByTestId('experience-day-select').selectOption('DAY-KAP-2026-10-31');
  await page.goBack();
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-11-03');
  await page.goForward();
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-10-31');
  await page.reload();
  await expect(page.getByTestId('experience-day-select')).toHaveValue('DAY-KAP-2026-10-31');

  await page.goto(`${experienceUrl}&entity=ENTITY-FOREIGN-999&scene=SCENE-FOREIGN-999`);
  await expectKapExperience(page);
  await expect(page).not.toHaveURL(/ENTITY-FOREIGN|SCENE-FOREIGN/);

  await page.goto('/?workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-KAP-001');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.getByTestId('portfolio-context-message')).toContainText('لا تنتمي إلى المشروع');
  expect(errors).toEqual([]);
});

test('uses the same workspace for a fictional conference without KAP leakage', async ({ page }) => {
  const errors = monitorPage(page);
  await page.goto(conferenceUrl);
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001');
  await expect(workspace).toContainText('مرجع خيالي بلا تاريخ تشغيلي');
  const text = await workspace.innerText();
  expect(text).not.toContain('KAP');
  expect(text).not.toContain('حدائق الملك عبدالله');
  expect(text).not.toContain('ENTITY-KAP');
  await expect(page.getByTestId('story-map-shell')).toBeVisible();
  expect(errors).toEqual([]);
});

test('preserves keyboard focus, reduced motion, and full-viewport RTL layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${experienceUrl.replace('mapMode=illustrated', 'mapMode=operational')}`);
  await expectKapExperience(page);
  const firstMarker = page.getByTestId('experience-marker-ENTITY-KAP-OP-001');
  await firstMarker.focus();
  await expect(firstMarker).toBeFocused();
  await firstMarker.press('Enter');
  await expect(firstMarker).toHaveAttribute('aria-pressed', 'true');
  await expect(firstMarker).toHaveCSS('transition-duration', '0s');
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
  expect([1366, 1920, 2560]).toContain(dimensions.width);
  expect(dimensions.height).toBeGreaterThanOrEqual(768);
});
