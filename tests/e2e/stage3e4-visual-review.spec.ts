import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

test.setTimeout(240_000);

const reviewRoot = process.env.STAGE3E4_REVIEW_DIR ?? path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-3e4-kap-working-cad-spatial-review');
const kapSpatialAuthoringUrl = '/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=spatial-authoring';

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

async function capture(page: Page, directory: string, fileName: string, semanticState: string, records: ScreenshotRecord[], focus?: Locator): Promise<void> {
  if (focus) await focus.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await settle(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['/Users/mayadeen/', 'accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'جاهزية 100%', 'مسار إخلاء معتمد']) expect(bodyText).not.toContain(forbidden);
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize()!;
  expect(screenshot.readUInt32BE(16)).toBe(viewport.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport.height);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Unintended duplicate screenshot: ${fileName}`).toBe(false);
  records.push({ fileName, sha256, width: viewport.width, height: viewport.height, semanticState });
}

test('Stage 3E.4 visual review captures the working authority and safe conversion boundary', async ({ page }, testInfo) => {
  const directory = path.join(reviewRoot, testInfo.project.name);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto(kapSpatialAuthoringUrl);
  await expect(page.getByTestId('kap-spatial-authoring-workspace')).toBeVisible();
  await capture(page, directory, '01-kap-source-authority.png', 'kap-project-context-working-authority-source-hash', records, page.getByTestId('cad-source-authority'));

  await page.getByTestId('project-switcher-trigger').click();
  await capture(page, directory, '02-project-context-switcher.png', 'active-kap-project-switcher', records, page.getByTestId('project-switcher-menu'));
  await page.keyboard.press('Escape');

  await capture(page, directory, '03-conversion-required-canvas.png', 'full-2d-conversion-required-layer-browser', records, page.getByTestId('cad-vector-preview'));
  await capture(page, directory, '04-five-zone-mappings.png', 'five-stable-zones-unmapped-conflict-protection', records, page.getByTestId('cad-zone-mapping-panel'));
  await capture(page, directory, '05-inspection-and-history.png', 'inspection-xref-original-provenance-history', records, page.getByTestId('cad-inspection-summary'));
  await capture(page, directory, '06-flat-preview-and-gates.png', 'safe-flat-preview-freeze-gates', records, page.getByTestId('cad-flat-preview'));
  await page.getByTestId('cad-permitted-use').focus();
  await capture(page, directory, '07-route-authority-blocked.png', 'permitted-use-and-blocked-route-authority', records, page.getByTestId('cad-permitted-use'));

  await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=spatial');
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await capture(page, directory, '08-kap-spatial-safe-output.png', 'kap-spatial-output-no-mapped-geometry', records);

  await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=experience');
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await capture(page, directory, '09-experience-map-unmapped.png', 'experience-map-no-spatial-projection', records);

  await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=executive');
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
  await capture(page, directory, '10-executive-command-unmapped.png', 'executive-command-no-spatial-projection', records);

  await page.goto('/?project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&workspace=spatial-authoring');
  await expect(page.getByTestId('cad-project-isolation-error')).toBeVisible();
  await capture(page, directory, '11-project-switch-isolation.png', 'reference-project-blocks-kap-cad', records);

  expect(records).toHaveLength(11);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    stage: '3E.4',
    project: testInfo.project.name,
    sourceHash: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d',
    authorityAssertionId: 'AUTH-KAP-DWG-WORKING-20260721',
    effectiveClassification: 'approved-working-baseline',
    conversionStatus: 'conversion-required',
    mappingStatus: '0/5 unmapped',
    spatialProjectionVersion: null,
    screenshots: records,
    noSensitiveData: true,
    noFabricatedGeometry: true,
    noRouteAuthority: true
  }, null, 2));
});
