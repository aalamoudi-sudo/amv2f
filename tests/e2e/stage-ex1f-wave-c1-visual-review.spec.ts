import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './test-fixtures';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const assetPath = '/local-assets/experience-scenes/PROJECT-KAP-OPENING-2026/design/DESIGN-ASSET-KAP-DIRECT-MESH-001.glb';
const reviewRoot = process.env.EX1F_WAVEC1_REVIEW_DIR ?? path.join(process.cwd(), 'artifacts', 'stage-ex1f-wave-c1-review');
const selection = {
  day: 'DAY-KAP-2026-10-31',
  persona: 'PERSONA-KAP-EMPLOYEE-FAMILY',
  journey: 'JOURNEY-KAP-PREOPEN-2026',
  step: 'STEP-KAP-PREOPEN-AGES'
};

function designUrl(overrides: Partial<typeof selection> = {}): string {
  const context = { ...selection, ...overrides };
  return `/?workspace=experience-twin&${scope}&experienceMode=scenes&day=${context.day}&persona=${context.persona}&journey=${context.journey}&step=${context.step}&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001&scene=DESIGN-ASSET-KAP-DIRECT-MESH-001&sceneView=model-3d&mapMode=web3d&viewMode=scene-focus&designLens=experience&designViewpoint=DESIGN-VIEW-KAP-OVERVIEW&designQuality=balanced`;
}

async function waitForModel(page: Page): Promise<void> {
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
}

async function capture(page: Page, testInfo: TestInfo, filename: string): Promise<void> {
  const viewport = page.viewportSize();
  const dimensions = viewport ? `${viewport.width}x${viewport.height}` : testInfo.project.name;
  const directory = path.join(reviewRoot, 'screenshots', dimensions);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, filename), fullPage: false, animations: 'disabled', caret: 'hide' });
}

