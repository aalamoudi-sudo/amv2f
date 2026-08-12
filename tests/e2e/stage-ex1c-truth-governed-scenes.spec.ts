import { expect, test, type Page } from '@playwright/test';

const kapScope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const kapUrl = `/?workspace=experience-twin&${kapScope}&scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&landmark=LANDMARK-KAP-ARRIVAL&lens=experience&mapMode=story&viewMode=split`;
const conferenceUrl = '/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001&scenario=SCENARIO-CONFERENCE-FICTIONAL-01&day=DAY-CONFERENCE-FICTIONAL-01&persona=PERSONA-CONFERENCE-FICTIONAL-GUEST&journey=JOURNEY-CONFERENCE-FICTIONAL-01&step=STEP-CONFERENCE-FICTIONAL-ARRIVAL&mapMode=story&viewMode=split';

function monitorPage(page: Page) {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'blob:') return;
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
  return { errors, externalRequests };
}

async function openSceneFocus(page: Page) {
  await expect(page.getByTestId('experience-scene-viewer')).toBeVisible();
  const focus = page.getByRole('button', { name: /تركيز المشهد/ });
  if (await focus.isVisible()) await focus.click();
  await expect(page.getByTestId('experience-scene-viewer')).toBeVisible();
}

test('KAP synchronizes context and fails safely when the optional private flat preview is absent', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(kapUrl);
  await openSceneFocus(page);
  const viewer = page.getByTestId('experience-scene-viewer');
  await expect(viewer).toContainText('اليوم الأول');
  await expect(viewer).toContainText('الموظفون وعائلاتهم');
  await expect(viewer).toContainText('تصميم مرشح');
  await expect(page.getByTestId('scene-load-state')).toContainText('ملف المشهد المحلي غير موجود');
  await expect(page).toHaveURL(/touchpoint=TOUCHPOINT-DAY-KAP-/);
  await expect(page).toHaveURL(/scene=SCENE-KAP-/);
  await expect(viewer).not.toContainText('تجربة 360° متاحة');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(monitor.errors).toEqual([]);
  expect(monitor.externalRequests).toEqual([]);
});

test('KAP keeps panorama missing and loads only the verified candidate GLB derivative', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(kapUrl);
  await openSceneFocus(page);
  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('مشاهد 360° قيد التسليم من استوديو التصميم');
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('بانوراما 360 غير متوفرة لهذا المشهد');
  await expect(page).toHaveURL(/sceneView=source-missing/);

  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('نموذج تقني خيالي للاختبار');
  expect(body).not.toContain('SCENE-CONFERENCE');
  expect(monitor.errors).toEqual([]);
  expect(monitor.externalRequests).toEqual([]);
});

test('Story Map landmark selection opens the matching scene and preserves URL restoration', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(kapUrl);
  await page.getByTestId('story-landmark-LANDMARK-KAP-AGES-CORRIDOR').click();
  await expect(page).toHaveURL(/step=STEP-KAP-PREOPEN-AGES/);
  await expect(page).toHaveURL(/touchpoint=TOUCHPOINT-DAY-KAP-2026-10-31-AGES/);
  await openSceneFocus(page);
  await expect(page.getByTestId('experience-scene-viewer')).toContainText('ممر العصور');
  const restoredUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(restoredUrl);
  await expect(page.getByTestId('experience-scene-viewer')).toContainText('ممر العصور');
  expect(monitor.errors).toEqual([]);
});

test('temporary-demo renders a true 2:1 panorama and hotspot navigation into GLB', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(conferenceUrl);
  await openSceneFocus(page);
  const viewer = page.getByTestId('experience-scene-viewer');
  await expect(viewer).toContainText('نموذج تقني خيالي للاختبار');
  await page.getByTestId('scene-mode-panorama').click();
  const panorama = page.getByTestId('scene-panorama-surface');
  await expect(panorama).toBeVisible();
  await panorama.locator('[role="application"]').focus();
  await panorama.locator('[role="application"]').press('ArrowLeft');
  await expect(page.getByTestId('scene-hotspot-list')).toContainText('افتح النموذج الثلاثي التقني');
  await page.getByTestId('scene-hotspot-list').getByRole('button', { name: /افتح النموذج الثلاثي التقني/ }).click();
  await expect(page).toHaveURL(/scene=SCENE-CONFERENCE-FICTIONAL-GLB/);
  await expect(page).toHaveURL(/hotspot=HOTSPOT-CONFERENCE-TO-GLB/);
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true');
  await page.getByRole('button', { name: 'واجهة' }).click();
  await page.getByRole('button', { name: 'ملاءمة الكل' }).click();
  await expect(viewer).toContainText('نموذج تقني خيالي للاختبار');
  expect(monitor.errors).toEqual([]);
  expect(monitor.externalRequests).toEqual([]);
});

