import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3d1a-final-integrity-closure-review'
);

const screenshotNames = [
  '01-successful-governed-action.png',
  '02-valid-connected-provenance.png',
  '03-rejected-composite-provenance.png',
  '04-rejected-missing-agent-association.png',
  '05-rejected-event-payload-mismatch.png',
  '06-duplicate-retry.png',
  '07-conflict-after-gateway-recreation.png',
  '08-append-only-repository-result.png',
  '09-projection-and-command-identities.png',
  '10-adapter-conformance.png',
  '11-schema-validation.png',
  '12-integration-laboratory-overview.png'
] as const;

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function waitForStableRendering(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.waitForTimeout(250);
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string) {
  const workspace = page.getByTestId('integration-workspace');
  if (focusTestId) {
    await workspace.evaluate((element, targetTestId) => {
      const target = element.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
      if (!target) return;
      const containerRect = element.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const centeredTop = targetRect.top - containerRect.top
        - Math.max(16, (element.clientHeight - Math.min(targetRect.height, element.clientHeight)) / 2);
      element.scrollTop = Math.max(0, element.scrollTop + centeredTop);
    }, focusTestId);
  } else {
    await workspace.evaluate((element) => { element.scrollTop = 0; });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('command-open')).toBeVisible();
  await waitForStableRendering(page);
  await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
}

async function click(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await waitForStableRendering(page);
}

test('Stage 3D.1A final integration integrity visual review package', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
  await waitForStableRendering(page);

  await click(page, 'simulate-accepted-action');
  await capture(page, directory, screenshotNames[0], 'governed-action-execution');
  await capture(page, directory, screenshotNames[1], 'evidence-provenance');

  await click(page, 'simulate-composite-provenance');
  await capture(page, directory, screenshotNames[2], 'integration-validation-results');
  await click(page, 'simulate-missing-agent-association');
  await capture(page, directory, screenshotNames[3], 'integration-validation-results');
  await click(page, 'simulate-event-payload-mismatch');
  await capture(page, directory, screenshotNames[4], 'governed-action-execution');

  await click(page, 'simulate-recreated-gateway-retry');
  await capture(page, directory, screenshotNames[5], 'integration-validation-results');
  await click(page, 'simulate-recreated-gateway-conflict');
  await capture(page, directory, screenshotNames[6], 'governed-action-execution');
  await capture(page, directory, screenshotNames[7], 'operational-event-stream');

  await capture(page, directory, screenshotNames[8], 'spatial-output-2d');
  await capture(page, directory, screenshotNames[9], 'adapter-conformance-matrix');
  await capture(page, directory, screenshotNames[10], 'schema-validation-result');
  await capture(page, directory, screenshotNames[11]);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const hashes = screenshotNames.map((fileName) => {
    const screenshot = readFileSync(path.join(directory, fileName));
    expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
    expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
    return createHash('sha256').update(screenshot).digest('hex');
  });
  expect(new Set(hashes).size).toBe(screenshotNames.length);
});
