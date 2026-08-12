import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const screenshotRoot = 'review-screenshots/mission-canvas-rc1b2/after';
mkdirSync(screenshotRoot, { recursive: true });

const scope = 'workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const journeyId = 'JOURNEY-KAP-20261031-WORKERS-V11';
const entryUrl = `/?${scope}&view=mission-entry&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&routeJourney=${journeyId}&routeWaypoint=${journeyId}-WP-A&entity=ENTITY-KAP-OP-001&zone=ZONE-ARRIVAL-001`;
const directWeb3dUrl = `/?${scope}&view=mission-web3d&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=${journeyId}&routeWaypoint=${journeyId}-WP-E`;
const directWorldUrl = `/?${scope}&view=mission-world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=${journeyId}&routeWaypoint=${journeyId}-WP-E`;
const directTruthUrl = `/?${scope}&view=mission-world&surface=truth-map&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=${journeyId}&routeWaypoint=${journeyId}-WP-E`;
const directExpandedUrl = `/?${scope}&view=mission-world&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&routeJourney=${journeyId}&routeWaypoint=${journeyId}-WP-O#journey-expanded`;

const waypointLetters = [...'ABCDEFGHIJKLMNO'];

async function focusJourneyExpansionFromNaturalPageFocus(page: Page) {
  const focusProgression = [
    page.getByRole('link', { name: 'تخطي إلى محتوى مساحة العمل' }),
    page.getByTestId('mission-truth-toggle'),
    page.getByRole('button', { name: 'العودة إلى المشاريع' }),
    page.getByRole('button', { name: 'الخريطة الحية', exact: true }),
    page.getByRole('button', { name: 'خريطة الحقيقة', exact: true }),
    page.getByTestId('mission-map-point-A'),
    page.getByTestId('mission-map-point-C'),
    page.getByTestId('mission-map-point-D'),
    page.getByTestId('mission-map-point-E'),
    page.getByTestId('mission-map-point-I'),
    page.getByTestId('mission-map-point-L'),
    page.getByRole('button', { name: 'اللحظة السابقة' }),
    page.getByTestId('mission-journey-play'),
    page.getByRole('button', { name: 'اللحظة التالية' }),
    page.getByTestId('mission-rail-waypoint-D'),
    page.getByTestId('mission-rail-waypoint-E'),
    page.getByTestId('mission-rail-waypoint-F'),
    page.getByTestId('mission-journey-expand')
  ];
  await expect(page.locator('body')).toBeFocused();
  for (const target of focusProgression) {
    await page.keyboard.press('Tab');
    await expect(target).toBeFocused();
  }
}

async function selectWaypointOWithKeyboardOnly(page: Page) {
  const expand = page.getByTestId('mission-journey-expand');
  await focusJourneyExpansionFromNaturalPageFocus(page);
  await page.keyboard.press('Enter');
  await expect(expand).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('mission-journey-rail')).toContainText('الرحلة ممتدة حتى O');

  for (const letter of [...waypointLetters].reverse()) {
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId(`mission-rail-waypoint-${letter}`)).toBeFocused();
  }
  for (const letter of waypointLetters.slice(1)) {
    await page.keyboard.press('ArrowDown');
    const focused = page.getByTestId(`mission-rail-waypoint-${letter}`);
    await expect(focused).toBeFocused();
    await expect(focused).toHaveCSS('outline-style', 'solid');
  }
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mission-canvas')).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-O`);
  await expect(page.getByTestId('mission-rail-waypoint-O')).toHaveAttribute('aria-current', 'step');
}

