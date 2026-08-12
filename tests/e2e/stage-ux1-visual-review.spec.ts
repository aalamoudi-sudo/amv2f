import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { buildGateway, type GatewayApplication } from '../../server/gateway/gateway';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(300_000);

const loopbackPort = 8791;
const sourceSecret = `temporary-ux1-visual-${randomUUID()}`;
const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-ux1-command-experience-after'
);

const screenshotNames = [
  '01-neutral-launcher.png',
  '02-executive-five-second-overview.png',
  '03-critical-action-center.png',
  '04-operational-workspace.png',
  '05-hybrid-spatial-workspace.png',
  '06-list-selection.png',
  '07-2d-selection.png',
  '08-3d-selection.png',
  '09-decision-details.png',
  '10-data-trust-details.png',
  '11-global-search.png',
  '12-search-empty-state.png',
  '13-technical-administration-drawer.png',
  '14-iot-local-simulator.png',
  '15-gateway-unavailable.png',
  '16-candidate-experience-intelligence.png',
  '17-empty-operational-state.png',
  '18-navigation-error-state.png',
  '19-disconnected-sse-reconnecting.png',
  '20-ultra-wide-layout.png'
] as const;

interface ScreenshotRecord {
  fileName: string;
  semanticState: string;
  width: number;
  height: number;
  sha256: string;
  settled: true;
}

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-testid$="-loading"]:visible')).toHaveCount(0);
  await expect(page.locator('.animate-spin:visible')).toHaveCount(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(350);
}

async function topBrightness(page: Page, screenshot: Buffer): Promise<number> {
  const source = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(async (imageSource) => new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = Math.min(image.height, 96);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('visual-review-canvas-unavailable'));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      resolve(total / (pixels.length / 4) / 3);
    };
    image.onerror = () => reject(new Error('visual-review-image-decode-failed'));
    image.src = imageSource;
  }), source);
}

async function visiblePixelRatio(page: Page, screenshot: Buffer): Promise<number> {
  const source = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(async (imageSource) => new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('visual-review-canvas-unavailable'));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 75) visible += 1;
      }
      resolve(visible / (pixels.length / 4));
    };
    image.onerror = () => reject(new Error('visual-review-image-decode-failed'));
    image.src = imageSource;
  }), source);
}

