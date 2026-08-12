import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { enterOperationalCommand, expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(240_000);

const reviewRoot = path.join(
  process.env.HOME ?? '/Users/mayadeen',
  'Downloads',
  'mayadeen-stage-3f-iot-integration-foundation-review'
);

const screenshotNames = [
  '01-iot-overview.png',
  '02-fresh-reported.png',
  '03-threshold-not-alarm.png',
  '04-unknown-device-rejected.png',
  '05-invalid-unit-rejected.png',
  '06-duplicate-blocked.png',
  '07-key-conflict.png',
  '08-stale-quarantined.png',
  '09-offline-queued.png',
  '10-offline-replayed.png',
  '11-device-timeout.png',
  '12-spatial-3d-logical-binding.png'
] as const;

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(250);
}

async function capture(page: Page, directory: string, fileName: string, focusTestId?: string) {
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
      if (!target) return;
      const container = element.getBoundingClientRect();
      const bounds = target.getBoundingClientRect();
      const top = bounds.top - container.top - Math.max(16, (element.clientHeight - Math.min(bounds.height, element.clientHeight)) / 2);
      element.scrollTop = Math.max(0, element.scrollTop + top);
    }, focusTestId);
  } else {
    await workspace.evaluate((element) => { element.scrollTop = 0; });
  }
  await settle(page);
  await expect(page.getByTestId('iot-local-only-label')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'تغذية حية متصلة']) expect(bodyText).not.toContain(forbidden);
  await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
}

async function click(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  await settle(page);
}

test('Stage 3F IoT visual review includes twelve unique truth-safe states', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await enterOperationalCommand(page);
  await openTechnicalWorkspace(page, 'iot-open');
  await expect(page.getByTestId('iot-workspace')).toBeVisible();

  await capture(page, directory, screenshotNames[0]);
  await click(page, 'simulate-iot-fresh');
  await capture(page, directory, screenshotNames[1]);
  await click(page, 'simulate-iot-threshold');
  await capture(page, directory, screenshotNames[2]);
  await click(page, 'simulate-iot-unknown-device');
  await capture(page, directory, screenshotNames[3]);
  await click(page, 'simulate-iot-invalid-unit');
  await capture(page, directory, screenshotNames[4]);
  await click(page, 'simulate-iot-duplicate');
  await capture(page, directory, screenshotNames[5]);
  await click(page, 'simulate-iot-key-conflict');
  await capture(page, directory, screenshotNames[6]);
  await click(page, 'simulate-iot-stale');
  await capture(page, directory, screenshotNames[7]);
  await click(page, 'simulate-iot-offline');
  await capture(page, directory, screenshotNames[8]);
  await click(page, 'replay-iot-offline');
  await capture(page, directory, screenshotNames[9]);
  await click(page, 'simulate-iot-timeout');
  await capture(page, directory, screenshotNames[10]);
  await click(page, 'iot-spatial-3d-open');
  await capture(page, directory, screenshotNames[11], 'iot-spatial-link');

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const manifest = screenshotNames.map((fileName) => {
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
  expect(new Set(manifest.map((item) => item.sha256)).size).toBe(screenshotNames.length);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({ project: testInfo.project.name, screenshots: manifest }, null, 2));
});
