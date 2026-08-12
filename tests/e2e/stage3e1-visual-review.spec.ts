import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(360_000);

const reviewRoot = process.env.STAGE3E1_REVIEW_DIR ?? path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3e1-final-closure-review'
);

const packages = [
  {
    projectId: 'PROJECT-REFERENCE-EXHIBITION-001',
    eventType: 'exhibition',
    slug: 'exhibition',
    labelAr: 'معرض',
    eventId: 'EVENT-EXHIBITION-DEMO-001',
    venueId: 'VENUE-EXHIBITION-DEMO-001',
    entityId: 'ZONE-EXH-002',
    routeId: 'ROUTE-EXH-001',
    decisionId: 'DECISION-EXH-001',
    resultEventId: 'EVENT-EXHIBITION-001',
    scenarioId: 'scenario-exhibition-readiness',
    projectionProfileId: 'projection-profile-exhibition'
  },
  {
    projectId: 'PROJECT-REFERENCE-CONFERENCE-001',
    eventType: 'conference',
    slug: 'conference',
    labelAr: 'مؤتمر',
    eventId: 'EVENT-CONFERENCE-DEMO-001',
    venueId: 'VENUE-CONFERENCE-DEMO-001',
    entityId: 'ZONE-CONF-001',
    routeId: 'ROUTE-CONF-001',
    decisionId: 'DECISION-CONF-001',
    resultEventId: 'EVENT-CONFERENCE-001',
    scenarioId: 'scenario-conference-readiness',
    projectionProfileId: 'projection-profile-conference'
  }
] as const;

type ReviewPackage = typeof packages[number];

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
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.waitForTimeout(200);
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
    let materiallyChangedPixels = 0;
    const totalPixels = firstPixels.length / 4;
    for (let index = 0; index < firstPixels.length; index += 4) {
      const difference = Math.max(
        Math.abs(firstPixels[index] - secondPixels[index]),
        Math.abs(firstPixels[index + 1] - secondPixels[index + 1]),
        Math.abs(firstPixels[index + 2] - secondPixels[index + 2])
      );
      if (difference >= 24) materiallyChangedPixels += 1;
    }
    return materiallyChangedPixels / totalPixels;
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
      for (let index = 0; index < pixels.length; index += 4) {
        total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      }
      resolve(total / (pixels.length / 4) / 3);
    };
    image.onerror = () => reject(new Error('تعذر فك ترميز لقطة المراجعة.'));
    image.src = imageSource;
  }), source);
}

