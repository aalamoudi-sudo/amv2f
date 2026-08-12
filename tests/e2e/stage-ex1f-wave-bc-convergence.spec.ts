import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const routeId = 'JOURNEY-KAP-20261031-WORKERS-V11';
const agesWaypointId = `${routeId}-WP-E`;
const routeUrl = `/?workspace=experience-twin&${scope}&experienceMode=journey&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&routeJourney=${routeId}&routeWaypoint=${agesWaypointId}&mapMode=story&viewMode=scene-focus`;

async function openRelatedDesign(page: Page) {
  await page.goto(routeUrl);
  await page.getByTestId('route-design-open-scene').click();
  const surface = page.getByTestId('scene-web3d-surface');
  await expect(surface).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  return surface;
}

test('converges the V.11 candidate journey with only its explicit proposed design relation', async ({ page }) => {
  await page.goto(routeUrl);
  const context = page.getByTestId('route-design-context');
  await expect(context).toBeVisible();
  await expect(context).toHaveAttribute('data-route-geometry', 'none');
  await expect(context).toContainText('31 أكتوبر · العاملون');
  await expect(context).toContainText('180 دقيقة');
  await expect(context).toContainText('سيارة · مشي');
  await expect(context).toContainText('اقتراحات الدخول V.11.pdf · صفحة 2 · V.11');
  await expect(context).toContainText('رحلة تشغيلية مرشحة · رسم توضيحي غير مسجل');
  await expect(context).toContainText('اعتماد المسار غير مثبت');
  await expect(page).toHaveURL(new RegExp(`routeJourney=${routeId}`));
  await expect(page).toHaveURL(new RegExp(`routeWaypoint=${agesWaypointId}`));

  const surface = await openRelatedDesign(page);
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-OVERVIEW');
  await expect(page.getByTestId('route-design-context')).toContainText('proposed / medium');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('الجاهزية التشغيلية: لا يمكن تحديدها');
  await expect(page).toHaveURL(/scene=DESIGN-ASSET-KAP-DIRECT-MESH-001/);
  await expect(page.locator('[data-spatial-route="approved"]')).toHaveCount(0);
});

test('uses a clean client surface while retaining the exact shared route and design truth', async ({ page }) => {
  const surface = await openRelatedDesign(page);
  await page.getByTestId('design-client-mode-toggle').click();
  await expect(surface).toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-PRESENTATION');
  const client = page.getByTestId('design-client-presentation');
  await expect(client).toBeVisible();
  await expect(page.getByTestId('design-client-route-context')).toContainText('ممر العصور');
  await expect(page.getByTestId('design-client-route-context')).toContainText('proposed / medium · ليست مسارًا');
  await expect(page.getByTestId('design-client-truth-badge')).toContainText('مشتق غير مسجل');
  await expect(page.locator('.scene-web3d-toolbar')).toHaveCount(0);
  await expect(page.locator('.scene-web3d-tour')).toHaveCount(0);

  const canvasBox = await page.getByTestId('design-scene-canvas').boundingBox();
  const dockBox = await client.boundingBox();
  const viewport = page.viewportSize();
  expect(canvasBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(canvasBox!.height).toBeGreaterThanOrEqual(viewport!.height * 0.7);
  expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(dockBox!.y + 1);

  await page.getByTestId('design-client-tour-toggle').click();
  await expect(surface).toHaveAttribute('data-tour-playing', 'true');
  await page.getByTestId('design-client-tour-toggle').click();
  await expect(surface).toHaveAttribute('data-tour-playing', 'false');
  await page.getByTestId('design-client-previous-viewpoint').click();
  await expect(surface).not.toHaveAttribute('data-viewpoint-id', 'DESIGN-VIEW-KAP-PRESENTATION');

  await page.getByTestId('design-client-truth-badge').click();
  const truth = page.getByTestId('scene-truth-details');
  await expect(truth).toContainText('غير مسجل هندسيًا');
  await expect(truth).toContainText('لا يمكن تحديدها');
  await expect(truth).toContainText('ربط مرشح بممر العصور');
});

test('returns to the candidate story map when the client rail selects a waypoint without a scene relation', async ({ page }) => {
  await openRelatedDesign(page);
  await page.getByTestId('design-client-mode-toggle').click();
  const journeyDrawer = page.getByTestId('design-client-journey-drawer');
  await journeyDrawer.locator('summary').click();
  await journeyDrawer.getByRole('button', { name: 'F الحديقة العائلية' }).click();

  await expect(page.getByTestId('design-client-presentation')).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`routeWaypoint=${routeId}-WP-F`));
  await expect(page).not.toHaveURL(/scene=DESIGN-ASSET-KAP-DIRECT-MESH-001/);
  await expect(page).toHaveURL(/mapMode=story/);
  await expect(page.getByTestId('route-design-context')).toContainText('لا توجد علاقة مشهد صريحة لهذه المحطة');
});

test('keeps 1 November visible and route-not-applicable while allowing independent design exploration', async ({ page }) => {
  await page.goto(`/?workspace=experience-twin&${scope}&experienceMode=scenes&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-MAIN-SHOW&entity=ENTITY-KAP-OP-006&zone=ZONE-AGES-TUNNEL-001&scene=DESIGN-ASSET-KAP-DIRECT-MESH-001&sceneView=model-3d&mapMode=web3d&viewMode=scene-focus&designViewpoint=DESIGN-VIEW-KAP-PRESENTATION`);
  const notApplicable = page.getByTestId('route-design-context-not-applicable');
  await expect(notApplicable).toContainText('لا تنطبق رحلة تشغيلية مشتركة');
  await expect(notApplicable).toContainText('بلا خط أو مدة أو انتقال مفترض');
  await expect(page).not.toHaveURL(/routeJourney=/);
  await expect(page).not.toHaveURL(/routeWaypoint=/);
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('اليوم الثاني · التدشين الملكي');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('الجاهزية التشغيلية: لا يمكن تحديدها');
  await expect(page.locator('[data-route-geometry]')).toHaveCount(0);
});

test('rejects a foreign day and persona route without falling back to another candidate', async ({ page }) => {
  await page.goto(`/?workspace=experience-twin&${scope}&experienceMode=journey&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&journey=JOURNEY-KAP-PRESS-2026&step=STEP-KAP-PRESS-ARRIVAL&routeJourney=${routeId}&routeWaypoint=${agesWaypointId}`);
  await expect(page.getByTestId('route-design-context-safe-empty')).toContainText('اختيار مرشح محجوب بأمان');
  await expect(page).not.toHaveURL(/routeJourney=/);
  await expect(page).not.toHaveURL(/routeWaypoint=/);
  await page.reload();
  await expect(page.getByTestId('route-design-context')).toContainText('3 نوفمبر · الإعلام');
  await expect(page).toHaveURL(/routeJourney=JOURNEY-KAP-20261103-MEDIA-V11/);
  await expect(page).not.toHaveURL(/JOURNEY-KAP-20261031-WORKERS-V11/);
});
