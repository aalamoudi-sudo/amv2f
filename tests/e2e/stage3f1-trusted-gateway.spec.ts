import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { buildGateway, type GatewayApplication } from '../../server/gateway/gateway';
import type { GatewayIngestionResult, GatewayObservationInput } from '../../server/gateway/types';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const port = 8787;
const secret = `temporary-e2e-${randomUUID()}`;
const directory = mkdtempSync(path.join(tmpdir(), 'mayadeen-stage3f1-e2e-'));
const databasePath = path.join(directory, 'gateway.sqlite');
let application: GatewayApplication | null = null;

function capture(overrides: Partial<GatewayObservationInput> = {}): GatewayObservationInput {
  const now = new Date().toISOString();
  return {
    deviceId: 'DEVICE-IOT-COUNT-001',
    streamId: 'occupancy-count',
    sourceRecordId: 'E2E-SOURCE-001',
    idempotencyKey: 'E2E-IDEMPOTENCY-001',
    eventRef: 'EVENT-GATEWAY-LOCAL',
    venueId: 'VENUE-GATEWAY-LOCAL',
    value: 42,
    valueType: 'number',
    unit: 'person',
    sourceTimestamp: now,
    sequence: 1,
    offlineSequence: null,
    stateContext: 'temporary-demo',
    ...overrides
  };
}

async function startGateway(): Promise<void> {
  application = await buildGateway({ dbPath: databasePath, sourceSecret: secret });
  await application.gateway.listen({ host: '127.0.0.1', port });
}

async function stopGateway(): Promise<void> {
  if (!application) return;
  await application.gateway.close();
  application = null;
}

async function submitSource(payload: GatewayObservationInput, credential = secret): Promise<GatewayIngestionResult> {
  const response = await fetch(`http://127.0.0.1:${port}/api/iot/v1/observations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${credential}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json() as Promise<GatewayIngestionResult>;
}

async function openGatewayWorkspace(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('iot-gateway-ready-label')).toContainText('بوابة محلية دائمة — لا يوجد جهاز خارجي متصل');
  await expect(page.getByTestId('iot-gateway-sse-connection')).toContainText('SSE: متصل');
}

test.beforeAll(async () => {
  await startGateway();
});

test.afterAll(async () => {
  await stopGateway();
  rmSync(directory, { recursive: true, force: true });
});

test('durable gateway is explicit in the browser and survives source submission, outage, restart, duplicate, conflict, and SSE recovery', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_(INCOMPLETE_CHUNKED_ENCODING|CONNECTION_REFUSED)'
  }
}, async ({ page }) => {
  await openGatewayWorkspace(page);
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'http-sse');
  await expect(page.getByTestId('iot-local-only-label')).toHaveCount(0);
  const baselineBefore = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));

  const original = capture();
  const accepted = await submitSource(original);
  expect(accepted.outcome).toBe('accepted-reported');
  await expect(page.getByTestId('iot-gateway-telemetry')).toContainText(accepted.observationId ?? 'missing');
  await expect(page.getByTestId('iot-gateway-last-known')).toContainText(accepted.observationId ?? 'missing');
  const baselineAfter = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(baselineAfter).toBe(baselineBefore);
  await expect(page.getByText('إسقاط متحقق')).toBeVisible();

  await stopGateway();
  await expect(page.getByTestId('iot-gateway-sse-reconnecting')).toBeVisible();
  await page.getByTestId('iot-gateway-refresh').click();
  await expect(page.getByTestId('iot-gateway-unavailable')).toHaveText('البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة');
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'http-sse');
  await expect(page.getByTestId('iot-local-only-label')).toHaveCount(0);

  await startGateway();
  await page.getByTestId('iot-gateway-refresh').click();
  await expect(page.getByTestId('iot-gateway-status')).toContainText('استُعيدت البيانات بعد إعادة التشغيل');
  await expect(page.getByTestId('iot-gateway-telemetry')).toContainText(accepted.observationId ?? 'missing');
  await expect(page.getByTestId('iot-gateway-sse-connection')).toContainText('SSE: متصل');

  const duplicate = await submitSource(original);
  expect(duplicate.outcome).toBe('duplicate-ignored');
  await expect(page.getByTestId('iot-gateway-last-outcome')).toContainText('إعادة مطابقة');
  const conflict = await submitSource({ ...original, value: 43 });
  expect(conflict.outcome).toBe('conflict-quarantined');
  await expect(page.getByTestId('iot-gateway-quarantine')).toContainText('تعارض محجور');
  await expect(page.getByTestId('iot-gateway-telemetry').locator(':scope > div')).toHaveCount(1);
});

test('gateway exposes authentication and unknown-device rejection as sanitized browser states without a browser credential', async ({ page }) => {
  await openGatewayWorkspace(page);
  const rejectedAuth = await submitSource(capture({ sourceRecordId: 'E2E-AUTH', idempotencyKey: 'E2E-AUTH', sequence: 2 }), 'wrong-local-credential');
  expect(rejectedAuth.outcome).toBe('rejected-authentication');
  await expect(page.getByTestId('iot-gateway-auth-rejected')).toBeVisible();
  const unknown = await submitSource(capture({ sourceRecordId: 'E2E-UNKNOWN', idempotencyKey: 'E2E-UNKNOWN', deviceId: 'DEVICE-UNKNOWN', sequence: 2 }));
  expect(unknown.outcome).toBe('rejected-unknown-device');
  await expect(page.getByTestId('iot-gateway-last-outcome')).toContainText('الجهاز غير موجود');
});
