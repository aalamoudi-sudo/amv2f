import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test } from './test-fixtures';
import { waitForSceneVisible } from './scene-visibility';

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3c1-integrity-hardening-review'
);

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function captureViewport(page: Page, directory: string, fileName: string, focusTestId?: string) {
  if (focusTestId) {
    const focus = page.getByTestId(focusTestId);
    await focus.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expect(focus).toBeVisible();
    await page.waitForTimeout(100);
  }
  await page.screenshot({
    path: path.join(directory, fileName),
    fullPage: false,
    animations: 'disabled'
  });
}

async function openDecisions(page: Page) {
  if (await page.getByTestId('decision-center').isVisible().catch(() => false)) return;
  await enterOperationalCommand(page);
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
}

function templateRecords(): Array<Record<string, unknown>> {
  const source = readFileSync(path.join(process.cwd(), 'templates/operational-decision-pack.json'), 'utf8');
  return (JSON.parse(source) as { decisions: Array<Record<string, unknown>> }).decisions;
}

test('Stage 3C.1 integrity hardening visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await openDecisions(page);
  await captureViewport(page, directory, '01-decision-center-overview.png');

  await page.getByTestId('decision-item-DECISION-001').click();
  await captureViewport(page, directory, '02-temporary-demo-classification.png', 'decision-state-summary');

  await page.getByTestId('decision-create-open').click();
  await page.getByTestId('decision-create-title').fill('قرار تجريبي ثابت قبل إعادة التحميل');
  await page.getByTestId('decision-create-description').fill('حالة مراجعة بصرية لإثبات بقاء القرار وسياقه محلياً.');
  await page.getByTestId('decision-create-type').selectOption('technical');
  await page.getByTestId('decision-create-owner').fill('مالك تجريبي');
  await page.getByTestId('decision-create-responsible').fill('منفذ تجريبي');
  await page.getByTestId('decision-create-submit').click();
  await captureViewport(page, directory, '03-new-decision-before-reload.png', 'decision-state-summary');

  await page.reload();
  await openDecisions(page);
  await expect(page.getByTestId('decision-state-summary')).toContainText('قرار تجريبي ثابت قبل إعادة التحميل');
  await captureViewport(page, directory, '04-new-decision-after-reload.png', 'decision-state-summary');

  await page.getByTestId('decision-row-DECISION-002').click();
  await captureViewport(page, directory, '05-operational-priority.png', 'decision-normalized-priority');
  await page.getByTestId('decision-row-DECISION-003').click();
  await captureViewport(page, directory, '06-data-quality-attention.png', 'decision-data-quality-attention');

  await page.getByTestId('decision-row-DECISION-005').click();
  await captureViewport(page, directory, '07-ordered-lifecycle.png', 'decision-history');

  await page.evaluate(() => {
    const key = 'mayadeen-event-intelligence-twin:v1';
    const envelope = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      state?: { decisions?: Array<Record<string, unknown>>; baselineDecisions?: Array<Record<string, unknown>>; selectedDecisionId?: string };
    };
    for (const collection of [envelope.state?.decisions, envelope.state?.baselineDecisions]) {
      const record = collection?.find((candidate) => candidate.decisionId === 'DECISION-005');
      if (!record || !Array.isArray(record.changeHistory)) continue;
      const verifiedHistory = record.changeHistory.slice(0, 7) as Array<Record<string, unknown>>;
      Object.assign(record, {
        status: 'verified',
        revision: 7,
        changeReason: verifiedHistory[6]?.changeReason,
        changeHistory: verifiedHistory,
        closedBy: null,
        closedAt: null,
        closureReason: ''
      });
    }
    if (envelope.state) envelope.state.selectedDecisionId = 'DECISION-005';
    window.localStorage.setItem(key, JSON.stringify(envelope));
  });
  await page.reload();
  await openDecisions(page);
  await expect(page.getByTestId('decision-state-summary')).toContainText('تم التحقق');
  await captureViewport(page, directory, '08-valid-verification.png', 'decision-state-summary');

  await page.getByTestId('decision-next-lifecycle').click();
  await captureViewport(page, directory, '09-blocked-closure-arabic-labels.png', 'decision-validation-error');

  await page.getByTestId('decision-row-DECISION-001').click();
  await page.getByTestId('decision-view-2d').click();
  await captureViewport(page, directory, '10-explicit-2d-relationships.png', 'decision-2d-relationship');
  await page.getByTestId('decision-related-2d-ZONE-005').click();
  await waitForSceneVisible(page);
  await captureViewport(page, directory, '11-explicit-3d-relationships.png', 'decision-3d-view');

  await page.getByTestId('validation-open').click();
  const records = templateRecords();
  const closed = records[4];
  const history = closed.changeHistory as Array<Record<string, unknown>>;
  const skipped = { ...closed, status: 'approved', revision: 2, changeHistory: [history[0], { ...history[2], revision: 2 }] };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'skipped-lifecycle.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([skipped]))
  });
  await captureViewport(page, directory, '12-skipped-lifecycle-validation-error.png', 'decision-import-errors');

  const legacy: Record<string, unknown> = { ...records[0], relatedEntityIds: ['ZONE-005', 'ROUTE-001'] };
  delete legacy.relationships;
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'legacy-relations.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([legacy]))
  });
  await captureViewport(page, directory, '13-migration-warning.png', 'decision-migration-warnings');

  const malformed = { ...records[0], expectedImpact: { level: 'extreme', summaryAr: '', dimensions: { safety: 'unknown' } } };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'malformed-impact.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([malformed]))
  });
  await captureViewport(page, directory, '14-malformed-import-error.png', 'decision-import-errors');

  const dangling = { ...closed, verificationEvidenceIds: ['EVIDENCE-UNKNOWN'] };
  await page.getByTestId('decision-import-file').setInputFiles({
    name: 'dangling-evidence.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([dangling]))
  });
  await captureViewport(page, directory, '15-dangling-evidence-error.png', 'decision-import-errors');

  await page.getByTestId('decision-import-file').setInputFiles(path.join(process.cwd(), 'templates/operational-decision-pack.json'));
  await page.getByTestId('decision-import-accept').click();
  await captureViewport(page, directory, '16-operational-validation-workspace.png', 'validation-workspace');
  await captureViewport(page, directory, '17-full-viewport.png');
});
