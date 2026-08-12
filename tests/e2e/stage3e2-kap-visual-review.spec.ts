import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(360_000);

const reviewRoot = process.env.STAGE3E2_KAP_REVIEW_DIR ?? path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3e2-kap-pilot-authoring-review'
);

interface ScreenshotRecord {
  fileName: string;
  sha256: string;
  width: number;
  height: number;
  semanticState: string;
  settled: true;
}

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function waitForStableRendering(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-testid$="-loading"]:visible')).toHaveCount(0);
  await expect(page.locator('.animate-spin:visible')).toHaveCount(0);
  await expect(page.getByText('جاري تجهيز المشهد', { exact: false })).toHaveCount(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(160);
}

async function averageTopBrightness(page: Page, screenshot: Buffer): Promise<number> {
  const source = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(async (imageSource) => new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = Math.min(96, image.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('تعذر فحص أعلى لقطة المراجعة.'));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      resolve(total / (pixels.length / 4) / 3);
    };
    image.onerror = () => reject(new Error('تعذر فك ترميز لقطة المراجعة.'));
    image.src = imageSource;
  }), source);
}

async function assertNoSensitiveData(page: Page) {
  const text = await page.locator('body').innerText();
  for (const forbidden of ['accessToken', 'refreshToken', 'clientSecret', 'Bearer ', 'password=', 'PRIVATE KEY', '@mayadeen.sa', '0531600055']) {
    expect(text).not.toContain(forbidden);
  }
  expect(text).not.toContain('جاهزة للإنتاج');
  expect(text).not.toContain('هندسة تشغيلية معتمدة');
}

async function focusWithinWorkspace(page: Page, focus: Locator) {
  await focus.evaluate((element) => {
    const workspace = element.closest<HTMLElement>('[data-testid="pilot-authoring-workspace"]');
    if (!workspace) return element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const workspaceRect = workspace.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    workspace.scrollTop += elementRect.top - workspaceRect.top - Math.max(24, (workspace.clientHeight - Math.min(element.clientHeight, 620)) / 2);
  });
  await expect(focus).toBeInViewport();
}

