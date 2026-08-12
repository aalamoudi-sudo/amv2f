import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';

async function resetAndOpenDecisions(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
}

async function resetAndOpenValidation(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await page.getByTestId('validation-open').click();
  await expect(page.getByTestId('validation-workspace')).toBeVisible();
}

function decisionTemplateRecords(): Array<Record<string, unknown>> {
  const source = readFileSync(path.join(process.cwd(), 'templates/operational-decision-pack.json'), 'utf8');
  return (JSON.parse(source) as { decisions: Array<Record<string, unknown>> }).decisions;
}

test('a new local decision survives reload with its temporary-demo context and selection', async ({ page }) => {
  await resetAndOpenDecisions(page);
  await page.getByTestId('decision-create-open').click();
  await page.getByTestId('decision-create-title').fill('قرار محفوظ عبر إعادة التحميل');
  await page.getByTestId('decision-create-description').fill('قرار محلي تجريبي لا يجوز ترقيته إلى حالة أساسية.');
  await page.getByTestId('decision-create-type').selectOption('technical');
  await page.getByTestId('decision-create-owner').fill('مالك قرار تجريبي');
  await page.getByTestId('decision-create-responsible').fill('منفذ قرار تجريبي');
  await page.getByTestId('decision-create-submit').click();

  await expect(page.getByTestId('decision-state-summary')).toContainText('قرار محفوظ عبر إعادة التحميل');
  await expect(page.getByTestId('decision-state-summary')).toContainText('بيانات تجريبية مؤقتة');
  const beforeReload = await page.evaluate(() => {
    const envelope = JSON.parse(window.localStorage.getItem('mayadeen-event-intelligence-twin:v1') ?? '{}') as {
      state?: { decisions?: Array<{ decisionId: string; stateContext: string; relationships: Array<{ stateContext: string }> }>; selectedDecisionId?: string };
    };
    const record = envelope.state?.decisions?.find((decision) => decision.decisionId === 'DECISION-006');
    return { record, selectedDecisionId: envelope.state?.selectedDecisionId };
  });
  expect(beforeReload.record?.stateContext).toBe('temporary-demo');
  expect(beforeReload.record?.relationships.every((relation) => relation.stateContext === 'temporary-demo')).toBe(true);
  expect(beforeReload.selectedDecisionId).toBe('DECISION-006');

  await page.reload();
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await expect(page.getByTestId('decision-state-summary')).toContainText('قرار محفوظ عبر إعادة التحميل');
  await expect(page.getByTestId('decision-state-summary')).toContainText('بيانات تجريبية مؤقتة');
  await expect(page.getByTestId('decision-row-DECISION-006')).toBeVisible();
});

test('editing temporary demo data never promotes it to baseline after reload', async ({ page }) => {
  await resetAndOpenDecisions(page);
  await page.getByTestId('decision-item-DECISION-003').click();
  await page.getByTestId('decision-source-input').fill('مصدر تجريبي محدث محلياً');
  await page.getByTestId('decision-change-reason').fill('تحديث مصدر تجريبي مع حفظ السياق.');
  await page.getByTestId('decision-save').click();
  await page.reload();
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await page.getByTestId('decision-item-DECISION-003').click();

  await expect(page.getByTestId('decision-state-summary')).toContainText('بيانات تجريبية مؤقتة');
  const contexts = await page.evaluate(() => {
    const envelope = JSON.parse(window.localStorage.getItem('mayadeen-event-intelligence-twin:v1') ?? '{}') as {
      state?: { decisions?: Array<{ decisionId: string; stateContext: string }>; baselineDecisions?: Array<{ decisionId: string; stateContext: string }> };
    };
    return {
      current: envelope.state?.decisions?.find((record) => record.decisionId === 'DECISION-003')?.stateContext,
      baselineLayer: envelope.state?.baselineDecisions?.find((record) => record.decisionId === 'DECISION-003')?.stateContext
    };
  });
  expect(contexts).toEqual({ current: 'temporary-demo', baselineLayer: 'temporary-demo' });
});

test('strict import validation blocks skipped history, malformed impact, and dangling evidence', async ({ page }) => {
  await resetAndOpenValidation(page);
  const records = decisionTemplateRecords();
  const closed = records[4];
  const closedHistory = closed.changeHistory as Array<Record<string, unknown>>;
  const skipped = {
    ...closed,
    status: 'approved',
    revision: 2,
    changeHistory: [closedHistory[0], { ...closedHistory[2], revision: 2 }]
  };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'skipped-history.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([skipped]))
  });
  await expect(page.getByTestId('decision-import-errors')).toContainText('تجاوز مرحلة إلزامية');
  await expect(page.getByTestId('decision-import-accept')).toBeDisabled();

  const malformed = { ...records[0], expectedImpact: { level: 'extreme', summaryAr: '', dimensions: { safety: 'unknown' } } };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'malformed-impact.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([malformed]))
  });
  await expect(page.getByTestId('decision-import-errors')).toContainText('مستوى الأثر غير صالح');
  await expect(page.getByTestId('decision-import-accept')).toBeDisabled();

  const dangling = { ...closed, verificationEvidenceIds: ['EVIDENCE-UNKNOWN'] };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'dangling-evidence.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([dangling]))
  });
  await expect(page.getByTestId('decision-import-errors')).toContainText('غير موجود ضمن أدلة القرار');
  await expect(page.getByTestId('decision-import-accept')).toBeDisabled();
});

test('a valid pilot pack remains local and reset clears all experiment state', async ({ page }) => {
  await resetAndOpenValidation(page);
  const workspace = page.getByTestId('validation-workspace');
  const baselineCount = await workspace.getAttribute('data-baseline-decision-count');
  await page.getByTestId('decision-import-file').setInputFiles(path.join(process.cwd(), 'templates/operational-decision-pack.json'));
  await page.getByTestId('decision-import-accept').click();
  await expect(page.getByTestId('imported-pack-status')).toContainText('بقيت الحالة الأساسية دون تغيير');
  await page.getByTestId('validation-timer-start').click();
  await page.waitForTimeout(1_050);
  await page.getByTestId('validation-timer-stop').click();
  await page.getByTestId('validation-save-result').click();
  await expect(page.getByTestId('validation-result-count')).toContainText('1');
  await page.getByTestId('decision-import-reset').click();

  await expect(page.getByTestId('imported-pack-status')).toHaveCount(0);
  await expect(page.getByTestId('validation-result-count')).toContainText('0');
  await expect(page.getByTestId('validation-timer')).toHaveText('00:00');
  await expect(workspace).toHaveAttribute('data-baseline-decision-count', baselineCount ?? '');
});

test('Arabic operator labels replace internal field names and layouts do not clip', async ({ page }, testInfo) => {
  await resetAndOpenDecisions(page);
  await page.getByTestId('decision-item-DECISION-001').click();
  await expect(page.getByText('من تحقق من النتيجة')).toBeVisible();
  await expect(page.getByText('وقت التحقق')).toBeVisible();
  await expect(page.getByText('من أغلق القرار')).toBeVisible();
  await expect(page.getByText('وقت الإغلاق')).toBeVisible();
  await expect(page.getByText('closedBy', { exact: true })).toHaveCount(0);
  await expect(page.getByText('verifiedBy', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('decision-normalized-priority')).toBeVisible();
  await expect(page.getByTestId('decision-data-quality-attention')).toBeVisible();
  expect(testInfo.project.name).toMatch(/1920x1080|2560x1080/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
