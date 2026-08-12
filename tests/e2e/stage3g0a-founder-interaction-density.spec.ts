import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  clickSpatialMarkerCenter,
  ensureSpatialMarkerInteractive
} from './spatial-marker-helpers';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const readinessUrl = `/?workspace=readiness&project=${projectId}&event=${eventId}&venue=${venueId}`;
const entityLabels = [
  'البوابات',
  'الاستقبال',
  'المركز الإعلامي',
  'المجسم',
  'النصب التذكاري',
  'ممر العصور',
  'العشاء',
  'الجلسات والضيافة',
  'المؤتمر الصحفي والصورة التذكارية',
  'منطقة كبار الشخصيات',
  'ركن الذكريات'
] as const;

function entityId(sourceNumber: number): string {
  return `ENTITY-KAP-OP-${String(sourceNumber).padStart(3, '0')}`;
}

async function openReadinessMap(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${readinessUrl}&readinessView=map`);
  await expect(page.getByTestId('readiness-command-workspace')).toHaveAttribute('data-readiness-posture', 'unassessed');
  await expect(page.getByTestId('readiness-spatial-map')).toBeVisible();
  await expect(page.locator('.candidate-preview-image-shell.is-ready')).toBeVisible();
}

async function expectNoPointerOverlap(controls: Locator) {
  const boxes = await controls.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      id: element.getAttribute('data-testid'),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }));
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const left = boxes[leftIndex];
      const right = boxes[rightIndex];
      const overlapWidth = Math.max(
        0,
        Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
      );
      const overlapHeight = Math.max(
        0,
        Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
      );
      expect(overlapWidth * overlapHeight, `${left.id} overlaps ${right.id}`).toBeLessThanOrEqual(0.5);
    }
  }
}

test('routes real pointer clicks to each of the eleven individually visible markers', async ({ page }) => {
  await openReadinessMap(page);
  await ensureSpatialMarkerInteractive(page, 6);
  const markers = page.locator('[data-testid^="spatial-command-marker-"]');
  await expect(markers).toHaveCount(11);
  expect(await markers.evaluateAll((elements) => elements.every(
    (element) => element.getAttribute('data-pointer-interactive') === 'true'
  ))).toBe(true);
  await expectNoPointerOverlap(markers);

  for (let sourceNumber = 1; sourceNumber <= 11; sourceNumber += 1) {
    const marker = await clickSpatialMarkerCenter(page, sourceNumber);
    await expect(marker).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid^="spatial-command-marker-"][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByTestId('readiness-selected-entity-label')).toHaveText(entityLabels[sourceNumber - 1]);
    await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText(entityId(sourceNumber));
    expect(new URL(page.url()).searchParams.get('readinessEntity')).toBe(entityId(sourceNumber));
  }

  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'false');
  await clickSpatialMarkerCenter(page, 6);
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('spatial-command-marker-7')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('readiness-selected-entity-label')).toHaveText('ممر العصور');
  await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText('ENTITY-KAP-OP-006');
});

test('summarizes collisions, removes hidden pointer targets, and expands to safe hit areas', async ({ page }) => {
  await openReadinessMap(page);
  const summarized = page.locator('.sc-marker.is-cluster-summarized');
  await expect(summarized).not.toHaveCount(0);
  const summarizedState = await summarized.evaluateAll((markers) => markers.map((marker) => ({
    disabled: (marker as HTMLButtonElement).disabled,
    tabIndex: (marker as HTMLButtonElement).tabIndex,
    pointerEvents: getComputedStyle(marker).pointerEvents,
    visibility: getComputedStyle(marker).visibility,
    ariaHidden: marker.getAttribute('aria-hidden')
  })));
  expect(summarizedState.every((state) => (
    state.disabled
    && state.tabIndex === -1
    && state.pointerEvents === 'none'
    && state.visibility === 'hidden'
    && state.ariaHidden === 'true'
  ))).toBe(true);

  const collapsedControls = page.locator('.sc-marker-cluster, .sc-marker[data-pointer-interactive="true"]');
  await expectNoPointerOverlap(collapsedControls);
  await ensureSpatialMarkerInteractive(page, 6);
  await expect(page.locator('[data-testid^="spatial-command-marker-"][aria-pressed="true"]')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('readinessEntity')).toBeNull();
  await expect(page.locator('.sc-marker-declutter-links line')).not.toHaveCount(0);
  const expandedMarkers = page.locator('[data-testid^="spatial-command-marker-"][data-pointer-interactive="true"]');
  await expect(expandedMarkers).toHaveCount(11);
  await expectNoPointerOverlap(expandedMarkers);

  await page.getByRole('button', { name: 'تكبير الخريطة' }).click();
  await clickSpatialMarkerCenter(page, 6);
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('spatial-command-marker-7')).toHaveAttribute('aria-pressed', 'false');
});

test('supports keyboard cluster expansion and exact Enter selection', async ({ page }) => {
  await openReadinessMap(page);
  const marker = await ensureSpatialMarkerInteractive(page, 6, 'keyboard');
  await marker.focus();
  await marker.press('Enter');
  await expect(marker).toBeFocused();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('spatial-command-marker-7')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('readiness-selected-entity-label')).toHaveText('ممر العصور');
  await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText('ENTITY-KAP-OP-006');
  expect(new URL(page.url()).searchParams.get('readinessEntity')).toBe('ENTITY-KAP-OP-006');
});

test('gives secondary views a compact truthful context and at least 360px of usable height', async ({ page }) => {
  await page.goto(`${readinessUrl}&readinessEntity=ENTITY-KAP-OP-006`);
  await expect(page.getByTestId('readiness-executive-posture')).toBeVisible();
  await expect(page.getByTestId('readiness-compact-context')).toHaveCount(0);

  await page.getByTestId('readiness-view-matrix').click();
  const content = page.locator('.ri-view-content');
  await expect(page.getByTestId('readiness-compact-context')).toBeVisible();
  await expect(page.getByTestId('readiness-executive-posture')).toHaveCount(0);
  const contentBox = await content.boundingBox();
  expect(contentBox?.height).toBeGreaterThanOrEqual(360);
  const visibleRows = await page.locator('.ri-matrix-view tbody tr').evaluateAll((rows) => {
    const scrollBounds = document.querySelector('.ri-table-scroll')?.getBoundingClientRect();
    if (!scrollBounds) return 0;
    return rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return rect.top >= scrollBounds.top && rect.bottom <= scrollBounds.bottom;
    }).length;
  });
  expect(visibleRows).toBeGreaterThanOrEqual(5);
  expect(await page.locator('.ri-matrix-view td').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(11);
  expect(await page.locator('.ri-matrix-filters select').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(11);

  await page.getByTestId('readiness-compact-context-toggle').click();
  await expect(page.getByTestId('readiness-compact-context-details')).toContainText('اعتماد الافتتاح التشغيلي');
  await page.getByTestId('readiness-compact-context-toggle').click();

  const tableScroll = page.locator('.ri-table-scroll');
  await tableScroll.evaluate((element) => {
    element.scrollTop = 120;
  });
  await page.getByTestId('readiness-view-governance').click();
  await expect(page.getByTestId('readiness-governance-view')).toBeVisible();
  await expect(page.locator('.ri-governance-chain article').first()).toBeInViewport();

  await page.getByTestId('readiness-view-flow').click();
  await expect(page.getByTestId('readiness-evidence-approval-flow')).toBeVisible();
  await expect(page.locator('.ri-trust-flow article').first()).toBeInViewport();
  await expect(page.locator('.ri-trust-flow article').last()).toBeInViewport();

  await page.getByTestId('readiness-view-matrix').click();
  await expect.poll(() => page.locator('.ri-table-scroll').evaluate((element) => element.scrollTop)).toBe(0);

  await page.getByTestId('readiness-view-map').click();
  const mapCanvas = page.locator('.ri-map-canvas');
  await expect(mapCanvas).toBeVisible();
  expect((await mapCanvas.boundingBox())?.height).toBeGreaterThanOrEqual(360);
  expect(await mapCanvas.locator('.sc-candidate-truth-line').evaluate(
    (element) => parseFloat(getComputedStyle(element).fontSize)
  )).toBeGreaterThanOrEqual(11);
  await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText('ENTITY-KAP-OP-006');
  expect(new URL(page.url()).searchParams.get('project')).toBe(projectId);
  expect(new URL(page.url()).searchParams.get('event')).toBe(eventId);
  expect(new URL(page.url()).searchParams.get('readinessEntity')).toBe('ENTITY-KAP-OP-006');

  await page.goBack();
  await expect(page.getByTestId('readiness-view-matrix')).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page.getByTestId('readiness-view-map')).toHaveAttribute('aria-current', 'page');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
