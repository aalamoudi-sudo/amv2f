import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { Stage3F2SourceManifest } from '../../src/types/stage3f2';
import { stage3f2PilotTemplate, stage3f2PilotStatusText, validateStage3F2SourceManifest } from '../../src/services/stage3f2SourcePilot';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(180_000);

const reviewRoot = '/Users/mayadeen/Downloads/mayadeen-stage-3f2-source-readiness-harness-review';
const screenshotNames = [
  '01-external-source-readiness-overview.png',
  '02-missing-manifest.png',
  '03-missing-requirements.png',
  '04-privacy-boundary.png',
  '05-gateway-relationship.png',
  '06-reported-unverified-ready-for-source.png'
] as const;

function syntheticReadyManifest(): Stage3F2SourceManifest {
  return {
    ...stage3f2PilotTemplate,
    pilotId: 'CONFORMANCE-ONLY',
    eventId: 'EVENT-CONFORMANCE',
    venueId: 'VENUE-CONFORMANCE',
    entityId: 'ZONE-CONFORMANCE-001',
    zoneId: 'ZONE-CONFORMANCE-001',
    sourceId: 'SOURCE-CONFORMANCE',
    deviceId: 'DEVICE-CONFORMANCE',
    datastreamId: 'DATASTREAM-CONFORMANCE',
    sourceOwner: 'AUTOMATED-CONFORMANCE',
    technicalOwner: 'AUTOMATED-CONFORMANCE',
    approvedBy: 'AUTOMATED-CONFORMANCE',
    approvalDate: '2026-07-19',
    approvedScope: 'metadata-only',
    protocol: 'http-json-polling',
    authenticationMethod: 'server-side credential reference',
    environmentVariableNames: ['STAGE3F2_SOURCE_ENDPOINT', 'STAGE3F2_SOURCE_AUTH_REFERENCE'],
    observationFields: ['occupancyCount'],
    units: ['count'],
    expectedFrequencySeconds: 60,
    timePolicy: 'reported source time and gateway receipt time remain distinct',
    retentionPolicy: 'explicit policy required',
    privacyClassification: 'restricted',
    networkBoundary: 'approved boundary required',
    rollbackOwner: 'AUTOMATED-CONFORMANCE',
    pilotStart: '2026-07-19',
    pilotEnd: '2026-07-20',
    successThresholds: ['schema-valid observation'],
    accessAvailable: true,
    realSourceApproved: true
  };
}

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function openIoTWorkspace(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await expect(page.getByTestId('iot-workspace')).toBeVisible();
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(250);
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string): Promise<void> {
  const workspace = page.getByTestId('iot-workspace');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (element.scrollTop > 0) element.scrollTop = 0;
      if (element.scrollLeft > 0) element.scrollLeft = 0;
    });
  });
  if (focusTestId) {
    await workspace.evaluate((element, targetTestId) => {
      const target = element.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
      if (!target) throw new Error(`Missing visual capture target ${targetTestId}`);
      const container = element.getBoundingClientRect();
      const bounds = target.getBoundingClientRect();
      const top = bounds.top - container.top - Math.max(16, (element.clientHeight - Math.min(bounds.height, element.clientHeight)) / 2);
      element.scrollTop = Math.max(0, element.scrollTop + top);
    }, focusTestId);
  }
  await settle(page);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/https?:\/\/|(?:\d{1,3}\.){3}\d{1,3}/);
  for (const forbidden of ['STAGE3F2_SOURCE_', 'PRIVATE KEY', 'accessToken', 'clientSecret']) {
    expect(bodyText).not.toContain(forbidden);
  }
  await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
}

test('Stage 3F.2 gates missing, incomplete, and synthetic-ready manifests without a live-source claim', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_CONNECTION_REFUSED'
  }
}, async ({ page }) => {
  const missing = validateStage3F2SourceManifest(stage3f2PilotTemplate);
  const incomplete = validateStage3F2SourceManifest({ ...stage3f2PilotTemplate, pilotId: 'CONFORMANCE-DRAFT' });
  const ready = validateStage3F2SourceManifest(syntheticReadyManifest());
  expect(missing.readyForRealSource).toBe(false);
  expect(incomplete.readyForRealSource).toBe(false);
  expect(ready.readyForRealSource).toBe(true);
  expect(stage3f2PilotStatusText()).toBe('READY_FOR_REAL_SOURCE');

  await openIoTWorkspace(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('stage-3f2-status-banner')).toContainText('STAGE_3F2_STATUS=READY_FOR_REAL_SOURCE');
  await expect(page.getByTestId('stage-3f2-status-banner')).toContainText('لا مصدر حقيقي متصل بعد');
  await expect(page.getByTestId('iot-source-simulator')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'none');

  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('iot-gateway-unavailable')).toBeVisible();
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'http-sse');
  await expect(page.getByTestId('iot-local-only-label')).toHaveCount(0);
  await expect(page.getByTestId('stage-3f2-manifest-state')).toContainText('manifest: مفقود');
  await expect(page.getByTestId('stage-3f2-missing-requirements')).toContainText('لا توجد موافقة مكتوبة');
  await expect(page.getByTestId('stage-3f2-privacy-boundary')).toContainText('لا فيديو خام');
  await expect(page.getByTestId('stage-3f2-gateway-relationship')).toContainText('لا fallback إلى المحاكاة');
  await expect(page.getByTestId('stage-3f2-truth-boundary')).toContainText('بيانات مُبلّغ عنها وغير متحققة');
});

test('Stage 3F.2 visual review captures six redacted readiness states at every supported resolution', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_CONNECTION_REFUSED'
  }
}, async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await openIoTWorkspace(page);
  await capture(page, directory, screenshotNames[0]);

  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('iot-gateway-unavailable')).toBeVisible();
  await capture(page, directory, screenshotNames[1], 'stage-3f2-manifest-state');
  await capture(page, directory, screenshotNames[2], 'stage-3f2-missing-requirements');
  await capture(page, directory, screenshotNames[3], 'stage-3f2-privacy-boundary');
  await capture(page, directory, screenshotNames[4], 'stage-3f2-gateway-relationship');
  await capture(page, directory, screenshotNames[5], 'stage-3f2-truth-boundary');

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
});