test('comparison distinguishes compatible slider from incompatible camera pose', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(conferenceUrl);
  await openSceneFocus(page);
  await page.getByTestId('scene-comparison-select').selectOption('COMPARE-CONFERENCE-FICTIONAL-DESIGN');
  await expect(page.getByTestId('scene-comparison-slider')).toBeVisible();
  await page.getByLabel('فاصل المقارنة').fill('68');
  await page.getByTestId('scene-comparison-select').selectOption('COMPARE-CONFERENCE-FICTIONAL-INCOMPATIBLE-POSE');
  await expect(page.getByTestId('scene-comparison')).toContainText('زاوية التصوير غير متوافقة؛ المقارنة البكسلية غير صالحة.');
  await expect(page.getByTestId('scene-comparison-slider')).toHaveCount(0);
  expect(monitor.errors).toEqual([]);
});

test('operational lens reads existing readiness, decisions and evidence without mutation', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(kapUrl);
  await openSceneFocus(page);
  const viewer = page.getByTestId('experience-scene-viewer');
  await viewer.getByRole('button', { name: 'عدسة الحقيقة التشغيلية' }).click();
  await viewer.getByRole('button', { name: 'الجاهزية' }).click();
  await expect(page.getByTestId('scene-context-readiness')).toContainText('لا يمكن تحديد الجاهزية');
  await viewer.getByRole('button', { name: 'القرارات' }).click();
  await expect(page.getByTestId('scene-context-decisions')).toContainText('لا توجد قرارات قانونية مرتبطة');
  await viewer.getByRole('button', { name: 'الأدلة' }).click();
  await expect(page.getByTestId('scene-context-evidence')).toContainText('لا يوجد دليل قانوني مرتبط');
  await page.reload();
  await expect(page).toHaveURL(/sceneTruthLens=operational-truth/);
  const text = await page.getByTestId('experience-twin-workspace').innerText();
  expect(text).not.toContain('0% جاهزية');
  expect(text).not.toContain('جاهز تشغيليًا');
  expect(monitor.errors).toEqual([]);
});

test('scene authoring validates, quarantines and restores without activation controls', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.goto(conferenceUrl);
  await openSceneFocus(page);
  await page.getByRole('button', { name: /إدخال وتأليف/ }).click();
  const panel = page.getByTestId('scene-authoring-panel');
  await expect(panel).toContainText('محلي ومرشح فقط');
  await panel.getByRole('button', { name: /تحقق/ }).click();
  await expect(panel).toContainText('البيان صالح');
  await panel.getByRole('button', { name: /عزل/ }).click();
  await expect(panel).toContainText('عُزلت المعاينة محليًا');
  await panel.getByRole('button', { name: /استعادة R1/ }).click();
  await expect(panel).toContainText('عادت المعاينة إلى R1');
  await expect(panel.getByRole('button', { name: /تفعيل|اعتماد/ })).toHaveCount(0);
  expect(monitor.errors).toEqual([]);
});

test('mobile-sized layout does not auto-load a GLB and remains horizontally safe', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(conferenceUrl);
  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByText('النموذج لا يُحمّل تلقائيًا على الهاتف')).toBeVisible();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(monitor.errors).toEqual([]);
});

test('missing local preview fails safely and project switching never restores a foreign scene', async ({ page }) => {
  const monitor = monitorPage(page);
  await page.route('**/local-assets/experience/kap/page-08.png', (route) => route.abort());
  await page.goto(kapUrl);
  await openSceneFocus(page);
  await expect(page.getByTestId('scene-load-state')).toContainText(/تعذر تحميل|إعادة المحاولة/);
  await page.goto(`${conferenceUrl}&scene=SCENE-CONFERENCE-FICTIONAL-PANORAMA&sceneView=panorama-360`);
  await expect(page.getByTestId('scene-panorama-surface')).toBeVisible();
  await page.goto(kapUrl);
  await expect(page).not.toHaveURL(/SCENE-CONFERENCE/);
  await expect(page.getByTestId('experience-twin-workspace')).not.toContainText('نموذج تقني خيالي للاختبار');
  expect(monitor.errors).toEqual([]);
});
