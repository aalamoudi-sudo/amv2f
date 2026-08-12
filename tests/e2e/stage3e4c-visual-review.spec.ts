import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const bundleName = 'mayadeen-stage-3e4c-founder-spatial-truth-map-control-review';
const reviewRoot = process.env.STAGE3E4C_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const candidateLayerId = 'SOURCE-LAYER-KAP-CANDIDATE-ZONING';
const mapUrl = `/?workspace=spatial-command&project=${projectId}&event=${eventId}&venue=${venueId}&sourceLayer=${candidateLayerId}&mode=experience&viewMode=top`;

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(460);
}

async function capture(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[]
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required for visual review.');
  await settle(page);
  const destination = path.join(directory, file);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled', caret: 'hide' });
  const bytes = await readFile(destination);
  records.push({
    file,
    state,
    width: viewport.width,
    height: viewport.height,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}

async function openSearch(page: Page, query: string) {
  if (await page.getByTestId('spatial-search-panel').count() === 0) {
    await page.getByTestId('spatial-search-toggle').click();
  }
  await page.getByRole('textbox', { name: 'بحث في الخريطة' }).fill(query);
}

async function selectMarker(page: Page, sourceNumber: number) {
  const marker = page.getByTestId(`spatial-command-marker-${sourceNumber}`);
  const clusterId = await marker.getAttribute('data-cluster-id');
  if (clusterId && await marker.evaluate((element) => element.classList.contains('is-cluster-summarized'))) {
    await page.getByTestId(clusterId).click();
    if (await marker.getAttribute('aria-pressed') === 'true') return;
  }
  await marker.focus();
  await marker.press('Enter');
}

test('captures twenty-three materially distinct Stage 3E.4C founder-review states', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, 'after', resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto(mapUrl);
  await expect(page.getByTestId('optional-local-source-image')).toHaveAttribute('data-preview-state', 'ready');
  await capture(page, directory, '01-default-clear-map.png', 'Default clear map with frozen founder truth', records);

  await page.getByTestId('spatial-focus-mode').click();
  await capture(page, directory, '02-map-focus-mode.png', 'Map focus mode with nonessential chrome hidden', records);

  await page.getByTestId('spatial-fullscreen').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await capture(page, directory, '03-fullscreen-map.png', 'Native full-screen executive map', records);
  await page.getByTestId('spatial-fullscreen').click();
  await page.getByTestId('spatial-focus-mode').click();

  await openSearch(page, 'كبار الشخصيات');
  await capture(page, directory, '04-arabic-search.png', 'Arabic-first destination and experience search', records);
  await page.getByRole('textbox', { name: 'بحث في الخريطة' }).fill('Tunnel');
  await expect(page.getByTestId('spatial-search-result-ENTITY-KAP-OP-006')).toContainText('ممر العصور');
  await capture(page, directory, '05-tunnel-alias-search.png', 'Legacy Tunnel alias resolving to the Arabic primary label', records);
  await page.getByTestId('spatial-search-toggle').click();

  await page.getByTestId('spatial-filter-toggle').click();
  await page.getByTestId('spatial-filter-independent-landmarks').click();
  await capture(page, directory, '06-truth-filter-panel.png', 'Truth filters showing independent landmarks only', records);
  await page.getByTestId('spatial-filter-independent-landmarks').click();
  await page.getByTestId('spatial-filter-toggle').click();

  await page.getByTestId('collapse-source-layers').click();
  await capture(page, directory, '07-layer-control-panel.png', 'Expanded source and display-layer controls', records);
  await page.getByTestId('display-layer-opacity-candidate-zoning').fill('0.35');
  await capture(page, directory, '08-layer-opacity-control.png', 'Candidate zoning opacity reduced without changing truth', records);
  await page.getByTestId('display-layer-opacity-candidate-zoning').fill('1');

  await selectMarker(page, 1);
  await capture(page, directory, '09-selected-arrival-entity.png', 'Selected arrival entity with clear halo and inspector', records);
  await selectMarker(page, 7);
  await capture(page, directory, '10-related-dinner-entities.png', 'One-to-many dinner and VIP relationship emphasis', records);

  await selectMarker(page, 4);
  await expect(page.getByTestId('spatial-entity-inspector').locator('header i')).toHaveText('معلم مستقل');
  await capture(page, directory, '11-independent-landmark.png', 'Founder-classified independent landmark', records);

  await selectMarker(page, 6);
  await capture(page, directory, '12-conflicted-walkway-marker.png', 'Founder-approved walkway name with spatial conflict retained', records);

  await page.keyboard.press('Escape');
  await page.getByTestId('experience-object-ZONE-SHOW-001').click();
  await expect(page.getByTestId('spatial-search-result-inspector')).toContainText('لا يوجد موضع على الخريطة');
  await capture(page, directory, '13-unresolved-show-no-marker.png', 'Unresolved show experience with no fallback marker', records);

  await page.getByTestId('spatial-command-mode-executive').click();
  await page.getByTestId('executive-blocker-5').click();
  await capture(page, directory, '14-executive-blocker.png', 'Executive blocker with authority, evidence, and impact', records);

  await page.getByTestId('spatial-command-mode-journey').click();
  await expect(page.getByTestId('journey-step-arrival')).toHaveAttribute('aria-current', 'step');
  await capture(page, directory, '15-journey-arrival-step.png', 'Visitor narrative arrival step', records);
  await page.getByTestId('journey-step-show').click();
  await capture(page, directory, '16-journey-unresolved-step.png', 'Narrative pause at the unanchored show step', records);

  await page.getByTestId('spatial-command-mode-experience').click();
  await selectMarker(page, 6);
  await page.getByTestId('candidate-anchor-edit-toggle').click();
  await expect(page.getByTestId('candidate-edit-warning')).toBeVisible();
  await capture(page, directory, '17-candidate-edit-mode.png', 'Explicit visual candidate-anchor editing mode', records);

  const marker = page.getByTestId('spatial-command-marker-6');
  const box = await marker.locator(':scope > span').boundingBox();
  if (!box) throw new Error('Candidate marker bounding box is unavailable.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 34, box.y + box.height / 2 + 18, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('candidate-anchor-undo')).toBeEnabled();
  await capture(page, directory, '18-anchor-drag-preview.png', 'Candidate anchor drag preview before persistence', records);

  await page.getByTestId('candidate-anchor-undo').click();
  await expect(page.getByTestId('candidate-anchor-redo')).toBeEnabled();
  await capture(page, directory, '19-anchor-undo.png', 'Undo restored the frozen visual anchor', records);

  await page.getByTestId('candidate-anchor-redo').click();
  await page.getByTestId('candidate-anchor-change-reason').fill('تصحيح بصري مرشح وفق العلامة المصدرية المراجعة.');
  await capture(page, directory, '20-before-after-comparison.png', 'Before and after candidate comparison with change reason', records);

  await page.getByTestId('candidate-anchor-save-draft').click();
  await page.getByTestId('candidate-anchor-freeze-confirmation').check();
  await page.getByTestId('candidate-anchor-freeze').click();
  await expect(page.getByTestId('founder-truth-frozen-indicator')).toContainText('T1 / A2');
  await capture(page, directory, '21-frozen-candidate-revision.png', 'Frozen local candidate revision indicator without authority promotion', records);

  await page.getByTestId('source-truth-drawer-open').click();
  await expect(page.getByTestId('founder-spatial-truth-register')).toContainText('b63207f0b3f0');
  await capture(page, directory, '22-technical-truth-drawer.png', 'Technical truth drawer with frozen identity and limitations', records);
  await page.getByTestId('source-truth-drawer-close').click();

  await page.getByTestId('spatial-source-layer-kap-visitor-map').click();
  await expect(page.getByTestId('missing-visitor-map-command-layer')).toContainText('لم تُسلّم');
  await capture(page, directory, '23-missing-visitor-map.png', 'Missing editable visitor-map source gate', records);

  expect(records).toHaveLength(23);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3E.4C',
    projectId,
    eventId,
    venueId,
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