async function capture(
  page: Page,
  directory: string,
  fileName: string,
  semanticState: string,
  records: ScreenshotRecord[]
): Promise<void> {
  await settle(page);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of [sourceSecret, 'accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'جهاز خارجي متصل فعلياً', 'live device connected']) {
    expect(bodyText).not.toContain(forbidden);
  }
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
  // Dialog scrims intentionally dim the command header; this still rejects an empty black strip.
  expect(await topBrightness(page, screenshot)).toBeGreaterThan(6);
  expect(await visiblePixelRatio(page, screenshot)).toBeGreaterThan(0.015);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Unexpected duplicate screenshot: ${fileName}`).toBe(false);
  records.push({ fileName, semanticState, width: viewport!.width, height: viewport!.height, sha256, settled: true });
}

async function openIoT(page: Page): Promise<void> {
  await openTechnicalWorkspace(page, 'iot-open');
  await expect(page.getByTestId('iot-data-source-selector')).toBeVisible();
}

test('Stage UX.1 visual review records twenty honest command states at each desktop viewport', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_(CONNECTION_REFUSED|INCOMPLETE_CHUNKED_ENCODING|CONNECTION_CLOSED)'
  }
}, async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];
  const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'mayadeen-stage-ux1-visual-'));
  const databasePath = path.join(databaseDirectory, 'gateway.sqlite');
  let gateway: GatewayApplication | null = null;

  const startGateway = async () => {
    gateway = await buildGateway({ dbPath: databasePath, sourceSecret });
    await gateway.gateway.listen({ host: '127.0.0.1', port: loopbackPort });
  };
  const stopGateway = async () => {
    if (!gateway) return;
    await gateway.gateway.close();
    gateway = null;
  };

  try {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('neutral-launcher')).toBeVisible();
    await capture(page, directory, screenshotNames[0], 'neutral-launcher', records);

    await page.getByTestId('command-open').click();
    await expect(page.getByTestId('operational-command-center')).toBeVisible();
    await page.getByTestId('executive-open').click();
    await expect(page.getByTestId('executive-overview')).toBeVisible();
    await capture(page, directory, screenshotNames[1], 'executive-five-second-overview', records);

    await page.goto('/?project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&workspace=executive');
    await expect(page.getByTestId('critical-action-center')).toBeVisible();
    await capture(page, directory, screenshotNames[2], 'critical-action-center', records);

    await page.getByTestId('command-open').click();
    await expect(page.getByTestId('operational-command-center')).toBeVisible();
    await capture(page, directory, screenshotNames[3], 'operational-workspace', records);

    await page.getByTestId('spatial-open').click();
    await expect(page.getByTestId('spatial-workspace')).toBeVisible();
    await page.getByTestId('spatial-view-hybrid').click();
    await capture(page, directory, screenshotNames[4], 'hybrid-spatial-workspace', records);

    await page.getByTestId('spatial-view-list').click();
    const selectedEntityId = await page.getByTestId('spatial-attention-list').locator('button').first().getAttribute('data-testid');
    const selectedEntity = selectedEntityId?.replace('spatial-list-', '');
    expect(selectedEntity).toBeTruthy();
    await page.getByTestId(`spatial-list-${selectedEntity}`).click();
    await expect(page.getByTestId(`spatial-list-${selectedEntity}`)).toHaveAttribute('aria-pressed', 'true');
    await capture(page, directory, screenshotNames[5], 'list-selection', records);

    await page.getByTestId('spatial-view-2d').click();
    await page.getByTestId(`readiness-2d-zone-${selectedEntity}`).click();
    await expect(page.getByTestId(`readiness-2d-zone-${selectedEntity}`)).toHaveAttribute('aria-pressed', 'true');
    await capture(page, directory, screenshotNames[6], '2d-selection', records);

    await page.getByTestId('spatial-view-3d').click();
    await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', selectedEntity!);
    await capture(page, directory, screenshotNames[7], '3d-selection', records);

    await page.getByTestId('decisions-open').click();
    await expect(page.getByTestId('decision-details')).toBeVisible();
    await capture(page, directory, screenshotNames[8], 'decision-details', records);

    await page.getByTestId('command-open').click();
    await page.getByTestId(`zone-list-item-${selectedEntity}`).click();
    await page.getByTestId('operator-flow-provenance-toggle').click();
    await expect(page.getByTestId('operator-flow-provenance')).toBeVisible();
    await capture(page, directory, screenshotNames[9], 'data-trust-details', records);

    await page.getByTestId('global-search-open').click();
    await page.getByTestId('global-search-input').fill(selectedEntity!);
    await expect(page.getByTestId('global-search-results')).toBeVisible();
    await capture(page, directory, screenshotNames[10], 'global-search', records);

    await page.getByTestId('global-search-input').fill('لا توجد نتيجة UX1');
    await expect(page.getByTestId('global-search-empty')).toBeVisible();
    await capture(page, directory, screenshotNames[11], 'search-empty-state', records);

    await page.getByTestId('global-search-close').click();
    await page.getByTestId('technical-drawer-open').click();
    await expect(page.getByTestId('technical-administration-drawer')).toBeVisible();
    await capture(page, directory, screenshotNames[12], 'technical-administration-drawer', records);

    await page.getByTestId('iot-open').click();
    await expect(page.getByTestId('iot-local-only-label')).toBeVisible();
    await capture(page, directory, screenshotNames[13], 'iot-local-simulator', records);

    await page.goto('/?gatewayUrl=http://127.0.0.1:65531');
    await openIoT(page);
    await page.getByTestId('iot-source-gateway').click();
    await expect(page.getByTestId('iot-gateway-unavailable')).toContainText('البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة');
    await capture(page, directory, screenshotNames[14], 'gateway-unavailable', records);

    await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=experience');
    await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
    await capture(page, directory, screenshotNames[15], 'candidate-experience-intelligence', records);

    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/?workspace=executive');
    await expect(page.getByTestId('portfolio-context-message')).toContainText('مشروعًا صريحًا');
    await capture(page, directory, screenshotNames[16], 'empty-operational-state', records);

    await page.goto('/?workspace=unknown');
    await expect(page.getByTestId('portfolio-context-message')).toContainText('مساحة العمل المطلوبة غير معروفة');
    await capture(page, directory, screenshotNames[17], 'navigation-error-state', records);

    await startGateway();
    await page.goto(`/?gatewayUrl=http://127.0.0.1:${loopbackPort}`);
    await openIoT(page);
    await page.getByTestId('iot-source-gateway').click();
    await expect(page.getByTestId('iot-gateway-status')).toContainText('جاهزة');
    await expect(page.getByTestId('iot-gateway-sse-connection')).toContainText('SSE: متصل');
    await stopGateway();
    await expect(page.getByTestId('iot-gateway-sse-reconnecting')).toBeVisible();
    await capture(page, directory, screenshotNames[18], 'disconnected-sse-reconnecting', records);

    await page.goto('/');
    await page.getByTestId('command-open').click();
    await expect(page.getByTestId('operational-command-center')).toBeVisible();
    await capture(page, directory, screenshotNames[19], 'ultra-wide-layout', records);

    expect(records).toHaveLength(screenshotNames.length);
    writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
      project: testInfo.project.name,
      viewport: page.viewportSize(),
      screenshots: records,
      checks: {
        exactDimensions: true,
        uniqueHashes: true,
        noLoadingOverlay: true,
        noSecretOrLiveDeviceClaim: true,
        noArtificialBlackStrip: true
      }
    }, null, 2));
  } finally {
    await stopGateway();
    rmSync(databaseDirectory, { recursive: true, force: true });
  }
});
