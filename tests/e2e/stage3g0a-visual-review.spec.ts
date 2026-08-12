import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { test } from './test-fixtures';
import {
  clickSpatialMarkerCenter,
  ensureSpatialMarkerInteractive
} from './spatial-marker-helpers';

const bundleName = 'mayadeen-stage-3g0a-founder-interaction-density-review';
const reviewRoot = process.env.STAGE3G0A_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const readinessUrl = `/?workspace=readiness&project=${projectId}&event=${eventId}&venue=${venueId}`;

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

async function capture(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[]
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required for Stage 3G.0A review.');
  await settle(page);
  const destination = path.join(directory, file);
  await page.screenshot({
    path: destination,
    fullPage: false,
    animations: 'disabled',
    caret: 'hide'
  });
  const bytes = await readFile(destination);
  records.push({
    file,
    state,
    width: viewport.width,
    height: viewport.height,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}

test('captures Stage 3G.0A founder interaction and density evidence', async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(readinessUrl);
  await expect(page.getByTestId('readiness-executive-posture')).toBeVisible();
  await capture(page, directory, '01-complete-executive-overview.png', 'Complete Stage 3G.0 executive posture preserved', records);

  await page.getByTestId('readiness-view-matrix').click();
  await expect(page.getByTestId('readiness-compact-context')).toBeVisible();
  await capture(page, directory, '02-compact-requirement-matrix.png', 'Compact context with five useful matrix rows', records);

  await page.getByTestId('readiness-view-governance').click();
  await expect(page.getByTestId('readiness-governance-view')).toBeVisible();
  await capture(page, directory, '03-compact-governance.png', 'Immediately readable governance process', records);

  await page.getByTestId('readiness-view-flow').click();
  await expect(page.getByTestId('readiness-evidence-approval-flow')).toBeVisible();
  await capture(page, directory, '04-compact-evidence-flow.png', 'Evidence, verification, approval, and acceptance remain distinct', records);

  await page.getByTestId('readiness-view-map').click();
  await expect(page.getByTestId('readiness-spatial-map')).toBeVisible();
  await expect(page.locator('.candidate-preview-image-shell.is-ready')).toBeVisible();
  await capture(page, directory, '05-large-map-collapsed-cluster.png', 'Large readiness map with safe summarized cluster', records);

  await ensureSpatialMarkerInteractive(page, 6);
  await capture(page, directory, '06-expanded-cluster.png', 'Expanded cluster with non-overlapping selectable targets', records);

  await clickSpatialMarkerCenter(page, 6);
  await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText('ENTITY-KAP-OP-006');
  await capture(page, directory, '07-marker-6-exact-pointer-selection.png', 'Pointer selection agrees on marker 6, label, URL, and inspector', records);

  await clickSpatialMarkerCenter(page, 7);
  await expect(page.getByTestId('readiness-map-inspector-id')).toHaveText('ENTITY-KAP-OP-007');
  await capture(page, directory, '08-marker-7-exact-pointer-selection.png', 'Pointer selection agrees on marker 7 without marker 6 interception', records);

  await page.goto(`${readinessUrl}&readinessView=map`);
  const markerSix = await ensureSpatialMarkerInteractive(page, 6, 'keyboard');
  await markerSix.focus();
  await markerSix.press('Enter');
  await expect(markerSix).toBeFocused();
  await expect(markerSix).toHaveAttribute('aria-pressed', 'true');
  await capture(page, directory, '09-keyboard-marker-6-selection.png', 'Visible keyboard focus and exact Enter selection', records);

  const hashes = records.map((record) => record.sha256);
  expect(new Set(hashes).size).toBe(records.length);
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.0A',
    featureCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    resolution,
    screenshotCount: records.length,
    screenshots: records
  }, null, 2)}\n`);
});
