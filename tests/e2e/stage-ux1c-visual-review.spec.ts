import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.setTimeout(240_000);

const kapProjectId = 'PROJECT-KAP-OPENING-2026';
const kapEventId = 'EVENT-KAP-OPENING-2026';
const referenceProjectId = 'PROJECT-REFERENCE-EXHIBITION-001';
const preferenceKey = 'mayadeen-project-portfolio-preferences:v1';
const reviewRoot = path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-ux1c-project-portfolio-review', 'screenshots');

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

async function expectSafeViewport(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const root = page.locator('.project-shell, main').first();
  const rootBox = await root.boundingBox();
  expect(rootBox).not.toBeNull();
  expect(rootBox!.x).toBeGreaterThanOrEqual(-1);
  expect(rootBox!.y).toBeLessThanOrEqual(1);
  expect(rootBox!.width).toBeGreaterThanOrEqual(viewport!.width - 1);
  expect(rootBox!.height).toBeGreaterThanOrEqual(viewport!.height - 1);

  const header = page.locator('header').first();
  if (await header.count()) {
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.x).toBeGreaterThanOrEqual(-1);
    expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  }

  const bodyText = await page.locator('body').innerText();
  for (const forbidden of [
    'accessToken', 'refreshToken', 'clientSecret', 'PRIVATE KEY', 'BEGIN RSA', 'password=',
    '/Users/', 'live device connected', 'جهاز خارجي متصل فعلياً'
  ]) expect(bodyText).not.toContain(forbidden);
}

async function capture(page: Page, directory: string, fileName: string, description: string, records: ScreenshotRecord[]): Promise<void> {
  await settle(page);
  await expectSafeViewport(page);
  const viewport = page.viewportSize()!;
  const screenshot = await page.screenshot({ path: path.join(directory, fileName), fullPage: false, animations: 'disabled' });
  expect(screenshot.readUInt32BE(16)).toBe(viewport.width);
  expect(screenshot.readUInt32BE(20)).toBe(viewport.height);
  const sha256 = createHash('sha256').update(screenshot).digest('hex');
  expect(records.some((record) => record.sha256 === sha256), `Duplicate screenshot hash: ${fileName}`).toBe(false);
  records.push({ fileName, description, width: viewport.width, height: viewport.height, byteLength: screenshot.byteLength, sha256, url: page.url() });
}

async function openKap(page: Page, workspace: 'executive' | 'spatial' | 'experience'): Promise<void> {
  await page.goto(`/?project=${kapProjectId}&event=${kapEventId}&workspace=${workspace}`);
  await expect(page.getByTestId(`visual-screen-${workspace}`)).toBeVisible();
}

test('Stage UX.1C generates the founder project portfolio review evidence', async ({ page }, testInfo) => {
  const directory = reviewDirectoryFor(testInfo.project.name);
  const records: ScreenshotRecord[] = [];

  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await capture(page, directory, '01-portfolio-overview.png', 'Universal Arabic RTL project portfolio overview', records);

  const kapCard = page.getByTestId(`project-card-${kapProjectId}`);
  await kapCard.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await kapCard.locator('summary').click();
  await capture(page, directory, '02-kap-project-card.png', 'KAP candidate project card and provisional source state', records);

  const demoCard = page.getByTestId(`project-card-${referenceProjectId}`);
  await demoCard.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await capture(page, directory, '03-demo-reference-distinction.png', 'Demo and reference project distinction', records);

  await page.getByTestId('project-search').fill('حدائق الملك عبدالله');
  await page.getByTestId('project-search').scrollIntoViewIfNeeded();
  await capture(page, directory, '04-project-search.png', 'Portfolio search narrowed to KAP', records);

  await openKap(page, 'executive');
  await capture(page, directory, '05-active-project-switcher.png', 'Active KAP project context switcher', records);

  await page.getByTestId('project-switcher-trigger').click();
  await expect(page.getByTestId('project-switcher-menu')).toBeVisible();
  await capture(page, directory, '06-project-switch-menu.png', 'Searchable project switch menu with recent projects', records);

  await page.keyboard.press('Escape');
  await capture(page, directory, '07-kap-executive.png', 'KAP Executive Command candidate view', records);

  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await capture(page, directory, '08-kap-spatial.png', 'KAP Spatial view with unapproved geometry guardrail', records);

  await page.getByTestId('experience-open').click();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await capture(page, directory, '09-kap-experience.png', 'KAP Experience journey view', records);

  await page.getByTestId('project-switcher-trigger').click();
  await page.getByTestId(`project-switch-option-${referenceProjectId}`).click();
  await expect(page.getByTestId('executive-overview')).toBeVisible();
  await capture(page, directory, '10-second-project-selected.png', 'Reference exhibition selected with isolated neutral theme', records);

  await page.getByTestId('launcher-open').click();
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  const switchPromise = page.getByTestId(`project-card-${kapProjectId}`).getByRole('button', { name: /فتح المشروع/ }).click();
  await expect(page.getByTestId('project-switch-loading')).toBeVisible();
  await capture(page, directory, '11-project-switch-loading.png', 'Explicit atomic project loading transition', records);
  await switchPromise;
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();

  await page.goto('/?project=PROJECT-INVALID&event=EVENT-INVALID&workspace=executive');
  await expect(page.getByTestId('portfolio-context-message')).toBeVisible();
  await capture(page, directory, '12-invalid-project.png', 'Invalid project deep link returned safely to portfolio', records);

  await page.evaluate((key) => window.localStorage.removeItem(key), preferenceKey);
  await page.goto('/?workspace=portfolio');
  await page.reload();
  await expect(page.getByTestId('portfolio-no-project-state')).toBeVisible();
  await page.getByTestId('project-status-filter').selectOption('archived');
  await capture(page, directory, '13-no-project-state.png', 'Neutral no-project state without silent demo fallback', records);

  expect(records).toHaveLength(13);
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify({
    stage: 'UX.1C',
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    screenshots: records,
    checks: {
      exactViewportDimensions: true,
      uniqueHashesWithinViewport: true,
      noCroppedNavigation: true,
      fullViewportNoArtificialEmptyStrip: true,
      noHorizontalOverflow: true,
      noKnownSecretsOrPersonalData: true
    }
  }, null, 2));

  for (const record of records) expect(readFileSync(path.join(directory, record.fileName)).byteLength).toBe(record.byteLength);
});
