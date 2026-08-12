import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3d1-integration-integrity-hardening-review'
);

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string) {
  const workspace = page.getByTestId('integration-workspace');
  if (focusTestId) {
    const focus = page.getByTestId(focusTestId);
    await expect(focus).toBeVisible();
    await workspace.evaluate((element, targetTestId) => {
      element.scrollTop = 0;
      const target = element.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
      if (!target) return;
      const containerRect = element.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const centeredTop = targetRect.top - containerRect.top - Math.max(16, (element.clientHeight - targetRect.height) / 2);
      element.scrollTop = Math.max(0, centeredTop);
    }, focusTestId);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
}

async function click(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await page.waitForTimeout(80);
}

test('Stage 3D.1 integrity-hardening visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();

  await click(page, 'simulate-accepted-action');
  await capture(page, directory, '01-successful-governed-action.png', 'governed-action-execution');
  await capture(page, directory, '02-projection-content-identity.png', 'canonical-state-projection');
  await capture(page, directory, '03-output-command-identity.png', 'spatial-output-2d');

  await click(page, 'simulate-unrelated-evidence');
  await capture(page, directory, '04-rejected-unrelated-evidence.png', 'integration-validation-results');
  await click(page, 'simulate-dangling-provenance');
  await capture(page, directory, '05-rejected-dangling-provenance.png', 'integration-validation-results');
  await click(page, 'simulate-cross-context-correction');
  await capture(page, directory, '06-cross-context-correction-rejection.png', 'integration-validation-results');

  await click(page, 'simulate-action-retry');
  await capture(page, directory, '07-idempotent-retry.png', 'governed-action-execution');
  await click(page, 'simulate-key-conflict');
  await capture(page, directory, '08-reused-key-conflict.png', 'integration-validation-results');

  await click(page, 'simulate-offline');
  await click(page, 'replay-offline');
  await capture(page, directory, '09-offline-reconciliation.png', 'offline-queue');
  await capture(page, directory, '10-ten-adapter-conformance-matrix.png', 'adapter-conformance-matrix');
  await capture(page, directory, '11-schema-validation-result.png', 'schema-validation-result');

  await click(page, 'simulate-verified');
  await capture(page, directory, '12-synchronized-2d-3d.png', 'spatial-output-2d');
  await click(page, 'simulate-approved');
  await capture(page, directory, '13-geospatial-output.png', 'geospatial-output-preview');
  await click(page, 'simulate-correction');
  await capture(page, directory, '14-physical-output.png', 'physical-output-preview');
  await click(page, 'simulate-clock-drift');
  await capture(page, directory, '15-simulated-metrics.png', 'integration-demo-metrics');

  await page.getByTestId('integration-workspace').evaluate((element) => { element.scrollTop = 0; });
  await capture(page, directory, '16-full-workspace.png');

  const fileNames = Array.from({ length: 16 }, (_, index) => `${String(index + 1).padStart(2, '0')}-${[
    'successful-governed-action',
    'projection-content-identity',
    'output-command-identity',
    'rejected-unrelated-evidence',
    'rejected-dangling-provenance',
    'cross-context-correction-rejection',
    'idempotent-retry',
    'reused-key-conflict',
    'offline-reconciliation',
    'ten-adapter-conformance-matrix',
    'schema-validation-result',
    'synchronized-2d-3d',
    'geospatial-output',
    'physical-output',
    'simulated-metrics',
    'full-workspace'
  ][index]}.png`);
  const hashes = fileNames.map((fileName) => createHash('sha256').update(readFileSync(path.join(directory, fileName))).digest('hex'));
  expect(new Set(hashes).size).toBe(fileNames.length);
});
