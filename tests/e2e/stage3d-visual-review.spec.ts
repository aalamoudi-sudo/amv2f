import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3d-operational-capture-integration-review'
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
    await page.waitForTimeout(80);
  }
  await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
}

async function click(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await page.waitForTimeout(60);
}

test('Stage 3D operational capture integration visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();

  await captureViewport(page, directory, '01-integration-workspace-overview.png');
  await captureViewport(page, directory, '02-source-adapter-registry.png', 'integration-adapter-registry');
  await captureViewport(page, directory, '03-adapter-capability-view.png', 'adapter-capability-view');

  await click(page, 'simulate-valid');
  await captureViewport(page, directory, '04-capture-envelope-stream.png', 'capture-envelope-stream');
  await captureViewport(page, directory, '05-accepted-operational-event.png', 'operational-event-stream');

  await click(page, 'simulate-invalid');
  await captureViewport(page, directory, '06-rejected-invalid-event.png', 'integration-validation-results');
  await click(page, 'simulate-duplicate');
  await captureViewport(page, directory, '07-duplicate-blocked.png', 'integration-validation-results');
  await click(page, 'simulate-unauthorized');
  await captureViewport(page, directory, '08-unauthorized-action.png', 'integration-validation-results');
  await click(page, 'simulate-missing-evidence');
  await captureViewport(page, directory, '09-missing-evidence-validation.png', 'integration-validation-results');
  await captureViewport(page, directory, '10-evidence-and-provenance.png', 'evidence-provenance');

  await click(page, 'simulate-reported');
  await click(page, 'simulate-corroborated');
  await click(page, 'simulate-verified');
  await click(page, 'simulate-approved');
  await captureViewport(page, directory, '11-trust-state-pipeline.png', 'trust-state-pipeline');

  await click(page, 'simulate-offline');
  await captureViewport(page, directory, '12-offline-queue.png', 'offline-queue');
  await click(page, 'replay-offline');
  await captureViewport(page, directory, '13-replayed-offline-event.png', 'offline-queue');
  await click(page, 'simulate-conflict');
  await captureViewport(page, directory, '14-conflict-review-state.png', 'conflict-review-queue');

  await captureViewport(page, directory, '15-canonical-state-projection.png', 'canonical-state-projection');
  await captureViewport(page, directory, '16-synchronized-2d-3d-outputs.png', 'spatial-output-2d');
  await captureViewport(page, directory, '17-geospatial-output-preview.png', 'geospatial-output-preview');
  await captureViewport(page, directory, '18-physical-output-preview.png', 'physical-output-preview');
  await captureViewport(page, directory, '19-simulated-metrics.png', 'integration-demo-metrics');

  await page.getByTestId('integration-workspace').evaluate((element) => { element.scrollTop = 0; });
  await captureViewport(page, directory, '20-full-ultra-wide-workspace.png');
});
