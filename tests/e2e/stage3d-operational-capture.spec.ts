import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

async function openIntegrationLab(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
}

test('integration workspace JavaScript is loaded only when the operator opens it', async ({ page }) => {
  const scriptRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scriptRequests.push(request.url());
  });

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  expect(scriptRequests.some((url) => url.includes('OperationalCaptureLab-'))).toBe(false);

  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
  await expect.poll(() => scriptRequests.some((url) => url.includes('OperationalCaptureLab-'))).toBe(true);
});

test('integration lab loads in Arabic RTL with local simulation classification', async ({ page }) => {
  await openIntegrationLab(page);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('integration-demo-label')).toContainText('بيانات محاكاة محلية');
  await expect(page.getByTestId('integration-adapter-registry').locator('button')).toHaveCount(10);
  await expect(page.getByTestId('adapter-capability-view')).toContainText('لا حزمة مورّد');
  await expect(page.getByTestId('untrusted-identity-time-note')).toContainText('غير موثقتين');
});

test('a simulated system record becomes an accepted append-only event without touching the app baseline', async ({ page }) => {
  await openIntegrationLab(page);
  const baselineBefore = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  await page.getByTestId('simulate-valid').click();
  await expect(page.getByTestId('event-EVENT-VALID')).toBeVisible();
  await expect(page.getByTestId('integration-validation-results')).toContainText('قُبل الحدث في السجل المحلي');
  await expect(page.getByTestId('capture-envelope-stream')).toContainText('ENVELOPE-VALID');
  const baselineAfter = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(baselineAfter).toBe(baselineBefore);
});

test('invalid and duplicate source records are rejected visibly and do not add trusted events', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-invalid').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('غير معروف');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-"]')).toHaveCount(0);

  await page.getByTestId('simulate-valid').click();
  await page.getByTestId('simulate-duplicate').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('حُجب التكرار');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-"]')).toHaveCount(1);
});

test('action gateway rejects unauthorized actions and missing critical evidence in Arabic', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-unauthorized').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('لا يملك سلطة');
  await page.getByTestId('simulate-missing-evidence').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('دليل');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-"]')).toHaveCount(0);
});

test('offline event queues, replays once, and a second replay cannot duplicate it', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-offline').click();
  await expect(page.getByTestId('offline-queue')).toContainText('بانتظار إعادة التشغيل');
  await page.getByTestId('replay-offline').click();
  await expect(page.getByTestId('offline-queue')).toContainText('أعيد مرة واحدة');
  await expect(page.getByTestId('event-EVENT-OFFLINE')).toBeVisible();
  await page.getByTestId('replay-offline').click();
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-"]')).toHaveCount(1);
});

test('a stale offline conflict enters review and cannot silently alter the projection', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-valid').click();
  const projectionBefore = await page.getByTestId('canonical-state-projection').getAttribute('data-projection-version');
  await page.getByTestId('simulate-conflict').click();
  await expect(page.getByTestId('conflict-review-queue')).toContainText('يلزم مراجعة بشرية');
  await expect(page.getByTestId('conflict-review-queue')).toContainText('مكتمل دون تحقق');
  await expect(page.getByTestId('conflict-review-queue')).toContainText('قيد التنفيذ');
  await expect(page.getByTestId('canonical-state-projection')).toHaveAttribute('data-projection-version', projectionBefore ?? '');
});

test('reported observation stays outside verified state while verified event updates the canonical projection', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-reported').click();
  await expect(page.getByTestId('event-EVENT-REPORTED')).toBeVisible();
  await expect(page.getByTestId('canonical-state-projection')).toContainText('لا توجد حالة متحققة');

  await page.getByTestId('simulate-verified').click();
  await expect(page.getByTestId('projected-state-ZONE-005')).toContainText('تم التحقق');
  await expect(page.getByTestId('trust-state-pipeline')).toContainText('متحقق');
});

test('scenario stays isolated and 2D, 3D, geospatial, and physical previews share one projection version', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-verified').click();
  const demoVersion = await page.getByTestId('canonical-state-projection').getAttribute('data-projection-version');
  await page.getByTestId('simulate-scenario').click();
  await expect(page.getByTestId('projected-state-ZONE-005')).toContainText('تم التحقق');
  await expect(page.getByTestId('canonical-state-projection')).toHaveAttribute('data-projection-version', demoVersion ?? '');

  const version2d = await page.getByTestId('spatial-output-2d').getAttribute('data-projection-version');
  await expect(page.getByTestId('spatial-output-3d')).toHaveAttribute('data-projection-version', version2d ?? '');
  await expect(page.getByTestId('geospatial-output-preview')).toHaveAttribute('data-projection-version', version2d ?? '');
  await expect(page.getByTestId('physical-output-preview')).toHaveAttribute('data-projection-version', version2d ?? '');
  await expect(page.getByTestId('physical-output-preview')).toContainText('لا أجهزة');
});

