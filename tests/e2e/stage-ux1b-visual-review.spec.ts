import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.setTimeout(240_000);

const reviewRoot = path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-ux1b-visual-direction-review', 'screenshots');
const reviewBase = '/?workspace=visual-direction&concept=hybrid-light';
const localDemoVisualSystemPath = '/?project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&workspace=visual-system';
const screenshotPlan = [
  ['01-existing-dark-teal-comparison.png', 'Existing dark teal visual-system direction'],
  ['02-executive-command-overview.png', 'Hybrid Light Executive Command Overview'],
  ['03-spatial-command-2d.png', 'Spatial Command 2D safe state'],
  ['04-spatial-command-3d.png', 'Spatial Command 3D safe state'],
  ['05-spatial-command-hybrid.png', 'Spatial Command hybrid safe state'],
  ['06-kap-journey-arrival.png', 'KAP visitor journey stage 1'],
  ['07-kap-journey-show.png', 'KAP visitor journey stage 3'],
  ['08-kap-journey-dinner-vip.png', 'KAP visitor journey stage 5'],
  ['09-kap-projection-preview.png', 'KAP projection preview'],
  ['10-non-kap-theme-isolation.png', 'Event-theme isolation against a non-KAP event'],
  ['11-semantic-truth-severity.png', 'Immutable truth and severity examples'],
  ['12-theme-source-token-review.png', 'Theme sources and sampled tokens']
] as const;

interface ScreenshotRecord {
  fileName: string;
  description: string;
  width: number;
  height: number;
  byteLength: number;
  sha256: string;
  url: string;
}

function reviewDirectoryFor(projectName: string): string {
  const directory = path.join(reviewRoot, projectName);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function openReview(page: Page, suffix = ''): Promise<void> {
  await page.goto(`${reviewBase}${suffix}`);
  await expect(page.getByTestId('visual-direction-workspace')).toBeVisible();
}

async function openDrawerSection(page: Page, section: 'sources' | 'semantics' | 'isolation'): Promise<void> {
  await page.getByTestId('visual-review-drawer-open').click();
  await expect(page.getByTestId('visual-review-drawer')).toBeVisible();
  if (section !== 'sources') {
    await page.getByTestId(`drawer-section-${section}`).click();
  }
  await expect(page.getByTestId(section === 'sources' ? 'theme-source-review' : section === 'semantics' ? 'semantic-token-review' : 'theme-isolation-review')).toBeVisible();
}

async function capture(
  page: Page,
  directory: string,
  fileName: string,
  description: string,
  records: ScreenshotRecord[]
): Promise<void> {
  await settle(page);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return false;
    const rect = main.getBoundingClientRect();
    return rect.top <= 0 && rect.width >= document.documentElement.clientWidth - 1 && rect.height >= document.documentElement.clientHeight;
  })).toBe(true);

  const bodyText = await page.locator('body').innerText();
  for (const forbidden of [
    'accessToken',
    'refreshToken',
    'clientSecret',
    'PRIVATE KEY',
    'BEGIN RSA',
    'password=',
    'جهاز خارجي متصل فعلياً',
    'live device connected'
  ]) {
    expect(bodyText).not.toContain(forbidden);
  }

  const screenshot = await page.screenshot({
    path: path.join(directory, fileName),
    fullPage: false,
    animations: 'disabled'
  });
  expect(screenshot.readUInt32BE(16)).toBe(viewport!.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport!.height);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Duplicate screenshot hash: ${fileName}`).toBe(false);
  records.push({
    fileName,
    description,
    width: viewport!.width,
    height: viewport!.height,
    byteLength: screenshot.byteLength,
    sha256,
    url: page.url()
  });
}

test('Stage UX.1B generates the founder visual review evidence at the exact viewport', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];

  await page.goto(localDemoVisualSystemPath);
  await expect(page.getByTestId('command-visual-system-workspace')).toBeVisible();
  await capture(page, directory, ...screenshotPlan[0], records);

  await openReview(page);
  await capture(page, directory, ...screenshotPlan[1], records);

  await openReview(page, '&screen=spatial&view=2d');
  await expect(page.getByTestId('spatial-review-canvas')).toHaveAttribute('data-spatial-mode', '2d');
  await capture(page, directory, ...screenshotPlan[2], records);

  await openReview(page, '&screen=spatial&view=3d');
  await expect(page.getByTestId('spatial-review-canvas')).toHaveAttribute('data-spatial-mode', '3d');
  await capture(page, directory, ...screenshotPlan[3], records);

  await openReview(page, '&screen=spatial&view=hybrid');
  await expect(page.getByTestId('spatial-review-canvas')).toHaveAttribute('data-spatial-mode', 'hybrid');
  await capture(page, directory, ...screenshotPlan[4], records);

  await openReview(page, '&screen=experience&stage=1');
  await expect(page.getByTestId('journey-stage-1')).toHaveAttribute('aria-current', 'step');
  await capture(page, directory, ...screenshotPlan[5], records);

  await openReview(page, '&screen=experience&stage=3');
  await expect(page.getByTestId('journey-stage-3')).toHaveAttribute('aria-current', 'step');
  await capture(page, directory, ...screenshotPlan[6], records);

  await openReview(page, '&screen=experience&stage=5');
  await expect(page.getByTestId('journey-stage-5')).toHaveAttribute('aria-current', 'step');
  await capture(page, directory, ...screenshotPlan[7], records);

  await openReview(page, '&screen=experience&stage=3');
  await page.getByTestId('projection-preview-open').click();
  await expect(page.getByTestId('projection-preview')).toBeVisible();
  await capture(page, directory, ...screenshotPlan[8], records);

  await openReview(page);
  await openDrawerSection(page, 'isolation');
  await capture(page, directory, ...screenshotPlan[9], records);

  await openReview(page);
  await openDrawerSection(page, 'semantics');
  await capture(page, directory, ...screenshotPlan[10], records);

  await openReview(page);
  await openDrawerSection(page, 'sources');
  await capture(page, directory, ...screenshotPlan[11], records);

  expect(records).toHaveLength(screenshotPlan.length);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    stage: 'UX.1B',
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    screenshots: records,
    checks: {
      exactViewportDimensions: true,
      uniqueHashesWithinViewport: true,
      fullViewportNoCropping: true,
      rootStartsAtViewportTop: true,
      noHorizontalOverflow: true,
      noKnownSecretsOrPersonalData: true
    }
  }, null, 2));

  for (const record of records) {
    expect(readFileSync(path.join(directory, record.fileName)).byteLength).toBe(record.byteLength);
  }
});