async function capture(page: Page, directory: string, fileName: string, semanticState: string, records: ScreenshotRecord[], focus: Locator) {
  await focusWithinWorkspace(page, focus);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const application = document.querySelector<HTMLElement>('main');
    if (application) application.scrollTop = 0;
  });
  await expect(page.locator('main').first()).toHaveAttribute('dir', 'rtl');
  const applicationHeader = page.locator('main > div > header');
  await expect(applicationHeader).toBeInViewport();
  expect(await applicationHeader.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(0);
  await waitForStableRendering(page);
  await assertNoSensitiveData(page);
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const width = screenshot.readUInt32BE(16);
  const height = screenshot.readUInt32BE(20);
  expect(width).toBe(viewport!.width);
  expect(height).toBe(viewport!.height);
  expect(await averageTopBrightness(page, screenshot)).toBeGreaterThan(8);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Unintended duplicate screenshot: ${fileName}`).toBe(false);
  records.push({ fileName, sha256, width, height, semanticState, settled: true });
  return screenshot;
}

test('KAP pilot candidate visual review contains sixteen settled governed states', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  await expect(page.getByTestId('pilot-authoring-workspace')).toBeVisible();

  await capture(page, directory, '01-authoring-overview.png', 'candidate-overview', records, page.getByTestId('kap-authoring-overview'));

  await page.getByTestId('kap-section-identity').click();
  await expect(page.getByTestId('kap-event-identity')).toContainText('EVENT-KAP-OPENING-2026');
  await capture(page, directory, '02-event-identity.png', 'event-and-venue-identity', records, page.getByTestId('kap-event-identity'));
  await page.getByTestId('kap-date-assumption-expand').click();
  await expect(page.getByTestId('kap-date-assumption-detail')).toBeVisible();
  await capture(page, directory, '03-date-assumption.png', 'date-assumption-awaiting-ahmed', records, page.getByTestId('kap-date-assumption'));

  await page.getByTestId('kap-section-scope').click();
  await expect(page.getByTestId('kap-five-entity-scope').locator('button')).toHaveCount(5);
  await capture(page, directory, '04-five-entity-scope.png', 'five-stable-unmapped-entities', records, page.getByTestId('kap-five-entity-scope'));

  await page.getByTestId('kap-section-governance').click();
  await expect(page.getByTestId('kap-governance-assignments')).toContainText('إبراهيم الغمري');
  await capture(page, directory, '05-governance-assignments.png', 'project-assignments-without-production-identity', records, page.getByTestId('kap-governance-assignments'));

  await page.getByTestId('kap-section-authority').click();
  await page.getByTestId('kap-authority-misuse-test').click();
  await expect(page.getByTestId('kap-authority-error')).toContainText('اعتماد أحمد للمنصة لا يساوي');
  await capture(page, directory, '06-authority-boundaries.png', 'platform-authority-separated-from-external-authorities', records, page.getByTestId('kap-authority-boundaries'));

  await page.getByTestId('kap-section-sources').click();
  await expect(page.getByTestId('kap-source-register')).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  await capture(page, directory, '07-source-register.png', 'governed-source-register', records, page.getByTestId('kap-source-register'));

  await page.getByTestId('kap-section-cad').click();
  await expect(page.getByTestId('kap-provisional-cad')).toContainText('مخطط مبدئي — غير معتمد');
  await capture(page, directory, '08-provisional-dwg-status.png', 'provisional-cad-no-geometry-claim', records, page.getByTestId('kap-provisional-cad'));

  await page.getByTestId('kap-section-spatial').click();
  await expect(page.getByTestId('kap-spatial-2d-state')).toContainText('الموقع غير مثبت على المخطط');
  await capture(page, directory, '09-unmapped-entity.png', 'unmapped-2d-state', records, page.getByTestId('kap-spatial-2d-state'));

  await page.getByTestId('kap-section-assets3d').click();
  await expect(page.getByTestId('kap-3d-candidates')).toContainText('PHOTOBOOTH 3.skp2.skp');
  await capture(page, directory, '10-candidate-3d-sources.png', 'candidate-3d-conversion-pending', records, page.getByTestId('kap-3d-candidates'));

  await page.getByTestId('kap-section-missing').click();
  await page.getByTestId('kap-missing-source-SOURCE-KAP-FLOOR-PLANS-001').click();
  const floorPlans = page.getByTestId('kap-missing-inputs').getByText('مخططات الطوابق الرسمية', { exact: true });
  await expect(floorPlans).toBeVisible();
  await capture(page, directory, '11-missing-floor-plans.png', 'floor-plans-missing', records, floorPlans);
  await page.getByTestId('kap-missing-source-SOURCE-KAP-2D-IDENTITY-001').click();
  const identity = page.getByTestId('kap-missing-inputs').getByText('أصول الهوية ثنائية الأبعاد', { exact: true });
  await expect(identity).toBeVisible();
  await focusWithinWorkspace(page, identity);
  await page.evaluate(() => {
    const workspace = document.querySelector<HTMLElement>('[data-testid="pilot-authoring-workspace"]');
    if (workspace) workspace.scrollTop += 72;
  });
  await capture(page, directory, '12-missing-2d-identity.png', '2d-identity-missing', records, identity);

  await page.getByTestId('kap-section-evidence').click();
  await expect(page.getByTestId('kap-evidence-quarantine')).toContainText('محجور');
  await capture(page, directory, '13-evidence-quarantine.png', 'incomplete-media-evidence-quarantined', records, page.getByTestId('kap-evidence-quarantine'));

  await page.getByTestId('kap-section-freeze').click();
  await page.getByTestId('kap-freeze-attempt').click();
  await expect(page.getByTestId('kap-freeze-result')).toContainText('فشلت المحاولة بأمان');
  await expect(page.getByTestId('kap-freeze-gates').locator(':scope > div')).toHaveCount(12);
  await capture(page, directory, '14-freeze-blockers.png', 'twelve-freeze-gates-blocked', records, page.getByTestId('kap-freeze-gates'));

  await page.getByTestId('kap-section-cad-diff').click();
  await expect(page.getByTestId('kap-cad-diff')).toContainText('غير قابل للمقارنة');
  await capture(page, directory, '15-cad-replacement-diff.png', 'cad-diff-awaiting-approved-revision', records, page.getByTestId('kap-cad-diff'));

  await page.getByTestId('kap-section-overview').click();
  await expect(page.getByTestId('kap-authoring-overview')).toContainText('حزمة فعالية واقعية مرشحة محلياً');
  await capture(page, directory, '16-full-command-center-view.png', 'full-authoring-command-center', records, page.getByTestId('kap-authoring-overview'));

  expect(records).toHaveLength(16);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    project: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records,
    eventId: 'EVENT-KAP-OPENING-2026',
    venueId: 'VENUE-KAP-001',
    authoringLifecycle: 'candidate',
    stateContext: 'temporary-demo',
    geometryStatus: 'provisional-unmapped',
    freezeStatus: 'blocked',
    sensitiveDataScanPassed: true
  }, null, 2));
});