async function restoreWaypointEWithKeyboard(page: Page) {
  for (let index = 0; index < 10; index += 1) await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('mission-rail-waypoint-E')).toBeFocused();
  await page.keyboard.press('Enter');
  const canvas = page.getByTestId('mission-canvas');
  await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-E`);
  await expect(canvas).toHaveAttribute('data-step-id', 'STEP-KAP-PREOPEN-AGES');
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  await expect(canvas).toHaveAttribute('data-zone-id', 'ZONE-AGES-TUNNEL-001');
  await expect(canvas).toHaveAttribute('data-area-id', 'AREA-KAP-03');
}

async function expectNoOverlap(page: Page) {
  const action = await page.getByTestId('mission-reveal-next').boundingBox();
  const panel = await page.getByTestId('mission-lens-panel').boundingBox();
  expect(action).not.toBeNull();
  expect(panel).not.toBeNull();
  const overlaps = Boolean(action && panel
    && action.x < panel.x + panel.width
    && action.x + action.width > panel.x
    && action.y < panel.y + panel.height
    && action.y + action.height > panel.y);
  expect(overlaps).toBe(false);
}

test('captures RC1B.2 final visual acceptance across the persistent world', async ({ page }, testInfo) => {
  const externalRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('blob:') || url.startsWith('data:')) return;
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) externalRequests.push(url);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const projectName = testInfo.project.name;
  const capture = async (order: string, name: string) => page.screenshot({ path: `${screenshotRoot}/${projectName}-${order}-${name}.png`, animations: 'disabled' });

  await page.goto(entryUrl);
  const canvas = page.getByTestId('mission-canvas');
  const assertAgesContext = async () => {
    await expect(canvas).toHaveAttribute('data-day-id', 'DAY-KAP-2026-10-31');
    await expect(canvas).toHaveAttribute('data-persona-id', 'PERSONA-KAP-EMPLOYEE-FAMILY');
    await expect(canvas).toHaveAttribute('data-route-journey-id', journeyId);
    await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-E`);
    await expect(canvas).toHaveAttribute('data-step-id', 'STEP-KAP-PREOPEN-AGES');
    await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
    await expect(canvas).toHaveAttribute('data-zone-id', 'ZONE-AGES-TUNNEL-001');
    await expect(canvas).toHaveAttribute('data-area-id', 'AREA-KAP-03');
    await expect(canvas).toHaveAttribute('data-scene-id', 'DESIGN-ASSET-KAP-DIRECT-MESH-001');
    await expect(canvas).toHaveAttribute('data-relationship-status', 'proposed');
    await expect(canvas).toHaveAttribute('data-relationship-confidence', 'medium');
  };
  await expect(page.getByTestId('mission-living-entry')).toBeVisible();
  await expect(page).toHaveTitle('مَيادين | مركز قيادة العالم الحي للفعالية');
  await expect(page.getByRole('heading', { name: 'مشروع تدشين حدائق الملك عبدالله' })).toBeVisible();
  await expect(page.getByText('أربعة أيام')).toBeVisible();
  const entryArtwork = await page.locator('.mission-entry-artwork').boundingBox();
  const entryMask = await page.getByTestId('mission-entry-source-mask').boundingBox();
  expect(entryArtwork).not.toBeNull();
  expect(entryMask).not.toBeNull();
  expect((entryMask?.width ?? 0) / (entryArtwork?.width ?? 1)).toBeGreaterThanOrEqual(0.24);
  expect(Math.abs(((entryMask?.x ?? 0) + (entryMask?.width ?? 0)) - ((entryArtwork?.x ?? 0) + (entryArtwork?.width ?? 0)))).toBeLessThan(2);
  await expect(page.getByTestId('mission-entry-source-mask')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('mission-entry-presentation-artwork')).toHaveAttribute('data-source-marker-mask-count', '11');
  await expect(page.getByTestId('mission-entry-presentation-artwork')).toHaveAttribute('data-derivative-truth', 'presentation-only');
  await capture('01', 'cinematic-entry');

  await page.getByTestId('mission-start-journey').click();
  const worldStage = page.getByTestId('mission-world-stage');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'map');
  await expect(page.getByTestId('mission-map-point-E').locator('i')).toHaveText('E');
  await expect(page.locator('.mission-map-point i')).toHaveText(['A', 'C', 'D', 'E', 'I', 'L']);
  await expect(page.locator('.mission-story-line')).toHaveCount(0);

  await page.getByTestId('mission-journey-rail').getByRole('button', { name: /B نقطة النزول/ }).click();
  await expect(canvas).toHaveAttribute('data-entity-id', 'none');
  await expect(canvas).toHaveAttribute('data-zone-id', 'none');
  await expect(canvas).toHaveAttribute('data-step-id', 'none');
  await expect(page).not.toHaveURL(/step=/);
  await page.reload();
  await expect(canvas).toHaveAttribute('data-entity-id', 'none');
  await expect(canvas).toHaveAttribute('data-step-id', 'none');

  await page.getByTestId('mission-map-point-E').click();
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  await expect(canvas).toHaveAttribute('data-zone-id', 'ZONE-AGES-TUNNEL-001');
  await expect(canvas).toHaveAttribute('data-step-id', 'STEP-KAP-PREOPEN-AGES');
  await assertAgesContext();
  await expect(page).toHaveURL(new RegExp(`routeWaypoint=${journeyId}-WP-E`));
  await expect(page).toHaveURL(/view=mission-world/);
  expect(page.url().length).toBeLessThan(600);
  await expect(page.getByTestId('mission-world-map')).toHaveAttribute('data-source-legend', 'masked');
  await expect(page.getByTestId('mission-source-legend-mask')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('mission-living-presentation-artwork')).toHaveAttribute('data-source-marker-mask-count', '11');
  await expect(page.getByTestId('mission-living-presentation-artwork')).toHaveAttribute('data-mask-coordinate-space', 'intrinsic-image-pixels');
  const livingWorld = await worldStage.boundingBox();
  const livingMask = await page.getByTestId('mission-source-legend-mask').boundingBox();
  expect(livingWorld).not.toBeNull();
  expect(livingMask).not.toBeNull();
  expect((livingMask?.width ?? 0) / (livingWorld?.width ?? 1)).toBeGreaterThanOrEqual(0.285);
  expect(Math.abs(((livingMask?.x ?? 0) + (livingMask?.width ?? 0)) - ((livingWorld?.x ?? 0) + (livingWorld?.width ?? 0)))).toBeLessThan(2);
  await page.evaluate(() => { (window as unknown as { __missionWorldStage?: Element }).__missionWorldStage = document.querySelector('[data-testid="mission-world-stage"]') ?? undefined; });
  await capture('02', 'living-experience-map');

  await page.getByRole('button', { name: 'خريطة الحقيقة', exact: true }).click();
  await expect(page.getByTestId('mission-world-map')).toHaveAttribute('data-map-presentation', 'truth');
  await expect(page.getByTestId('mission-world-map')).toHaveAttribute('data-source-legend', 'visible');
  await expect(page.locator('.mission-source-legend-mask')).toHaveCount(0);
  await expect(page.getByTestId('mission-living-presentation-artwork')).toHaveCount(0);
  await expect(page.getByTestId('mission-truth-source-artwork')).toHaveAttribute('data-source-sha256', '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772');
  await expect(page.locator('[data-testid^="mission-map-point-"]')).toHaveCount(0);
  const truthRail = await page.getByTestId('mission-journey-rail').boundingBox();
  const truthWorld = await worldStage.boundingBox();
  const truthMode = await page.locator('.mission-map-mode').boundingBox();
  expect(truthRail).not.toBeNull();
  expect(truthWorld).not.toBeNull();
  expect(truthMode).not.toBeNull();
  expect((truthRail?.x ?? 0) + (truthRail?.width ?? 0)).toBeLessThan((truthWorld?.x ?? 0) + (truthWorld?.width ?? 0) * 0.6);
  expect((truthMode?.x ?? 0) + (truthMode?.width ?? 0)).toBeLessThan((truthWorld?.x ?? 0) + (truthWorld?.width ?? 0) * 0.7);
  await capture('03', 'truth-map-source-legend');

  await page.getByRole('button', { name: 'العودة للخريطة الحية' }).click();
  await expect(page.getByTestId('mission-world-map')).toHaveAttribute('data-map-presentation', 'living');
  await expect(page.locator('.mission-source-legend-mask')).toBeVisible();
  await page.getByTestId('mission-journey-expand').click();
  await page.getByTestId('mission-rail-waypoint-O').click();
  await expect(page.getByTestId('mission-rail-waypoint-O')).toHaveAttribute('aria-current', 'step');
  const waypointO = await page.getByTestId('mission-rail-waypoint-O').boundingBox();
  const railSequence = await page.locator('.mission-journey-rail-sequence').boundingBox();
  expect(waypointO).not.toBeNull();
  expect(railSequence).not.toBeNull();
  expect(waypointO?.y).toBeGreaterThanOrEqual(railSequence?.y ?? 0);
  expect((waypointO?.y ?? 0) + (waypointO?.height ?? 0)).toBeLessThanOrEqual((railSequence?.y ?? 0) + (railSequence?.height ?? 0) + 1);
  await capture('04', 'expanded-rail-through-o');

  await restoreWaypointEWithKeyboard(page);
  await page.getByTestId('mission-journey-expand').click();

  await page.getByTestId('mission-enter-web3d').click();
  await expect(worldStage).toHaveAttribute('data-world-representation', 'web3d');
  await expect(page.locator('[data-model-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await assertAgesContext();
  await expect(page.getByTestId('mission-spatial-lens')).toContainText('معاينة التصميم ثلاثية الأبعاد');
  await expect(page.getByTestId('mission-spatial-lens')).toContainText('غير مسجل هندسيًا');
  await expect(page).toHaveURL(/view=mission-web3d/);
  await expect(page).not.toHaveURL(/surface=web3d/);
  expect(page.url().length).toBeLessThan(600);
  await capture('05', 'web3d-client-reveal');

  await page.getByTestId('mission-behind-experience').click();
  await expect(page.getByTestId('mission-operations-lens')).toContainText('لا يمكن تحديدها');
  await expect(page.getByTestId('mission-operations-lens')).toContainText('لا يوجد مصدر حي متصل');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'web3d');
  expect(await page.evaluate(() => (window as unknown as { __missionWorldStage?: Element }).__missionWorldStage === document.querySelector('[data-testid="mission-world-stage"]'))).toBe(true);
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  await assertAgesContext();
  await expectNoOverlap(page);
  await capture('06', 'operations-same-world');

  await page.getByTestId('mission-lens-decision').click();
  await expect(page.getByTestId('mission-decision-lens')).toContainText('لم يُنشأ قرار تشغيلي معتمد لهذه اللحظة');
  await expect(page.getByTestId('mission-decision-lens')).toContainText('الإجراء التالي');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'web3d');
  expect(await page.evaluate(() => (window as unknown as { __missionWorldStage?: Element }).__missionWorldStage === document.querySelector('[data-testid="mission-world-stage"]'))).toBe(true);
  await assertAgesContext();
  await expectNoOverlap(page);
  await capture('07', 'decision-same-world');

  await page.getByTestId('mission-lens-future').click();
  await expect(page.getByTestId('mission-future-lens')).toContainText('بروفة مرشحة');
  await expect(page.getByTestId('mission-future-lens')).toContainText('محرك المحاكاة غير متصل');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'web3d');
  await assertAgesContext();
  await expectNoOverlap(page);
  await capture('08', 'rehearsal-same-world');

  await page.getByTestId('mission-presentation-select').selectOption('technical');
  await expect(page.getByTestId('mission-truth-drawer')).toContainText('ثقة المصدر');
  await expect(page.getByTestId('mission-truth-drawer')).toContainText('حالة العلاقة');
  await expect(page.getByTestId('mission-truth-drawer')).toContainText('تفاصيل تقنية');
  await expect(worldStage).toBeVisible();
  await expect(page.getByTestId('mission-lens-panel')).toHaveCSS('visibility', 'hidden');
  await expect(page.getByTestId('mission-reveal-next')).toBeHidden();
  await assertAgesContext();
  await capture('09', 'technical-truth-drawer');
  await page.getByRole('button', { name: 'إغلاق حقيقة المصدر' }).click();
  await expect(page.getByTestId('mission-truth-drawer')).toHaveCount(0);

  await page.getByTestId('mission-open-tangible').click();
  const tangible = page.getByTestId('mission-tangible-surface');
  await expect(tangible).toContainText('لا يوجد جهاز متصل');
  await expect(tangible).toContainText('الكيان نفسه محدد');
  await expect(tangible).toHaveAttribute('data-projection-version', await canvas.getAttribute('data-projection-version') ?? '');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'web3d');
  await assertAgesContext();

  await tangible.getByRole('button', { name: 'العودة إلى العالم الحي' }).click();
  await expect(worldStage).toHaveAttribute('data-world-representation', 'map');
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  await expect(page.getByTestId('mission-map-point-E')).toBeVisible();
  await expect(page).toHaveURL(/view=mission-world/);
  await expect(page).not.toHaveURL(/surface=web3d/);
  await assertAgesContext();
  await expect(page.getByTestId('mission-world-map')).toHaveAttribute('data-source-legend', 'masked');
  await capture('10', 'complete-reveal-endpoint');

  const compactWorldUrl = new URL(page.url());
  await page.reload();
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  await expect(worldStage).toHaveAttribute('data-world-representation', 'map');
  await page.goBack();
  await page.goForward();
  await expect(page).toHaveURL(/view=mission-world/);
  const restoredWorldUrl = new URL(page.url());
  ['day', 'persona', 'journey', 'routeJourney', 'routeWaypoint', 'entity', 'zone'].forEach((key) => {
    expect(restoredWorldUrl.searchParams.get(key)).toBe(compactWorldUrl.searchParams.get(key));
  });
  expect(restoredWorldUrl.searchParams.has('surface')).toBe(false);
  await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');

  await page.locator('.mission-four-days button').nth(1).click();
  await expect(page.getByTestId('mission-route-not-applicable')).toContainText('لا تنطبق رحلة تشغيلية مشتركة');
  await expect(page.locator('[data-testid^="mission-map-point-"]')).toHaveCount(0);
  await expect(page.locator('.mission-journey-rail')).toHaveCount(0);
  await expect(canvas).toHaveText(/لا تنطبق رحلة تشغيلية مشتركة/);

  await page.goto(directWeb3dUrl);
  await expect(page.getByTestId('mission-world-stage')).toHaveAttribute('data-world-representation', 'web3d');
  await expect(page.locator('[data-model-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('mission-canvas')).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
  expect(page.url().length).toBeLessThan(600);

  await page.goto(directExpandedUrl);
  await expect(page.getByTestId('mission-journey-expand')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('mission-rail-waypoint-O')).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('mission-rail-waypoint-O')).toBeInViewport();
  expect(page.url().length).toBeLessThan(600);

  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('selects waypoint O from natural focus using keyboard only and restores canonical E after reload', async ({ page }) => {
  await page.goto(directWorldUrl);
  const canvas = page.getByTestId('mission-canvas');
  await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-E`);
  await selectWaypointOWithKeyboardOnly(page);

  const waypointO = await page.getByTestId('mission-rail-waypoint-O').boundingBox();
  const railSequence = await page.locator('.mission-journey-rail-sequence').boundingBox();
  expect(waypointO).not.toBeNull();
  expect(railSequence).not.toBeNull();
  expect(waypointO?.y).toBeGreaterThanOrEqual(railSequence?.y ?? 0);
  expect((waypointO?.y ?? 0) + (waypointO?.height ?? 0)).toBeLessThanOrEqual((railSequence?.y ?? 0) + (railSequence?.height ?? 0) + 1);

  await restoreWaypointEWithKeyboard(page);
  await expect(page).toHaveURL(new RegExp(`routeWaypoint=${journeyId}-WP-E`));

  await page.reload();
  await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-E`);
  await selectWaypointOWithKeyboardOnly(page);
  await restoreWaypointEWithKeyboard(page);
  await expect(page).toHaveURL(new RegExp(`routeWaypoint=${journeyId}-WP-E`));
});