test('correction and error declaration preserve original events instead of editing history', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-valid').click();
  await page.getByTestId('simulate-verified').click();
  await page.getByTestId('simulate-correction').click();
  await expect(page.getByTestId('event-EVENT-VALID')).toBeVisible();
  await expect(page.getByTestId('event-EVENT-VERIFIED')).toBeVisible();
  await expect(page.getByTestId('event-EVENT-CORRECTION')).toBeVisible();
  await expect(page.getByTestId('projected-state-ZONE-005')).toContainText('مكتمل دون تحقق');

  await page.getByTestId('simulate-error-declaration').click();
  await expect(page.getByTestId('event-EVENT-ERROR-DECLARATION')).toBeVisible();
  await expect(page.getByTestId('event-EVENT-VALID')).toBeVisible();
});

test('source-clock drift is preserved as a warning and reset clears every local lab state', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-clock-drift').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('وقت المصدر يختلف');
  await page.getByTestId('simulate-offline').click();
  await page.getByTestId('integration-reset').click();
  await expect(page.getByTestId('capture-envelope-stream')).toContainText('لا توجد سجلات');
  await expect(page.getByTestId('operational-event-stream')).toContainText('السجل فارغ');
  await expect(page.getByTestId('offline-queue')).toContainText('القائمة فارغة');
  await expect(page.getByTestId('canonical-projection-version')).toHaveText(/^PROJECTION-v1-[a-f0-9]{64}$/);
});

test('accepted governed action completes the atomic local path end to end', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-accepted-action').click();
  await expect(page.getByTestId('governed-action-execution')).toContainText('تنفيذ محاكي محلي');
  await expect(page.getByTestId('governed-action-execution').locator('[data-step-status="passed"]')).toHaveCount(6);
  await expect(page.getByTestId('governed-action-execution')).toContainText('حالة الادعاء');
  await expect(page.getByTestId('governed-action-execution')).toContainText('مدرج في نسب الإسقاط');
  await expect(page.getByTestId('governed-action-execution')).toContainText('إصدار المخرج');
  await expect(page.getByTestId('event-EVENT-ACTION-ACCEPTED')).toBeVisible();
  await expect(page.getByTestId('integration-validation-results')).toContainText('اكتمل المسار');
  await expect(page.getByTestId('connected-provenance-graph')).toHaveAttribute('data-connected', 'true');
  await expect(page.getByTestId('connected-provenance-graph')).toContainText('نشاط الموائم مرتبط بجهة المصدر');
});

test('composite provenance and missing agent association are rejected visibly in Arabic', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-composite-provenance').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('عقدتين مختلفتين');
  await expect(page.getByTestId('connected-provenance-graph')).toHaveAttribute('data-connected', 'false');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(0);

  await page.getByTestId('simulate-missing-agent-association').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('تربط نشاط الموائم بجهة المصدر');
  const validationText = await page.getByTestId('integration-validation-results').innerText();
  expect(validationText).not.toContain('provenance-');
  expect(validationText).not.toContain('$.');
});

test('event payload mismatch is blocked before repository append', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-event-payload-mismatch').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('بصمة حمولة الحدث لا تطابق');
  await expect(page.getByTestId('governed-action-execution').locator('[data-step-status="not-run"]')).toHaveCount(2);
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(0);
});

test('rejected and unrelated evidence are blocked by the resolver', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-rejected-evidence').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('مرفوض أو منتهي');
  await page.getByTestId('simulate-unrelated-evidence').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('غير مرتبط بالعنصر');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(0);
});

test('dangling provenance and negative offline sequence are blocked', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-dangling-provenance').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('غير قابل للحل');
  await page.getByTestId('simulate-negative-offline').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('عدداً صحيحاً موجباً');
});

test('successful action retry is idempotent and a changed payload conflicts', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-accepted-action').click();
  await page.getByTestId('simulate-action-retry').click();
  const validationResults = page.getByTestId('integration-validation-results');
  await expect(validationResults.locator('[data-outcome="duplicate"]').first()).toContainText('إعادة إرسال الإجراء المطابق');
  await page.getByTestId('simulate-key-conflict').click();
  await expect(validationResults.locator('[data-outcome="conflict"]').first()).toContainText('محتوى مختلف');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(1);
});

