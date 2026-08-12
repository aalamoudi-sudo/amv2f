import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(360_000);

const reviewRoot = process.env.STAGE3E2_REVIEW_DIR ?? path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3e2-pilot-authoring-review'
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
  await expect(page.locator('p:visible').filter({ hasText: 'جاري تجهيز المشهد' })).toHaveCount(0);
  const visibleScenes = page.locator('[data-testid="scene-viewport"]:visible');
  for (let index = 0; index < await visibleScenes.count(); index += 1) {
    await expect(visibleScenes.nth(index)).toHaveAttribute('data-scene-ready', 'true');
    await expect(visibleScenes.nth(index)).toHaveAttribute('data-camera-settled', 'true');
  }
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(180);
}

async function imageDifferenceRatio(page: Page, first: Buffer, second: Buffer): Promise<number> {
  const sources = [first, second].map((image) => `data:image/png;base64,${image.toString('base64')}`);
  return page.evaluate(async ([firstSource, secondSource]) => {
    const decode = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('تعذر فك ترميز لقطة المراجعة.'));
      image.src = source;
    });
    const [firstImage, secondImage] = await Promise.all([decode(firstSource), decode(secondSource)]);
    if (firstImage.width !== secondImage.width || firstImage.height !== secondImage.height) return 1;
    const canvas = document.createElement('canvas');
    canvas.width = firstImage.width;
    canvas.height = firstImage.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('تعذر إنشاء سياق مقارنة اللقطات.');
    context.drawImage(firstImage, 0, 0);
    const firstPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(secondImage, 0, 0);
    const secondPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let changed = 0;
    for (let index = 0; index < firstPixels.length; index += 4) {
      if (Math.max(
        Math.abs(firstPixels[index] - secondPixels[index]),
        Math.abs(firstPixels[index + 1] - secondPixels[index + 1]),
        Math.abs(firstPixels[index + 2] - secondPixels[index + 2])
      ) >= 24) changed += 1;
    }
    return changed / (firstPixels.length / 4);
  }, sources);
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

async function assertNoSecrets(page: Page) {
  const text = await page.locator('body').innerText();
  for (const forbidden of ['accessToken', 'refreshToken', 'clientSecret', 'Bearer ', 'password=', 'PRIVATE KEY']) {
    expect(text).not.toContain(forbidden);
  }
}

async function capture(page: Page, directory: string, fileName: string, semanticState: string, records: ScreenshotRecord[], focus?: Locator) {
  if (focus) {
    await focus.evaluate((element) => {
      const workspace = element.closest<HTMLElement>('[data-testid="pilot-authoring-workspace"]');
      if (!workspace) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
        return;
      }
      const workspaceRect = workspace.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      workspace.scrollTop += elementRect.top - workspaceRect.top - Math.max(0, (workspace.clientHeight - element.clientHeight) / 2);
    });
    await expect(focus).toBeInViewport();
  }
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
  await assertNoSecrets(page);
  await waitForStableRendering(page);
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