async function capture(
  page: Page,
  directory: string,
  fileName: string,
  semanticState: string,
  records: ScreenshotRecord[],
  focus?: Locator
): Promise<Buffer> {
  if (focus) {
    await focus.evaluate((element) => {
      element.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('main').first()).toHaveAttribute('dir', 'rtl');
  await waitForStableRendering(page);
  const screenshot = await page.screenshot({
    path: path.join(directory, fileName),
    fullPage: false,
    animations: 'disabled'
  });
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

async function openConfiguration(page: Page) {
  if (!(await page.getByTestId('event-configuration-workspace').isVisible().catch(() => false))) {
    await openTechnicalWorkspace(page, 'configuration-open');
  }
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
}

function projectWorkspacePath(eventPackage: ReviewPackage, workspace: string): string {
  return `/?project=${eventPackage.projectId}&event=${eventPackage.eventId}&workspace=${workspace}`;
}

async function selectPackage(page: Page, eventPackage: ReviewPackage) {
  await openConfiguration(page);
  await page.getByTestId(`event-package-select-${eventPackage.eventType}`).click();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
}

async function activate(page: Page, eventPackage: ReviewPackage) {
  await page.goto(projectWorkspacePath(eventPackage, 'configuration'));
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await selectPackage(page, eventPackage);
  await page.getByTestId('event-package-activate').click();
}

async function setPanelState(page: Page, panel: 'dashboard' | 'inspector', collapsed: boolean) {
  const button = page.getByTestId(`panel-toggle-${panel}`);
  const label = await button.getAttribute('aria-label');
  const isCollapsed = label?.startsWith('فتح') ?? false;
  if (isCollapsed !== collapsed) await button.click();
}

test('Stage 3E.1 universal runtime visual review package is semantically and perceptually distinct', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];
  const comparisons: Array<{ package: string; twoDimensionalVsThreeDimensionalChangedPixelRatio: number }> = [];

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());

  for (const [index, current] of packages.entries()) {
    const prefix = `${String(index + 1).padStart(2, '0')}-${current.slug}`;
    await activate(page, current);
    await page.getByTestId('event-configuration-workspace').evaluate((element) => { element.scrollTop = 0; });
    await expect(page.getByTestId('package-active-identity')).toContainText(current.labelAr);
    await expect(page.getByTestId('package-active-identity')).toContainText(current.eventId);
    await expect(page.getByTestId('package-active-identity')).toContainText(current.venueId);
    await expect(page.getByTestId('package-template-instance')).toContainText(current.eventType);
    await expect(page.getByTestId('package-template-instance')).toBeInViewport();
    await capture(page, directory, `${prefix}-01-active-package.png`, `active-package:${current.eventId}`, records, page.getByTestId('package-active-identity'));

    await page.getByTestId('readiness-open').click();
    await page.getByTestId('readiness-view-plan').click();
    await expect(page.getByTestId('readiness-view-plan')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId(`readiness-2d-zone-${current.entityId}`)).toBeVisible();
    await expect(page.getByTestId('readiness-2d-plan')).toHaveAttribute('data-spatial-bounds', /\d/);
    const twoDimensional = await capture(page, directory, `${prefix}-02-2d-plan.png`, `2d-plan:${current.entityId}`, records, page.getByTestId('readiness-2d-plan'));

    await page.getByTestId('command-open').click();
    await setPanelState(page, 'dashboard', true);
    await setPanelState(page, 'inspector', true);
    await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-spatial-size', /\d/);
    await expect(page.getByTestId('scene-spatial-extent')).toBeVisible();
    const spatialExtent = await page.getByTestId('scene-spatial-extent').innerText();
    const threeDimensional = await capture(page, directory, `${prefix}-03-3d-operator.png`, `3d-operator:${current.entityId}:${spatialExtent}`, records, page.getByTestId('scene-viewport'));
    const changedPixelRatio = await imageDifferenceRatio(page, twoDimensional, threeDimensional);
    expect(changedPixelRatio, `${current.eventType} 2D/3D evidence differed only by rendering noise`).toBeGreaterThan(0.08);
    comparisons.push({ package: current.eventType, twoDimensionalVsThreeDimensionalChangedPixelRatio: changedPixelRatio });

    await setPanelState(page, 'inspector', false);
    await expect(page.getByTestId(`route-toggle-${current.routeId}`)).toBeVisible();
    await capture(page, directory, `${prefix}-04-runtime-routes.png`, `runtime-route:${current.routeId}`, records, page.getByTestId(`route-toggle-${current.routeId}`));

    await page.getByTestId('readiness-open').click();
    await expect(page.getByTestId(`readiness-zone-row-${current.entityId}`)).toBeVisible();
    await capture(page, directory, `${prefix}-05-package-readiness.png`, `readiness:${current.entityId}`, records, page.getByTestId(`readiness-zone-row-${current.entityId}`));

    await page.getByTestId('decisions-open').click();
    await page.getByTestId(`decision-row-${current.decisionId}`).click();
    await expect(page.getByTestId('decision-center')).toHaveAttribute('data-event-id', current.eventId);
    await expect(page.getByTestId('decision-center')).toHaveAttribute('data-venue-id', current.venueId);
    await capture(page, directory, `${prefix}-06-package-decision.png`, `decision:${current.decisionId}`, records, page.getByTestId('decision-details'));

    await page.getByTestId('decision-create-open').click();
    await page.getByTestId('decision-create-title').fill(`قرار تحقق بصري ${current.labelAr}`);
    await page.getByTestId('decision-create-description').fill('مسودة محلية لإثبات عزل نطاق الفعالية والموقع.');
    await page.getByTestId('decision-create-entity').fill(current.entityId);
    await page.getByTestId('decision-create-owner').fill('مالك قرار محلي');
    await page.getByTestId('decision-create-responsible').fill('مسؤول تنفيذ محلي');
    await page.getByTestId('decision-create-submit').click();
    await expect(page.getByTestId('decision-event-id')).toContainText(current.eventId);
    await expect(page.getByTestId('decision-venue-id')).toContainText(current.venueId);
    await page.getByTestId('decision-event-id').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('decision-event-id')).toBeInViewport();
    await expect(page.getByTestId('decision-venue-id')).toBeInViewport();
    await capture(page, directory, `${prefix}-07-new-scoped-decision.png`, `new-decision:${current.eventId}:${current.venueId}`, records, page.getByTestId('decision-event-id'));

    await page.getByTestId('command-open').click();
    await setPanelState(page, 'inspector', false);
    await expect(page.getByTestId('scenario-select')).toHaveValue(current.scenarioId);
    await page.getByTestId('scenario-start').click();
    await expect(page.getByTestId('scenario-progress')).not.toHaveAttribute('style', 'width: 0%;');
    await expect(page.getByTestId('scenario-message')).not.toBeEmpty();
    await capture(page, directory, `${prefix}-08-package-scenario.png`, `scenario:${current.scenarioId}`, records, page.getByTestId('scenario-message'));

    await openTechnicalWorkspace(page, 'integration-open');
    await expect(page.getByTestId('integration-active-context')).toContainText(current.eventId);
    await expect(page.getByTestId('integration-workspace')).toHaveAttribute('data-venue-id', current.venueId);
    await page.getByTestId('simulate-valid').click();
    await expect(page.getByTestId(`event-${current.resultEventId}`)).toBeVisible();
    await capture(page, directory, `${prefix}-09-integration-context.png`, `integration:${current.eventId}`, records, page.getByTestId('integration-active-context'));

    await openTechnicalWorkspace(page, 'projection-open');
    await expect(page.getByTestId('projection-toolbar')).toHaveAttribute('data-projection-profile-id', current.projectionProfileId);
    await expect(page.getByTestId('active-projection-profile')).toContainText('معاينة محلية بلا معايرة');
    await capture(page, directory, `${prefix}-10-projection-profile.png`, `projection:${current.projectionProfileId}`, records, page.getByTestId('projection-toolbar'));
    await page.getByTestId('projection-close').click();

    await openConfiguration(page);
    const alternate = packages[(index + 1) % packages.length];
    await selectPackage(page, alternate);
    await expect(page.getByTestId('package-project-mismatch')).toBeVisible();
    await expect(page.getByTestId('event-package-activate')).toBeDisabled();
    await expect(page.getByTestId('package-active-identity')).toContainText(current.labelAr);
    await capture(page, directory, `${prefix}-11-cross-project-block.png`, `cross-project-block:${current.eventId}`, records, page.getByTestId('package-validation-status'));

    await page.getByTestId('package-reset').click();
    await expect(page.getByTestId('package-active-identity')).toContainText(current.labelAr);
    await expect(page.getByTestId('selected-package-definition')).toContainText(current.eventId.includes('EXHIBITION') ? 'EVENT-PACKAGE-EXHIBITION-DEMO' : 'EVENT-PACKAGE-CONFERENCE-DEMO');
    await capture(page, directory, `${prefix}-12-reset.png`, `reset:${current.eventType}`, records, page.getByTestId('package-active-identity'));

    await page.getByTestId('package-json-input').fill(JSON.stringify({
      packageId: `EVENT-PACKAGE-MALFORMED-${current.eventType.toUpperCase()}`,
      eventType: current.eventType,
      spatialConfiguration: { modelReferences: [{}] },
      requirementConfiguration: [null],
      temporaryDemoSeedData: { readinessRecords: 'wrong' }
    }));
    await page.getByTestId('package-json-preview').click();
    await expect(page.getByTestId('package-validation-issues')).toContainText('بنية الحزمة غير صالحة');
    await expect(page.getByTestId('event-package-activate')).toBeDisabled();
    await capture(page, directory, `${prefix}-13-malformed-rejection.png`, `malformed-rejection:${current.eventType}`, records, page.getByTestId('package-validation-issues'));
  }

  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify({
    project: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records,
    comparisons
  }, null, 2)}\n`);

  for (const file of records) {
    const screenshot = readFileSync(path.join(directory, file.fileName));
    expect(createHash('sha256').update(screenshot).digest('hex')).toBe(file.sha256);
  }
});
