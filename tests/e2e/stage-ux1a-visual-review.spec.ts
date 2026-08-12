import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test.setTimeout(180_000);

const reviewRoot = path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-ux1a-command-visual-system-after');
const screenshotNames = [
  '01-visual-token-sheet.png',
  '02-component-gallery.png',
  '03-stage-3f2-readiness.png',
  '04-keyboard-focus-reduced-motion.png'
] as const;
const localDemoVisualSystemPath = '/?project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&workspace=visual-system';

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForTimeout(180);
}

async function focusInWorkspace(page: Page, testId: string): Promise<void> {
  await page.getByTestId('command-visual-system-workspace').evaluate((workspace, targetTestId) => {
    const target = workspace.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
    target?.scrollIntoView({ block: 'center' });
  }, testId);
}

async function capture(page: Page, directory: string, fileName: string, records: Array<{ fileName: string; width: number; height: number; sha256: string }>): Promise<void> {
  await settle(page);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['http://', 'https://', 'accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'جهاز خارجي متصل فعلياً', 'live device connected']) {
    expect(bodyText).not.toContain(forbidden);
  }

  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Unexpected duplicate screenshot: ${fileName}`).toBe(false);
  records.push({ fileName, width: viewport!.width, height: viewport!.height, sha256 });
}

test('Stage UX.1A visual review records the new system, readiness truth, focus, and reduced-motion states', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_CONNECTION_REFUSED'
  }
}, async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: Array<{ fileName: string; width: number; height: number; sha256: string }> = [];

  await page.goto(localDemoVisualSystemPath);
  await expect(page.getByTestId('command-visual-system-workspace')).toBeVisible();
  await capture(page, directory, screenshotNames[0], records);

  await focusInWorkspace(page, 'command-visual-system-workspace');
  await page.getByText('الأدلة والقرار').scrollIntoViewIfNeeded();
  await capture(page, directory, screenshotNames[1], records);

  await page.goto('/?project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&workspace=command&gatewayUrl=http://127.0.0.1:65531');
  await openTechnicalWorkspace(page, 'iot-open');
  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('stage-3f2-status-banner')).toContainText('STAGE_3F2_STATUS=READY_FOR_REAL_SOURCE');
  await expect(page.getByTestId('iot-gateway-unavailable')).toContainText('لم يتم التحويل إلى بيانات المحاكاة');
  await capture(page, directory, screenshotNames[2], records);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(localDemoVisualSystemPath);
  await page.getByRole('button', { name: 'الإجراء الأساسي' }).focus();
  await expect(page.getByRole('button', { name: 'الإجراء الأساسي' })).toBeFocused();
  await capture(page, directory, screenshotNames[3], records);

  expect(records).toHaveLength(screenshotNames.length);
  const screenshots = records.map((record) => ({ ...record, byteLength: readFileSync(path.join(directory, record.fileName)).byteLength }));
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    screenshots,
    checks: {
      exactDimensions: true,
      uniqueHashes: true,
      redacted: true,
      noSilentGatewayFallback: true,
      reducedMotion: true
    }
  }, null, 2));
});