test('Stage 3E.2 pilot authoring visual evidence is settled, distinct, and secret-free', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  await page.getByTestId('pilot-open-technical-fixture').click();
  await expect(page.getByTestId('pilot-authoring-workspace')).toBeVisible();

  await capture(page, directory, '01-input-inventory.png', 'input-inventory:templates-only', records, page.getByTestId('pilot-template-list'));
  await page.getByTestId('pilot-load-incomplete').click();
  await capture(page, directory, '02-missing-input-state.png', 'missing-input:incomplete-real-draft', records, page.getByTestId('pilot-input-status'));
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-validation-issues')).toContainText('يجب استكمال الحقل');
  await capture(page, directory, '03-completeness-dashboard.png', 'completeness:incomplete-real-draft', records, page.getByTestId('pilot-completeness'));
  await capture(page, directory, '13-blocking-validation.png', 'validation:blocking-incomplete-source', records, page.getByTestId('pilot-validation-report'));

  await page.getByTestId('pilot-load-fictional').click();
  await page.getByTestId('pilot-inject-id-conflict').click();
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-id-issues')).toContainText('مكرر');
  await capture(page, directory, '04-id-validation.png', 'identity:duplicate-blocked', records, page.getByTestId('pilot-id-validation'));

  await page.getByTestId('pilot-correct-draft').click();
  await page.getByTestId('pilot-validate').click();
  await expect(page.getByTestId('pilot-validation-issues')).toContainText('لا توجد مشاكل');
  await capture(page, directory, '05-spatial-validation.png', 'spatial:offset-geometry-valid', records, page.getByTestId('pilot-spatial-validation'));
  await capture(page, directory, '06-route-validation.png', 'routes:source-authority-version-visible', records, page.getByTestId('pilot-route-authoring'));
  await capture(page, directory, '07-readiness-validation.png', 'readiness:owners-sources-visible', records, page.getByTestId('pilot-readiness-authoring'));
  await capture(page, directory, '08-decision-validation.png', 'decisions:scope-authority-options-visible', records, page.getByTestId('pilot-decision-authoring'));
  await capture(page, directory, '09-role-authority-matrix.png', 'authority:separation-of-duty', records, page.getByTestId('pilot-authority-matrix'));
  await capture(page, directory, '10-evidence-source-register.png', 'evidence:register-only-no-files', records, page.getByTestId('pilot-evidence-sources'));
  await page.getByTestId('pilot-integration-path-physical').click();
  await capture(page, directory, '11-integration-candidate-manifest.png', 'integration:input-spatial-physical-candidates', records, page.getByTestId('pilot-integration-manifest'));

  await page.getByTestId('pilot-compile').click();
  await expect(page.getByTestId('pilot-package-preview')).toContainText('EVENT-PACKAGE-v1-');
  await capture(page, directory, '12-package-preview.png', 'package-preview:validated-event-package', records, page.getByTestId('pilot-package-preview'));
  await capture(page, directory, '14-fictional-compilation.png', 'compilation:fictional-success', records, page.getByTestId('pilot-validation-report'));

  await page.getByTestId('pilot-freeze').click();
  await expect(page.getByTestId('pilot-frozen-artifact')).toHaveAttribute('data-immutable', 'true');
  await capture(page, directory, '15-freeze-confirmation.png', 'freeze:local-fictional-revision-1', records, page.getByTestId('pilot-freeze-section'));
  await page.getByTestId('pilot-freeze-manifest-toggle').click();
  await expect(page.getByTestId('pilot-freeze-manifest')).toBeVisible();
  await capture(page, directory, '16-immutable-frozen-state.png', 'freeze:manifest-expanded-immutable', records, page.getByTestId('pilot-freeze-manifest'));

  await page.getByTestId('pilot-new-revision').click();
  await capture(page, directory, '17-new-revision.png', 'revision:editable-revision-2-prior-preserved', records, page.getByTestId('pilot-revision-comparison'));
  await page.getByTestId('pilot-validate').click();
  await page.getByTestId('pilot-compile').click();
  await page.getByTestId('pilot-freeze').click();
  await page.getByTestId('pilot-activate').click();
  await expect(page.getByTestId('pilot-activation-status')).toContainText('لم يُفعّل أثر تأليف بعد');
  await expect(page.getByTestId('pilot-authoring-metrics')).toContainText('فشل');
  await capture(page, directory, '18-activation.png', 'activation:blocked-unregistered-fictional-pilot', records, page.getByTestId('pilot-activation-proof'));

  await page.getByTestId('readiness-open').click();
  await page.getByTestId('readiness-view-plan').click();
  await expect(page.getByTestId('readiness-2d-zone-ZONE-PLT-001')).toHaveCount(0);
  await expect(page.getByTestId('readiness-2d-zone-ZONE-001')).toBeVisible();
  const twoDimensional = await capture(page, directory, '19-2d-package-view.png', '2d:local-demo-preserved-after-block', records, page.getByTestId('readiness-2d-plan'));
  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
  const threeDimensional = await capture(page, directory, '20-3d-package-view.png', '3d:local-demo-preserved-after-block', records, page.getByTestId('scene-viewport'));
  const changedPixelRatio = await imageDifferenceRatio(page, twoDimensional, threeDimensional);
  expect(changedPixelRatio).toBeGreaterThan(0.08);

  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  const reportDownload = page.waitForEvent('download');
  await page.getByTestId('pilot-export-report').click();
  expect((await reportDownload).suggestedFilename()).toBe('pilot-authoring-validation-report.json');
  await expect(page.getByTestId('pilot-export-status')).toContainText('تم تصدير تقرير التحقق');
  await capture(page, directory, '21-export-state.png', 'export:local-redacted-report', records, page.getByTestId('pilot-export-section'));

  await page.getByTestId('pilot-reset-draft').click();
  await expect(page.getByTestId('pilot-revision-list').locator('div')).toHaveCount(2);
  await capture(page, directory, '22-final-missing-data-register.png', 'missing-register:awaiting-ahmed', records, page.getByTestId('pilot-missing-data'));

  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    project: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records,
    twoDimensionalVsThreeDimensionalChangedPixelRatio: changedPixelRatio,
    secretScanPassed: true,
    sourceClassification: 'fictional-example',
    realPilotStatus: 'blocked-on-ahmed-inputs'
  }, null, 2));
});