async function selectViewpoint(page: Page, testId: string, viewpointId: string): Promise<void> {
  await page.getByTestId(testId).click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-viewpoint-id', viewpointId);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function selectLens(page: Page, lens: 'experience' | 'structure' | 'truth' | 'command'): Promise<void> {
  await page.getByTestId(`design-lens-${lens}`).click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-design-lens', lens);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('captures the complete Wave C.1 design review', async ({ page }, testInfo) => {
  test.info().annotations.push({ type: 'expected-browser-error', description: 'Failed to load resource: the server responded with a status of 404' });

  await page.goto(`/?workspace=experience-twin&${scope}&experienceMode=overview`);
  await expect(page.getByTestId('experience-review-overview')).toBeVisible();
  await capture(page, testInfo, '01-experience-twin-premium-entry.png');

  await page.goto(designUrl());
  await waitForModel(page);
  await capture(page, testInfo, '02-real-design-scene-loaded.png');

  await selectViewpoint(page, 'design-viewpoint-presentation', 'DESIGN-VIEW-KAP-PRESENTATION');
  await capture(page, testInfo, '03-cinematic-overview.png');

  await selectViewpoint(page, 'design-viewpoint-top', 'DESIGN-VIEW-KAP-TOP');
  await capture(page, testInfo, '04-top-view.png');

  await selectViewpoint(page, 'design-viewpoint-isometric', 'DESIGN-VIEW-KAP-ISOMETRIC');
  await capture(page, testInfo, '05-isometric-view.png');

  await selectViewpoint(page, 'design-viewpoint-front', 'DESIGN-VIEW-KAP-FRONT');
  await selectLens(page, 'experience');
  await capture(page, testInfo, '06-experience-design-lens.png');

  await selectLens(page, 'structure');
  await capture(page, testInfo, '07-structure-lens.png');

  await selectLens(page, 'truth');
  await capture(page, testInfo, '08-truth-lens.png');

  await selectLens(page, 'command');
  await capture(page, testInfo, '09-command-lens.png');

  await page.getByTestId('design-tour-toggle').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-tour-playing', 'true');
  await capture(page, testInfo, '10-design-camera-tour-playing.png');

  await selectViewpoint(page, 'design-tour-stop-3', 'DESIGN-VIEW-KAP-SECTION-01');
  await capture(page, testInfo, '11-selected-viewpoint.png');

  await page.goto(designUrl());
  await waitForModel(page);
  await selectViewpoint(page, 'design-tour-stop-2', 'DESIGN-VIEW-KAP-ENTRANCE');
  await capture(page, testInfo, '12-october-31-employee-context.png');

  await page.goto(designUrl({
    day: 'DAY-KAP-2026-11-02',
    persona: 'PERSONA-KAP-REGIONAL-LEADERSHIP',
    journey: 'JOURNEY-KAP-REGIONAL-2026',
    step: 'STEP-KAP-REGIONAL-AGES'
  }));
  await waitForModel(page);
  await selectViewpoint(page, 'design-viewpoint-midpoint', 'DESIGN-VIEW-KAP-MID');
  await capture(page, testInfo, '13-november-2-vip-context.png');

  await page.goto(designUrl({
    day: 'DAY-KAP-2026-11-03',
    persona: 'PERSONA-KAP-MEDIA-CONTENT',
    journey: 'JOURNEY-KAP-PRESS-2026',
    step: 'STEP-KAP-PRESS-AGES'
  }));
  await waitForModel(page);
  await selectViewpoint(page, 'design-tour-stop-5', 'DESIGN-VIEW-KAP-ENDING');
  await capture(page, testInfo, '14-november-3-media-context.png');

  await page.goto(designUrl({
    day: 'DAY-KAP-2026-11-01',
    persona: 'PERSONA-KAP-ROYAL-VIP',
    journey: 'JOURNEY-KAP-ROYAL-2026',
    step: 'STEP-KAP-ROYAL-MAIN-SHOW'
  }));
  await waitForModel(page);
  await capture(page, testInfo, '15-november-1-route-not-applicable.png');

  await page.goto(designUrl());
  await waitForModel(page);
  await selectViewpoint(page, 'design-viewpoint-top', 'DESIGN-VIEW-KAP-TOP');
  await page.getByRole('button', { name: 'حقيقة التصميم', exact: true }).click();
  await expect(page.getByTestId('scene-truth-details')).toContainText('ربط مرشح بممر العصور');
  await capture(page, testInfo, '16-proposed-mamar-relation.png');
  await page.getByRole('button', { name: 'إغلاق تفاصيل المشهد' }).click();

  await page.getByTestId('design-client-mode-toggle').click();
  await capture(page, testInfo, '17-client-presentation-mode.png');
  await page.getByTestId('design-client-exit').click();

  await page.getByTestId('experience-scene-viewer').getByRole('button', { name: 'ملء الشاشة' }).first().click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await capture(page, testInfo, '18-fullscreen-design.png');
  await page.getByRole('button', { name: 'إنهاء ملء الشاشة' }).click();

  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toBeVisible();
  await capture(page, testInfo, '19-missing-360.png');

  await page.route(`**${assetPath}`, (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' }));
  await page.goto(designUrl());
  await expect(page.getByTestId('scene-load-state')).toContainText('ملف المشهد المحلي غير موجود');
  await capture(page, testInfo, '20-missing-asset-safe-state.png');
  await page.unroute(`**${assetPath}`);

  await page.route(`**${assetPath}`, (route) => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: Buffer.alloc(3_050_340, 1) }));
  await page.goto(designUrl());
  await expect(page.getByTestId('scene-load-state')).toContainText('بصمة ملف المشهد لا تطابق السجل');
  await capture(page, testInfo, '21-hash-mismatch-rejection.png');
  await page.unroute(`**${assetPath}`);

  await page.goto(designUrl());
  await waitForModel(page);
  await page.getByRole('button', { name: 'حقيقة التصميم', exact: true }).click();
  await expect(page.getByTestId('scene-truth-details')).toContainText('Source SHA');
  await capture(page, testInfo, '22-technical-truth-drawer.png');

  await page.getByRole('button', { name: 'إغلاق تفاصيل المشهد' }).click();
  await selectViewpoint(page, 'design-tour-stop-1', 'DESIGN-VIEW-KAP-OVERVIEW');
  await selectLens(page, 'experience');
  await page.getByTestId('design-scene-zoom-in').click();
  await page.getByTestId('design-scene-zoom-in').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-zoom-factor', '0.672');
  await capture(page, testInfo, '23-responsive-density.png');

  await page.goto(`/?workspace=experience-twin&${scope}&experienceMode=delivery&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY`);
  await expect(page.getByTestId('experience-integrated-review')).toBeVisible();
  await capture(page, testInfo, '24-complete-experience-twin.png');
});
