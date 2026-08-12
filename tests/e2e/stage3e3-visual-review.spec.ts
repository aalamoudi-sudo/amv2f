import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

test.setTimeout(240_000);

const reviewRoot = process.env.STAGE3E3_REVIEW_DIR ?? path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-3e3-experience-intelligence-review');
const kapUrl = '/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=experience';
const demoUrl = '/?project=PROJECT-DEMO-EXPERIENCE-001&event=EVENT-DEMO-EXPERIENCE-001&workspace=experience';
const referenceUrl = '/?project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&workspace=experience';

interface ScreenshotRecord {
  fileName: string;
  sha256: string;
  width: number;
  height: number;
  semanticState: string;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-testid$="-loading"]:visible')).toHaveCount(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function capture(page: Page, directory: string, fileName: string, semanticState: string, records: ScreenshotRecord[]): Promise<void> {
  await settle(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'جاهزية 100%', 'كثافة الحشود']) expect(bodyText).not.toContain(forbidden);
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize()!;
  expect(screenshot.readUInt32BE(16)).toBe(viewport.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport.height);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Unintended duplicate screenshot: ${fileName}`).toBe(false);
  records.push({ fileName, sha256, width: viewport.width, height: viewport.height, semanticState });
}

async function openKap(page: Page): Promise<void> {
  await page.goto(kapUrl);
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
}

test('Stage 3E.3 visual review preserves candidate experience truth in the UX.1C project context', async ({ page }, testInfo) => {
  const directory = path.join(reviewRoot, testInfo.project.name);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId('project-card-PROJECT-KAP-OPENING-2026')).toBeVisible();
  await capture(page, directory, '01-kap-project-entry.png', 'portfolio-kap-candidate-entry', records);

  await openKap(page);
  await capture(page, directory, '02-kap-journey-overview.png', 'kap-five-stage-journey', records);
  for (let index = 2; index <= 5; index += 1) {
    await page.getByTestId(`journey-stage-${index}`).click();
    await expect(page.getByTestId(`journey-stage-${index}`)).toHaveAttribute('aria-current', 'step');
    await capture(page, directory, `0${index + 1}-kap-stage-${index}.png`, `kap-selected-journey-stage-${index}`, records);
  }

  await page.getByTestId('executive-open').click();
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
  await capture(page, directory, '07-kap-executive-command.png', 'kap-executive-command', records);

  await page.getByTestId('experience-open').click();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await page.getByTestId('projection-preview-open').click();
  await expect(page.getByTestId('projection-preview')).toContainText('ليست معايرة');
  await capture(page, directory, '08-kap-projection-preview.png', 'candidate-projection-preview', records);
  await page.getByTestId('projection-preview-close').click();

  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await capture(page, directory, '09-kap-spatial-safe-state.png', 'kap-unapproved-spatial-state', records);

  await page.goto(demoUrl);
  await expect(page.getByTestId('experience-workspace')).toContainText('حزمة عرض تجريبية عامة');
  await capture(page, directory, '10-explicit-demo-package.png', 'generic-experience-demo', records);

  await page.goto(referenceUrl);
  await expect(page.getByTestId('experience-workspace')).toContainText('مؤتمر مرجعي غير مرتبط');
  await capture(page, directory, '11-reference-package.png', 'independent-reference-experience', records);

  await openKap(page);
  await expect(page.getByTestId('visual-screen-experience')).not.toContainText('مؤتمر مرجعي غير مرتبط');
  await capture(page, directory, '12-cross-switch-return-kap.png', 'cross-project-return-to-kap', records);

  expect(records).toHaveLength(12);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    stage: '3E.3 under UX.1C',
    project: testInfo.project.name,
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    stateContext: 'temporary-demo',
    authoringStatus: 'candidate',
    geometryStatus: 'provisional-unmapped',
    screenshots: records,
    noSensitiveData: true,
    noFabricatedGeometry: true
  }, null, 2));
});