test('preserves a direct Truth Map E link through hydration reload history and waypoint changes', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __missionSurfaceHistory: string[] };
    state.__missionSurfaceHistory = [];
    const observe = () => {
      const surface = document.querySelector('[data-testid="mission-world-map"]')?.getAttribute('data-map-presentation');
      if (surface && state.__missionSurfaceHistory.at(-1) !== surface) state.__missionSurfaceHistory.push(surface);
    };
    new MutationObserver(observe).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-map-presentation'] });
  });
  await page.goto(directTruthUrl);
  const canvas = page.getByTestId('mission-canvas');
  const map = page.getByTestId('mission-world-map');
  const assertTruthE = async () => {
    await expect(page).toHaveURL(/view=mission-world/);
    await expect(page).toHaveURL(/surface=truth-map/);
    await expect(map).toHaveAttribute('data-map-presentation', 'truth');
    await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-E`);
    await expect(canvas).toHaveAttribute('data-step-id', 'STEP-KAP-PREOPEN-AGES');
    await expect(canvas).toHaveAttribute('data-entity-id', 'ENTITY-KAP-OP-006');
    await expect(canvas).toHaveAttribute('data-zone-id', 'ZONE-AGES-TUNNEL-001');
    await expect(canvas).toHaveAttribute('data-area-id', 'AREA-KAP-03');
  };
  await assertTruthE();
  expect(await page.evaluate(() => (window as unknown as { __missionSurfaceHistory: string[] }).__missionSurfaceHistory)).toEqual(['truth']);

  await page.reload();
  await assertTruthE();
  expect(await page.evaluate(() => (window as unknown as { __missionSurfaceHistory: string[] }).__missionSurfaceHistory)).toEqual(['truth']);

  const next = page.getByTestId('mission-journey-rail').getByRole('button', { name: 'اللحظة التالية' });
  for (let index = 0; index < 10; index += 1) await next.click();
  await expect(canvas).toHaveAttribute('data-waypoint-id', `${journeyId}-WP-O`);
  await expect(map).toHaveAttribute('data-map-presentation', 'truth');
  await expect(page).toHaveURL(/surface=truth-map/);
  const previous = page.getByTestId('mission-journey-rail').getByRole('button', { name: 'اللحظة السابقة' });
  for (let index = 0; index < 10; index += 1) await previous.click();
  await assertTruthE();

  await page.getByRole('button', { name: 'العودة للخريطة الحية' }).click();
  await expect(map).toHaveAttribute('data-map-presentation', 'living');
  await expect(page).not.toHaveURL(/surface=truth-map/);
  await page.getByRole('button', { name: 'خريطة الحقيقة', exact: true }).click();
  await assertTruthE();
  await page.goBack();
  await expect(map).toHaveAttribute('data-map-presentation', 'living');
  await page.goForward();
  await assertTruthE();
  await page.reload();
  await assertTruthE();
});
