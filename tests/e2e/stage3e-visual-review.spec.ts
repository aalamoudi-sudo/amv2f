import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

test.setTimeout(180_000);

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3e-universal-event-configuration-review'
);

const screenshotNames = [
  '01-package-library.png',
  '02-exhibition-package-overview.png',
  '03-exhibition-2d-view.png',
  '04-exhibition-3d-view.png',
  '05-conference-package-overview.png',
  '06-conference-2d-view.png',
  '07-conference-3d-view.png',
  '08-festival-package-overview.png',
  '09-festival-2d-view.png',
  '10-festival-3d-view.png',
  '11-operational-pack-dependencies.png',
  '12-role-authority-matrix.png',
  '13-integration-profiles.png',
  '14-invalid-package-rejection.png',
  '15-missing-dependency-rejection.png',
  '16-successful-activation.png',
  '17-cross-project-activation-blocked.png',
  '18-full-event-configuration-workspace.png'
] as const;

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function stable(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(300);
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string): Promise<Buffer> {
  const workspace = page.getByTestId('event-configuration-workspace');
  if (focusTestId) {
    await workspace.evaluate((element, testId) => {
      const target = element.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!target) throw new Error(`Missing visual target ${testId}`);
      const containerRect = element.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const centered = targetRect.top - containerRect.top - Math.max(12, (element.clientHeight - Math.min(targetRect.height, element.clientHeight)) / 2);
      element.scrollTop = Math.max(0, element.scrollTop + centered);
    }, focusTestId);
  } else {
    await workspace.evaluate((element) => { element.scrollTop = 0; });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('command-open')).toBeVisible();
  await expect(page.getByTestId('command-open')).toBeInViewport();
  await stable(page);
  return page.screenshot({ path: path.join(directory, fileName), fullPage: false });
}

async function selectPackage(page: Page, eventType: 'exhibition' | 'conference' | 'festival') {
  await page.getByTestId(`event-package-select-${eventType}`).click();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
  await expect(page.getByTestId('package-3d-preview').getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
  await stable(page);
}

async function captureState(
  basePage: Page,
  directory: string,
  fileName: string,
  eventType: 'exhibition' | 'conference' | 'festival',
  focusTestId: string,
  setup?: (page: Page) => Promise<void>,
  attempt = 1
) {
  const browser = basePage.context().browser();
  if (!browser) throw new Error('Browser instance is unavailable for isolated visual capture.');
  const context = await browser.newContext({
    viewport: basePage.viewportSize() ?? { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    colorScheme: 'dark'
  });
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  const projectContext = eventType === 'conference'
    ? { projectId: 'PROJECT-REFERENCE-CONFERENCE-001', eventId: 'EVENT-CONFERENCE-DEMO-001' }
    : { projectId: 'PROJECT-REFERENCE-EXHIBITION-001', eventId: 'EVENT-EXHIBITION-DEMO-001' };
  await page.goto(`/?project=${projectContext.projectId}&event=${projectContext.eventId}&workspace=configuration`);
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
  await expect(page.getByTestId('package-3d-preview').getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
  if (eventType === 'festival') await selectPackage(page, eventType);
  if (setup) await setup(page);
  const screenshot = await capture(page, directory, fileName, focusTestId);
  await context.close();
  expect(browserErrors, `Browser errors while capturing ${fileName}`).toEqual([]);
  const navigationBrightness = await averageTopBrightness(basePage, screenshot);
  if (navigationBrightness < 8) {
    if (attempt >= 3) throw new Error(`Navigation raster stayed blank for ${fileName}; average brightness ${navigationBrightness}.`);
    await captureState(basePage, directory, fileName, eventType, focusTestId, setup, attempt + 1);
  }
}

async function averageTopBrightness(page: Page, screenshot: Buffer): Promise<number> {
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(async (source) => new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = Math.min(96, image.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('Unable to inspect screenshot pixels.'));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      resolve(total / (pixels.length / 4) / 3);
    };
    image.onerror = () => reject(new Error('Unable to decode screenshot for navigation verification.'));
    image.src = source;
  }), dataUrl);
}

test('Stage 3E universal event configuration visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await captureState(page, directory, screenshotNames[0], 'exhibition', 'event-package-library');
  await captureState(page, directory, screenshotNames[1], 'exhibition', 'selected-package-definition');
  await captureState(page, directory, screenshotNames[2], 'exhibition', 'package-2d-preview');
  await captureState(page, directory, screenshotNames[3], 'exhibition', 'package-3d-preview');
  await captureState(page, directory, screenshotNames[4], 'conference', 'selected-package-definition');
  await captureState(page, directory, screenshotNames[5], 'conference', 'package-2d-preview');
  await captureState(page, directory, screenshotNames[6], 'conference', 'package-3d-preview');
  await captureState(page, directory, screenshotNames[7], 'festival', 'selected-package-definition');
  await captureState(page, directory, screenshotNames[8], 'festival', 'package-2d-preview');
  await captureState(page, directory, screenshotNames[9], 'festival', 'package-3d-preview');
  await captureState(page, directory, screenshotNames[10], 'festival', 'package-dependencies');
  await captureState(page, directory, screenshotNames[11], 'festival', 'package-role-authority');
  await captureState(page, directory, screenshotNames[12], 'conference', 'package-integration-profiles');
  await captureState(page, directory, screenshotNames[13], 'festival', 'package-validation-status', async (reviewPage) => {
    await reviewPage.getByTestId('simulate-invalid-package').click();
    await expect(reviewPage.getByTestId('package-validation-issues')).toBeVisible();
  });
  await captureState(page, directory, screenshotNames[14], 'festival', 'package-validation-status', async (reviewPage) => {
    await reviewPage.getByTestId('simulate-missing-dependency').click();
    await expect(reviewPage.getByTestId('package-validation-issues')).toContainText('تحتاج إلى تفعيل');
  });
  await captureState(page, directory, screenshotNames[15], 'exhibition', 'package-validation-status', async (reviewPage) => {
    await reviewPage.getByTestId('event-package-activate').click();
    await expect(reviewPage.getByTestId('package-active-identity')).toContainText('معرض');
  });
  await captureState(page, directory, screenshotNames[16], 'exhibition', 'package-validation-status', async (reviewPage) => {
    await reviewPage.getByTestId('event-package-activate').click();
    await selectPackage(reviewPage, 'conference');
    await expect(reviewPage.getByTestId('package-project-mismatch')).toBeVisible();
    await expect(reviewPage.getByTestId('event-package-activate')).toBeDisabled();
    await expect(reviewPage.getByTestId('package-active-identity')).toContainText('معرض');
  });
  await captureState(page, directory, screenshotNames[17], 'festival', 'package-comparison');

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const hashes = screenshotNames.map((fileName) => {
    const screenshot = readFileSync(path.join(directory, fileName));
    expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
    expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
    return createHash('sha256').update(screenshot).digest('hex');
  });
  expect(new Set(hashes).size).toBe(screenshotNames.length);
});
