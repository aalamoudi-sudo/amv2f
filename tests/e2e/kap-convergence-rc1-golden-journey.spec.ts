import { expect, test } from '@playwright/test';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const entryUrl = `/?workspace=experience-twin&${scope}&golden=entry&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&routeJourney=JOURNEY-KAP-20261031-WORKERS-V11&routeWaypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-A`;

test('runs the truthful KAP Golden Journey from entry to Web3D and back', async ({ page }) => {
  const consoleErrors: string[] = [];
  const externalRequests: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('blob:') && !url.startsWith('data:')) externalRequests.push(url);
  });

  await page.goto(entryUrl);
  await expect(page.getByTestId('golden-journey-entry')).toBeVisible();
  await expect(page.getByRole('heading', { name: /أربعة أيام/ })).toBeVisible();
  await expect(page.getByText('مصدر مرشح — غير مسجل هندسيًا')).toBeVisible();
  await expect(page.getByText('لا يمكن تحديدها')).toHaveCount(0);

  await page.getByTestId('golden-start-journey').click();
  await expect(page.getByTestId('golden-journey-map')).toBeVisible();
  await expect(page.getByTestId('golden-journey-map')).toHaveAttribute('data-route-geometry', 'none');
  await page.getByTestId('golden-map-marker-ENTITY-KAP-OP-006').click();
  await expect(page.getByTestId('golden-current-moment')).toContainText('ممر العصور');
  await expect(page).toHaveURL(/waypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E/);

  await page.getByTestId('golden-enter-web3d').click();
  await expect(page.getByTestId('golden-journey-scene')).toBeVisible();
  await expect(page.locator('[data-model-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('design-client-truth-badge')).toContainText('مشتق غير مسجل');
  await expect(page.getByTestId('design-client-route-context')).toContainText('proposed / medium');
  await expect(page.locator('.scene-mode-tabs')).toBeHidden();
  const surfaceBox = await page.locator('.scene-viewer-surface').boundingBox();
  expect(surfaceBox?.height ?? 0).toBeGreaterThan((page.viewportSize()?.height ?? 1080) * .75);

  await page.reload();
  await expect(page.locator('[data-model-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('design-client-truth-badge').click();
  await expect(page.getByTestId('scene-truth-details')).toContainText('نية التصميم معتمدة من المؤسس');
  await expect(page.getByTestId('scene-truth-details')).toContainText('غير مسجل هندسيًا');
  await page.getByRole('button', { name: 'إغلاق تفاصيل المشهد' }).click();
  await page.getByTestId('design-client-exit').click();
  await expect(page.getByTestId('golden-journey-map')).toBeVisible();
  await expect(page.getByTestId('golden-map-marker-ENTITY-KAP-OP-006')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/waypoint=JOURNEY-KAP-20261031-WORKERS-V11-WP-E/);

  await page.getByRole('button', { name: 'البوابة' }).click();
  await page.getByTestId('golden-day-DAY-KAP-2026-11-01').click();
  await page.getByTestId('golden-start-journey').click();
  await expect(page.getByTestId('golden-route-not-applicable')).toContainText('رحلة الزائر والمسار والانتقال المشترك غير منطبقة');
  await expect(page.locator('.golden-story-rail')).toHaveCount(0);
  await expect(page.locator('[data-testid^="golden-map-marker-"]')).toHaveCount(0);
  await expect(page.getByText(/دقيقة · محاسبة شاملة/)).toHaveCount(0);
  await page.getByRole('button', { name: 'ما وراء التجربة' }).click();
  await expect(page.getByTestId('golden-operational-context')).toContainText('لا يمكن تحديدها');

  expect(externalRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
