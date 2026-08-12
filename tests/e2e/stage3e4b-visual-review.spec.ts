import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ensureSpatialMarkerInteractive } from './spatial-marker-helpers';

const bundleName = 'mayadeen-stage-3e4b-kap-spatial-command-experience-review';
const reviewRoot = process.env.STAGE3E4B_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
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
}

async function capture(page: Page, directory: string, file: string, state: string, records: ScreenshotRecord[]) {
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

test('captures fifteen meaningful Stage 3E.4B founder-review states', async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, 'after', resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await page.getByTestId(`project-card-${projectId}`).scrollIntoViewIfNeeded();
  await capture(page, directory, '01-kap-spatial-portfolio.png', 'Upgraded KAP portfolio card and spatial command entry', records);

  await page.getByTestId('spatial-command-open').click();
  await expect(page.getByTestId('optional-local-source-image')).toHaveAttribute('data-preview-state', 'ready');
  await capture(page, directory, '02-experience-map-default.png', 'Map-dominant Experience Map with eleven candidate destinations', records);

  await ensureSpatialMarkerInteractive(page, 6);
  await page.getByTestId('spatial-command-marker-6').click();
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('ممر العصور');
  await capture(page, directory, '03-experience-conflict-selection.png', 'Terminology conflict selected on the map', records);

  await page.getByTestId('spatial-command-marker-4').click();
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('معلم مستقل');
  await capture(page, directory, '04-independent-landmark-selection.png', 'Independent landmark recommendation without authority promotion', records);

  await page.keyboard.press('Escape');
  await page.getByTestId('spatial-view-presentation').click();
  await expect(page.getByTestId('presentation-view-disclosure')).toBeVisible();
  await capture(page, directory, '05-safe-presentation-perspective.png', 'Non-engineering presentation perspective with permanent disclosure', records);

  await page.getByTestId('spatial-view-top').click();
  await page.getByTestId('spatial-command-mode-executive').click();
  await expect(page.getByTestId('executive-command-context')).toBeVisible();
  await capture(page, directory, '06-executive-command-overview.png', 'Executive candidate-package summary and open decisions', records);

  await page.getByTestId('executive-blocker-2').click();
  await expect(page.getByTestId('executive-blocker-detail')).toContainText(/ممر العصور/);
  await capture(page, directory, '07-executive-terminology-decision.png', 'Founder terminology decision and accepted evidence', records);

  await page.getByTestId('executive-blocker-3').click();
  await expect(page.getByTestId('canvas-unresolved-show')).toBeVisible();
  await capture(page, directory, '08-executive-unresolved-show.png', 'Show experience object deliberately left without a map anchor', records);

  await page.getByTestId('spatial-command-mode-journey').click();
  await expect(page.getByTestId('journey-step-arrival')).toHaveAttribute('aria-current', 'step');
  await capture(page, directory, '09-journey-arrival.png', 'Visitor narrative arrival step', records);

  await page.getByTestId('journey-step-ages').click();
  await capture(page, directory, '10-journey-ages-conflict.png', 'Visitor narrative ages step with terminology conflict', records);

  await page.getByTestId('journey-step-show').click();
  await expect(page.getByTestId('journey-unresolved-step')).toBeVisible();
  await capture(page, directory, '11-journey-show-unresolved.png', 'Narrative pause at unresolved show location without fake marker', records);

  await page.getByTestId('journey-step-dinner').click();
  await capture(page, directory, '12-journey-dinner-vip.png', 'Visitor narrative dinner and VIP step', records);

  await page.getByTestId('spatial-source-layer-kap-field-evidence').click();
  await expect(page.getByTestId('field-evidence-command-layer')).toBeVisible();
  await capture(page, directory, '13-field-evidence-privacy.png', 'Metadata-only field evidence and privacy boundary', records);

  await page.getByTestId('spatial-source-layer-kap-visitor-map').click();
  await expect(page.getByTestId('missing-visitor-map-command-layer')).toBeVisible();
  await capture(page, directory, '14-missing-visitor-map.png', 'Missing editable visitor-map source gate', records);

  await page.getByTestId('source-truth-drawer-open').click();
  await expect(page.getByTestId('source-truth-drawer')).toBeVisible();
  await capture(page, directory, '15-technical-truth-drawer.png', 'On-demand source authority, fingerprints, geometry controls, and integrity risk', records);

  expect(records).toHaveLength(15);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3E.4B',
    projectId,
    eventId,
    venueId,
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
