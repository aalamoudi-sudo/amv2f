import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const assetPath = '/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/DESIGN-ASSET-KAP-DIRECT-MESH-001.glb';
const baseSelection = [
  'workspace=experience-twin',
  scope,
  'experienceMode=scenes',
  'day=DAY-KAP-2026-10-31',
  'persona=PERSONA-KAP-EMPLOYEE-FAMILY',
  'journey=JOURNEY-KAP-PREOPEN-2026',
  'step=STEP-KAP-PREOPEN-AGES',
  'entity=ENTITY-KAP-OP-006',
  'zone=ZONE-AGES-TUNNEL-001',
  'scene=DESIGN-ASSET-KAP-DIRECT-MESH-001',
  'sceneView=model-3d',
  'mapMode=web3d',
  'viewMode=scene-focus',
  'designLens=experience',
  'designViewpoint=DESIGN-VIEW-KAP-OVERVIEW',
  'designQuality=balanced'
].join('&');
const designUrl = `/?${baseSelection}`;

async function expectLoadedDesign(page: Page) {
  const surface = page.getByTestId('scene-web3d-surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-canvas').locator('canvas')).toBeVisible();
  return surface;
}

test('loads the verified real derivative and keeps the design truth visible', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'blob:') return;
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
  await page.goto(designUrl);
  const surface = await expectLoadedDesign(page);

  await expect(surface).toHaveAttribute('data-quality-profile', 'balanced');
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-OVERVIEW');
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('الجاهزية التشغيلية: لا يمكن تحديدها');
  await expect(page.getByTestId('scene-technical-fixture-label')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('exposes deterministic camera controls and pointer interaction stops the tour', async ({ page }) => {
  await page.goto(designUrl);
  const surface = await expectLoadedDesign(page);

  await page.getByTestId('design-scene-zoom-in').click();
  await expect(surface).toHaveAttribute('data-zoom-factor', '0.820');
  const canvas = page.getByTestId('design-scene-canvas');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(surface).toHaveAttribute('data-pan-x', '0.040');
  await page.getByTestId('design-scene-fit').click();
  await expect(surface).toHaveAttribute('data-zoom-factor', '1.000');
  await expect(surface).toHaveAttribute('data-pan-x', '0.000');

  await page.getByTestId('design-viewpoint-top').click();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-TOP');
  await expect(page).toHaveURL(/designViewpoint=DESIGN-VIEW-KAP-TOP/);
  await page.getByTestId('design-viewpoint-isometric').click();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-ISOMETRIC');

  await page.getByTestId('design-tour-toggle').click();
  await expect(surface).toHaveAttribute('data-tour-playing', 'true');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.48, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.58, box!.y + box!.height * 0.54, { steps: 4 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute('data-tour-playing', 'false');
  await expect(page).not.toHaveURL(/designTour=playing/);
});

test('keeps viewpoint, day and persona context through navigation and reload', async ({ page }) => {
  await page.goto(designUrl);
  const surface = await expectLoadedDesign(page);
  await page.getByTestId('design-viewpoint-top').click();
  await page.getByTestId('design-tour-stop-4').click();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-MID');
  await page.goBack();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-TOP');
  await page.goForward();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-MID');
  await expect(page).toHaveURL(/designViewpoint=DESIGN-VIEW-KAP-MID/);
  await page.reload();
  await expectLoadedDesign(page);
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-MID');
  await expect(page.getByTestId('experience-scene-viewer')).toContainText('اليوم الأول');
  await expect(page.getByTestId('experience-scene-viewer')).toContainText('الموظفون وعائلاتهم');
});

test('switches all design lenses, client mode and truth disclosure without promoting authority', async ({ page }) => {
  await page.goto(designUrl);
  await expectLoadedDesign(page);
  for (const lens of ['structure', 'truth', 'command', 'experience'] as const) {
    await page.getByTestId(`design-lens-${lens}`).click();
    await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-design-lens', lens);
  }

  await page.getByRole('button', { name: 'حقيقة التصميم', exact: true }).click();
  const truth = page.getByTestId('scene-truth-details');
  await expect(truth).toBeVisible();
  await expect(page).toHaveURL(/designTruth=open/);
  await expect(truth).toContainText('نية التصميم معتمدة من المؤسس');
  await expect(truth).toContainText('ربط مرشح بممر العصور — يحتاج تأكيد الهوية');
  await expect(truth).toContainText('بانوراما 360 غير متوفرة لهذا المشهد');
  await expect(truth).toContainText('لا يمكن تحديدها');
  await page.reload();
  await expectLoadedDesign(page);
  await expect(page.getByTestId('scene-truth-details')).toBeVisible();

  await page.getByTestId('design-client-mode-toggle').click();
  const presentation = page.getByTestId('design-client-presentation');
  await expect(presentation).toBeVisible();
  await expect(page.getByTestId('design-client-truth-badge')).toContainText('تصميم معتمد النية · مشتق غير مسجل');
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-PRESENTATION');
  await expect(page.locator('.scene-web3d-toolbar')).toHaveCount(0);
  await expect(page.locator('.scene-web3d-tour')).toHaveCount(0);
  await expect(presentation).not.toContainText('Source SHA');
  const canvasBox = await page.getByTestId('design-scene-canvas').boundingBox();
  const dockBox = await presentation.boundingBox();
  const viewport = page.viewportSize();
  expect(canvasBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(canvasBox!.height).toBeGreaterThanOrEqual(viewport!.height * 0.7);
  expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);
  await page.getByTestId('design-client-truth-badge').click();
  await expect(page.getByTestId('scene-truth-details')).toContainText('لا يمكن تحديدها');
  await page.getByTestId('design-client-exit').click();
  await expect(presentation).toHaveCount(0);
});

test('keeps panorama unavailable and reports missing or altered local assets safely', async ({ page }) => {
  test.info().annotations.push({ type: 'expected-browser-error', description: 'Failed to load resource: the server responded with a status of 404' });
  await page.goto(designUrl);
  await expectLoadedDesign(page);
  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('بانوراما 360 غير متوفرة لهذا المشهد');

  await page.route(`**${assetPath}`, (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' }));
  await page.goto(designUrl);
  await expect(page.getByTestId('scene-load-state')).toContainText('ملف المشهد المحلي غير موجود');
  await page.unroute(`**${assetPath}`);

  await page.route(`**${assetPath}`, (route) => route.fulfill({
    status: 200,
    contentType: 'model/gltf-binary',
    body: Buffer.alloc(3_050_340, 1)
  }));
  await page.goto(designUrl);
  await expect(page.getByTestId('scene-load-state')).toContainText('بصمة ملف المشهد لا تطابق السجل');
  await expect(page.getByTestId('scene-web3d-surface')).toHaveCount(0);
});

test('keeps 1 November route-not-applicable while showing its ceremony context and shared design geometry', async ({ page }) => {
  const dayTwoUrl = designUrl
    .replace('DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-01')
    .replace('PERSONA-KAP-EMPLOYEE-FAMILY', 'PERSONA-KAP-ROYAL-VIP')
    .replace('JOURNEY-KAP-PREOPEN-2026', 'JOURNEY-KAP-ROYAL-2026')
    .replace('STEP-KAP-PREOPEN-AGES', 'STEP-KAP-ROYAL-MAIN-SHOW');
  await page.goto(dayTwoUrl);
  await expectLoadedDesign(page);
  await expect(page.getByTestId('experience-scene-viewer')).toContainText('اليوم الثاني');
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true');

  await page.goto(`/?workspace=experience-twin&${scope}&experienceMode=days`);
  const days = page.getByTestId('experience-review-days-workspace');
  const dayCard = days.getByRole('button').filter({ hasText: 'التدشين الملكي' });
  await expect(dayCard).toContainText('غير منطبق · لا رحلة تشغيلية');
  await expect(days).not.toContainText('انتقال غير معروف');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('الجاهزية التشغيلية: لا يمكن تحديدها');
});

test('enters and exits fullscreen without losing the scene', async ({ page }) => {
  await page.goto(designUrl);
  await expectLoadedDesign(page);
  const viewer = page.getByTestId('experience-scene-viewer');
  await viewer.getByRole('button', { name: 'ملء الشاشة' }).first().click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await viewer.getByRole('button', { name: 'إنهاء ملء الشاشة' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expectLoadedDesign(page);
});
