import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { buildGateway, type GatewayApplication } from '../../server/gateway/gateway';
import type { GatewayIngestionResult, GatewayObservationInput } from '../../server/gateway/types';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(300_000);

const port = 8787;
const secret = `temporary-visual-${randomUUID()}`;
const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3f1-trusted-gateway-review'
);

const screenshotNames = [
  '01-gateway-unavailable.png',
  '02-gateway-ready-no-external-device.png',
  '03-accepted-reported-observation.png',
  '04-authentication-rejected.png',
  '05-unknown-device-rejected.png',
  '06-stale-reading-quarantined.png',
  '07-duplicate-ignored.png',
  '08-conflict-quarantined.png',
  '09-observation-recovered-after-restart.png',
  '10-sse-reconnecting.png',
  '11-quarantine-view.png',
  '12-same-entity-2d-and-3d.png'
] as const;

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

function captureInput(
  sourceRecordId: string,
  idempotencyKey: string,
  sequence: number,
  overrides: Partial<GatewayObservationInput> = {}
): GatewayObservationInput {
  return {
    deviceId: 'DEVICE-IOT-COUNT-001',
    streamId: 'occupancy-count',
    sourceRecordId,
    idempotencyKey,
    eventRef: 'EVENT-GATEWAY-LOCAL',
    venueId: 'VENUE-GATEWAY-LOCAL',
    value: 42,
    valueType: 'number',
    unit: 'person',
    sourceTimestamp: new Date().toISOString(),
    sequence,
    offlineSequence: null,
    stateContext: 'temporary-demo',
    ...overrides
  };
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(300);
}

async function topRasterBrightness(page: Page, screenshot: Buffer): Promise<number> {
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
  return page.evaluate(async (source) => new Promise<number>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = Math.min(96, image.height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('Unable to inspect visual review screenshot.'));
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      resolve(total / (pixels.length / 4) / 3);
    };
    image.onerror = () => reject(new Error('Unable to decode visual review screenshot.'));
    image.src = source;
  }), dataUrl);
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string): Promise<void> {
  const workspace = page.getByTestId('iot-workspace');
  await expect(page.getByTestId('iot-workspace-loading')).toHaveCount(0);
  if (focusTestId) {
    await workspace.evaluate((element, targetTestId) => {
      const target = element.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
      if (!target) throw new Error(`Missing visual capture target ${targetTestId}`);
      const container = element.getBoundingClientRect();
      const bounds = target.getBoundingClientRect();
      const top = bounds.top - container.top - Math.max(16, (element.clientHeight - Math.min(bounds.height, element.clientHeight)) / 2);
      element.scrollTop = Math.max(0, element.scrollTop + top);
    }, focusTestId);
  } else {
    await workspace.evaluate((element) => { element.scrollTop = 0; });
  }
  await settle(page);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', secret, 'جهاز خارجي متصل فعلياً', 'live device connected']) {
    expect(bodyText).not.toContain(forbidden);
  }
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  expect(await topRasterBrightness(page, screenshot)).toBeGreaterThan(8);
}

async function openGatewayWorkspace(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('iot-workspace')).toBeVisible();
}