test('repository-backed duplicate and conflict detection survives gateway recreation', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-accepted-action').click();
  await page.getByTestId('simulate-recreated-gateway-retry').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('بوابة محلية جديدة');
  await expect(page.getByTestId('integration-validation-results')).toContainText('دون إضافة حدث ثانٍ');
  await page.getByTestId('simulate-recreated-gateway-conflict').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('اكتشفت بوابة محلية جديدة تعارض');
  await expect(page.getByTestId('governed-action-execution')).toContainText('لم يُثبت أي مفتاح');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(1);
});

test('failed event construction leaves no partial event and permits retry', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-factory-failure').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('تعذر إنشاء الحدث');
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-ACTION"]')).toHaveCount(0);
  await page.getByTestId('simulate-factory-failure').click();
  await expect(page.getByTestId('event-EVENT-ACTION-FACTORY-FAILURE')).toBeVisible();
});

test('cross-context correction is rejected and preserves accepted history', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-cross-context-correction').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('سياقات الحالة');
  await expect(page.getByTestId('event-EVENT-CORRECTION')).toHaveCount(0);
  await expect(page.getByTestId('event-EVENT-VALID')).toBeVisible();
});

test('projection digest changes with semantic content and altered output fails synchronization', async ({ page }) => {
  await openIntegrationLab(page);
  const before = await page.getByTestId('canonical-projection-version').textContent();
  await page.getByTestId('simulate-accepted-action').click();
  const after = await page.getByTestId('canonical-projection-version').textContent();
  expect(after).not.toBe(before);
  expect(after).toMatch(/^PROJECTION-v1-[a-f0-9]{64}$/);
  await page.getByTestId('simulate-altered-output').click();
  await expect(page.getByTestId('integration-validation-results')).toContainText('نسب الأحداث');
});

test('output commands have distinct content identities while sharing projection identity', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-verified').click();
  const outputs = ['spatial-output-2d', 'spatial-output-3d', 'geospatial-output-preview', 'physical-output-preview'];
  const identities = await Promise.all(outputs.map(async (testId) => ({
    projection: await page.getByTestId(testId).getAttribute('data-projection-version'),
    command: await page.getByTestId(testId).getAttribute('data-command-id'),
    hash: await page.getByTestId(testId).getAttribute('data-command-content-hash')
  })));
  expect(new Set(identities.map((identity) => identity.projection)).size).toBe(1);
  expect(new Set(identities.map((identity) => identity.command)).size).toBe(4);
  expect(identities.every((identity) => /^[a-f0-9]{64}$/.test(identity.hash ?? ''))).toBe(true);
});

test('all ten adapters and seven executable schemas report their individual results', async ({ page }) => {
  await openIntegrationLab(page);
  await expect(page.getByTestId('adapter-conformance-matrix').locator('[data-testid^="conformance-"]')).toHaveCount(10);
  await expect(page.getByTestId('adapter-conformance-matrix')).toContainText('١٠');
  await expect(page.getByTestId('schema-validation-result')).toContainText('٧');
  await expect(page.getByTestId('schema-validation-result')).toContainText('٠');
});

test('alternate injected lab configuration loads without leaking the primary entity', async ({ page }) => {
  await openIntegrationLab(page);
  await page.getByTestId('integration-configuration-select').selectOption('alternate');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
  await expect(page.getByTestId('integration-configuration-id')).toContainText('ALTERNATE');
  await page.getByTestId('simulate-verified').click();
  await expect(page.getByTestId('projected-state-ZONE-101')).toContainText('منطقة تحقق بديلة');
  await expect(page.getByTestId('projected-state-ZONE-005')).toHaveCount(0);
});

test('Stage 3C.1 persisted baseline remains unchanged after governed action and reset', async ({ page }) => {
  await openIntegrationLab(page);
  const before = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  await page.getByTestId('simulate-accepted-action').click();
  await page.getByTestId('integration-reset').click();
  const after = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(after).toBe(before);
});

test('command-center layout remains readable at the configured desktop viewport', async ({ page }, testInfo) => {
  await openIntegrationLab(page);
  await page.getByTestId('simulate-verified').click();
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
  expect(testInfo.project.name).toMatch(/1920x1080|2560x1080/);
  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    workspaceWidth: document.querySelector('[data-testid="integration-workspace"]')?.getBoundingClientRect().width ?? 0,
    outputWidths: Array.from(document.querySelectorAll('[data-testid^="spatial-output-"]')).map((element) => element.getBoundingClientRect().width)
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.workspaceWidth).toBeGreaterThan(1000);
  expect(layout.outputWidths.every((width) => width > 300)).toBe(true);
});
