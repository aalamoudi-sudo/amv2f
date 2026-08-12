import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_ABSOLUTE_FINAL_REVIEW === '1';
const output = resolve(process.cwd(), 'reports/kaga-absolute-final');
test.skip(!enabled, 'Set KAGA_ABSOLUTE_FINAL_REVIEW=1 for final review captures.');

async function shot(page: Page, name: string) {
  await mkdir(output, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled' });
}

async function enterDays(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
}

test('captures final source, Legendary, museum, and presenter states', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('1920'), 'The extended contact sheet uses the primary executive viewport.');
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await enterDays(page);
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة', exact: true }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await shot(page, '09-final-place-truth-map');
  await page.getByRole('tab', { name: 'استكشف الحدائق', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'استكشف الحدائق', exact: true })).toBeVisible();
  await shot(page, '10-final-garden-explorer');

  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await page.getByRole('button', { name: 'اليوم 3', exact: true }).first().click();
  await shot(page, '11-final-living-day-map');

  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await shot(page, '12-final-global-director');

  await enterDays(page);
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'معرض التصاميم', exact: true })).toBeVisible();
  await shot(page, '13-final-visual-museum');
  await page.getByRole('button', { name: 'وضع التقديم', exact: true }).click();
  await expect(page.getByTestId('kaga-v2-app')).toHaveAttribute('data-presenter', 'true');
  await shot(page, '14-final-presenter');
});
