import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

async function openIoTLab(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await expect(page).toHaveURL(/workspace=iot/);
  await expect(page.getByTestId('iot-workspace')).toBeVisible();
  await expect(page.getByTestId('iot-local-only-label')).toBeVisible();
}

test('IoT workspace loads lazily and remains explicitly local-only', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  expect(scripts.some((url) => url.includes('IoTIntegrationWorkspace-'))).toBe(false);
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await expect(page.getByTestId('iot-workspace')).toBeVisible();
  await expect.poll(() => scripts.some((url) => url.includes('IoTIntegrationWorkspace-'))).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('iot-local-only-label')).toContainText('لا أجهزة ولا تغذية تشغيلية حية');
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'none');
});

test('device registry exposes streams, simulated health and no production identity', async ({ page }) => {
  await openIoTLab(page);
  await expect(page.getByTestId('iot-device-registry').locator('button')).toHaveCount(3);
  await expect(page.getByTestId('iot-device-details')).toContainText('هوية الإنتاج');
  await expect(page.getByTestId('iot-device-details')).toContainText('غير متوفرة');
  await expect(page.getByTestId('iot-device-health')).toContainText('لا يوجد اتصال فعلي');
  await expect(page.getByTestId('iot-device-count')).toContainText('٣');
});

test('fresh telemetry becomes reported sensor event without changing app baseline or verified projection', async ({ page }) => {
  await openIoTLab(page);
  const baselineBefore = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  await page.getByTestId('simulate-iot-fresh').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('مقبول كمُبلّغ');
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('sensor.observed');
  await expect(page.getByTestId('iot-operational-events')).toContainText('مُبلّغ — غير متحقق');
  await expect(page.getByTestId('iot-projection-count')).toContainText('٠');
  const baselineAfter = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(baselineAfter).toBe(baselineBefore);
});

test('unknown, disabled, unit, value and cross-event violations are rejected in Arabic', async ({ page }) => {
  await openIoTLab(page);
  const cases = [
    ['simulate-iot-unknown-device', 'غير موجود'],
    ['simulate-iot-disabled-device', 'معطّل'],
    ['simulate-iot-invalid-unit', 'وحدتها'],
    ['simulate-iot-invalid-value', 'لا تطابق'],
    ['simulate-iot-cross-event', 'سياق الفعالية']
  ] as const;
  for (const [testId, expected] of cases) {
    await page.getByTestId(testId).click();
    await expect(page.getByTestId('iot-ingestion-results')).toContainText('مرفوض');
    await expect(page.getByTestId('iot-ingestion-results')).toContainText(expected);
  }
  await expect(page.getByTestId('iot-telemetry-stream')).toContainText('لا توجد قراءات مقبولة');
});

test('threshold is reported for review but never described as an approved alarm', async ({ page }) => {
  await openIoTLab(page);
  await page.getByTestId('simulate-iot-threshold').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('مقبول كمُبلّغ');
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('ليس إنذارًا معتمدًا');
  await expect(page.getByTestId('iot-projection-count')).toContainText('٠');
});

test('duplicates and same-key conflicting content remain distinct outcomes with one stored reading', async ({ page }) => {
  await openIoTLab(page);
  await page.getByTestId('simulate-iot-duplicate').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('تكرار محجوب');
  await expect(page.getByTestId('iot-telemetry-stream').locator(':scope > div')).toHaveCount(1);
  await page.getByTestId('simulate-iot-key-conflict').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('تعارض يحتاج مراجعة');
  await expect(page.getByTestId('iot-telemetry-stream').locator(':scope > div')).toHaveCount(1);
});

test('stale readings are quarantined and do not replace the latest accepted telemetry', async ({ page }) => {
  await openIoTLab(page);
  await page.getByTestId('simulate-iot-fresh').click();
  await expect(page.getByTestId('iot-telemetry-stream')).toContainText('182');
  await page.getByTestId('simulate-iot-stale').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('قراءة قديمة محجورة');
  await expect(page.getByTestId('iot-quarantine-count')).toContainText('١');
  await expect(page.getByTestId('iot-telemetry-stream').locator(':scope > div')).toHaveCount(1);
});

test('offline queue replays once and the next replay is blocked as duplicate', async ({ page }) => {
  await openIoTLab(page);
  await page.getByTestId('simulate-iot-offline').click();
  await expect(page.getByTestId('iot-offline-queue')).toContainText('بانتظار إعادة التشغيل');
  await page.getByTestId('replay-iot-offline').click();
  await expect(page.getByTestId('iot-offline-queue')).toContainText('أعيدت مرة واحدة');
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('أعيد تشغيلها مرة واحدة');
  await page.getByTestId('replay-iot-offline').click();
  await expect(page.getByTestId('iot-ingestion-results')).toContainText('تكرار محجوب');
  await expect(page.getByTestId('iot-telemetry-stream').locator(':scope > div')).toHaveCount(1);
});

test('timeout clearly shows last-known simulated value and never changes the spatial entity state', async ({ page }) => {
  await openIoTLab(page);
  await page.getByTestId('simulate-iot-fresh').click();
  await page.getByTestId('simulate-iot-timeout').click();
  await expect(page.getByTestId('iot-device-health')).toContainText('غير متصل في المحاكاة');
  await expect(page.getByTestId('iot-device-health')).toContainText('ليست الحالة الحالية');
  await expect(page.getByTestId('iot-projection-count')).toContainText('٠');
});

test('2D and 3D use the same entity and mapping identity without inventing approved geometry', async ({ page }) => {
  await openIoTLab(page);
  const link = page.getByTestId('iot-spatial-link');
  const entityId = await link.getAttribute('data-entity-id');
  const mappingVersion = await link.getAttribute('data-mapping-version');
  expect(entityId).toBeTruthy();
  expect(mappingVersion).toBeTruthy();
  await expect(page.getByTestId('iot-spatial-2d')).toContainText(entityId ?? 'missing');
  await page.getByTestId('iot-spatial-3d-open').click();
  await expect(page.getByTestId('iot-spatial-3d')).toContainText(entityId ?? 'missing');
  await expect(link).toContainText('لا هندسة معتمدة');
  await page.getByTestId('iot-select-spatial-entity').click();
  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
});

test('reset clears only the local IoT lab state', async ({ page }) => {
  await openIoTLab(page);
  const baselineBefore = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  await page.getByTestId('simulate-iot-fresh').click();
  await page.getByTestId('iot-reset').click();
  await expect(page.getByTestId('iot-telemetry-stream')).toContainText('لا توجد قراءات مقبولة');
  await expect(page.getByTestId('iot-operational-events')).toContainText('لا أحداث مشتقة');
  const baselineAfter = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(baselineAfter).toBe(baselineBefore);
});