async function submitSource(payload: GatewayObservationInput, credential = secret): Promise<GatewayIngestionResult> {
  const response = await fetch(`http://127.0.0.1:${port}/api/iot/v1/observations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${credential}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json() as Promise<GatewayIngestionResult>;
}

test('Stage 3F.1 gateway visual review includes twelve durable, honest operator states', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_(INCOMPLETE_CHUNKED_ENCODING|CONNECTION_REFUSED)'
  }
}, async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'mayadeen-stage3f1-visual-'));
  const databasePath = path.join(databaseDirectory, 'gateway.sqlite');
  let application: GatewayApplication | null = null;
  const startGateway = async () => {
    application = await buildGateway({ dbPath: databasePath, sourceSecret: secret });
    await application.gateway.listen({ host: '127.0.0.1', port });
  };
  const stopGateway = async () => {
    if (!application) return;
    await application.gateway.close();
    application = null;
  };

  try {
    await openGatewayWorkspace(page);
    await expect(page.getByTestId('iot-gateway-unavailable')).toHaveText('البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة');
    await capture(page, directory, screenshotNames[0]);

    await startGateway();
    await page.getByTestId('iot-gateway-refresh').click();
    await expect(page.getByTestId('iot-gateway-status')).toContainText('جاهزة');
    await expect(page.getByTestId('iot-gateway-sse-connection')).toContainText('SSE: متصل');
    await capture(page, directory, screenshotNames[1]);

    const acceptedCapture = captureInput('VISUAL-ACCEPTED-001', 'VISUAL-ACCEPTED-001', 1);
    const accepted = await submitSource(acceptedCapture);
    expect(accepted.outcome).toBe('accepted-reported');
    await expect(page.getByTestId('iot-gateway-telemetry')).toContainText(accepted.observationId ?? 'missing');
    await capture(page, directory, screenshotNames[2], 'iot-gateway-telemetry');

    const rejectedAuth = await submitSource(captureInput('VISUAL-AUTH-001', 'VISUAL-AUTH-001', 2), 'wrong-temporary-credential');
    expect(rejectedAuth.outcome).toBe('rejected-authentication');
    await expect(page.getByTestId('iot-gateway-auth-rejected')).toBeVisible();
    await capture(page, directory, screenshotNames[3], 'iot-gateway-auth-rejected');

    const unknownDevice = await submitSource(captureInput('VISUAL-UNKNOWN-001', 'VISUAL-UNKNOWN-001', 3, { deviceId: 'DEVICE-UNKNOWN' }));
    expect(unknownDevice.outcome).toBe('rejected-unknown-device');
    await expect(page.getByTestId('iot-gateway-last-outcome')).toContainText('الجهاز غير موجود');
    await capture(page, directory, screenshotNames[4], 'iot-gateway-last-outcome');

    const stale = await submitSource(captureInput('VISUAL-STALE-001', 'VISUAL-STALE-001', 4, {
      sourceTimestamp: new Date(Date.now() - 3_600_000).toISOString()
    }));
    expect(stale.outcome).toBe('stale-quarantined');
    await expect(page.getByTestId('iot-gateway-quarantine')).toContainText('قراءة قديمة محجورة');
    await capture(page, directory, screenshotNames[5], 'iot-gateway-quarantine');

    const duplicateCapture = captureInput('VISUAL-DUPLICATE-001', 'VISUAL-DUPLICATE-001', 5);
    const duplicateAccepted = await submitSource(duplicateCapture);
    expect(duplicateAccepted.outcome).toBe('accepted-reported');
    const duplicate = await submitSource(duplicateCapture);
    expect(duplicate.outcome).toBe('duplicate-ignored');
    await expect(page.getByTestId('iot-gateway-last-outcome')).toContainText('إعادة مطابقة');
    await capture(page, directory, screenshotNames[6]);

    const conflict = await submitSource({ ...duplicateCapture, value: 43 });
    expect(conflict.outcome).toBe('conflict-quarantined');
    await expect(page.getByTestId('iot-gateway-quarantine')).toContainText('تعارض محجور');
    await capture(page, directory, screenshotNames[7], 'iot-gateway-quarantine');

    await stopGateway();
    await expect(page.getByTestId('iot-gateway-sse-reconnecting')).toBeVisible();
    await capture(page, directory, screenshotNames[9]);

    await startGateway();
    await page.getByTestId('iot-gateway-refresh').click();
    await expect(page.getByTestId('iot-gateway-status')).toContainText('استُعيدت البيانات بعد إعادة التشغيل');
    await expect(page.getByTestId('iot-gateway-sse-connection')).toContainText('SSE: متصل');
    await expect(page.getByTestId('iot-gateway-telemetry')).toContainText(accepted.observationId ?? 'missing');
    await capture(page, directory, screenshotNames[8], 'iot-gateway-telemetry');

    await capture(page, directory, screenshotNames[10], 'iot-gateway-quarantine');

    const link = page.getByTestId('iot-gateway-spatial-link');
    const entityId = await link.getAttribute('data-entity-id');
    await expect(page.getByTestId('gateway-spatial-2d')).toBeVisible();
    await page.getByTestId('iot-gateway-spatial-3d').click();
    await expect(page.getByTestId('gateway-spatial-3d')).toBeVisible();
    expect(await link.getAttribute('data-entity-id')).toBe(entityId);
    await capture(page, directory, screenshotNames[11], 'iot-gateway-spatial-link');

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const screenshots = screenshotNames.map((fileName) => {
      const screenshot = readFileSync(path.join(directory, fileName));
      expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
      expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
      return {
        fileName,
        width: viewport!.width,
        height: viewport!.height,
        sha256: createHash('sha256').update(screenshot).digest('hex')
      };
    });
    expect(new Set(screenshots.map((item) => item.sha256)).size).toBe(screenshotNames.length);
    writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
      project: testInfo.project.name,
      viewport,
      screenshots
    }, null, 2));
  } finally {
    await stopGateway();
    rmSync(databaseDirectory, { recursive: true, force: true });
  }
});
