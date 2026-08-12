import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_V21_FINAL_RELEASE === '1';
const outputDirectory = resolve(process.cwd(), 'reports/presentation-fidelity-final');

test.skip(!enabled, 'Set KAGA_V21_FINAL_RELEASE=1 for the V2.1 final release smoke.');

function viewportLabel(testInfo: TestInfo) {
  return testInfo.project.name.includes('2560') ? '2560' : '1920';
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(outputDirectory, `${name}-${viewportLabel(testInfo)}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

test('V2.1 final Garden index and Identity proposal composition', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
  await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();

  const gardens = page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button');
  await expect(gardens).toHaveCount(6);
  await expect(gardens.first()).toHaveAttribute('aria-pressed', 'true');
  expect(await gardens.first().evaluate((element) => ({
    borderRadius: getComputedStyle(element).borderRadius,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }))).toEqual({ borderRadius: '0px', backgroundColor: 'rgba(0, 0, 0, 0)' });
  await capture(page, testInfo, 'garden-explorer-final');

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التجارب' }).click();
  await page.getByRole('button', { name: 'الهوية البصرية', exact: true }).click();
  const identity = page.getByTestId('identity-applications');
  await expect(identity.locator('.kaga-identity-stage figure')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'اختيار مقترح الهوية' }).getByRole('button', { name: 'المقترح الأول' })).toHaveAttribute('aria-pressed', 'true');
  await capture(page, testInfo, 'visual-identity-final');

  await page.getByRole('navigation', { name: 'اختيار مقترح الهوية' }).getByRole('button', { name: 'المقترح الثاني' }).click();
  await expect(identity.locator('.kaga-identity-stage figure')).toHaveCount(1);
  await expect(identity.getByRole('img', { name: /المقترح الثاني/ })).toBeVisible();
  await page.getByRole('button', { name: /عرض المقترحين معًا/ }).click();
  await expect(identity.locator('.kaga-identity-stage figure')).toHaveCount(2);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
