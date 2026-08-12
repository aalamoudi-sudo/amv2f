import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_V2_GATE1 === '1';
const outputDirectory = resolve(process.cwd(), 'reports/v2-gate1');

test.skip(!enabled, 'Gate 1 runs only against the isolated KAGA V2 production build.');

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  const resolution = testInfo.project.name.includes('2560') ? '2560x1080' : '1920x1080';
  await page.screenshot({
    path: resolve(outputDirectory, `${name}-${resolution}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

test.describe('KAGA V2 Gate 1 source-true review', () => {
  test('renders the themed Arabic intro and the two source masterplan modes', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/kaga');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'تجربة تدشين حدائق الملك عبدالله' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ابدأ الرحلة' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'استكشف الحدائق' })).toBeVisible();
    await capture(page, testInfo, '01-v2-intro');

    await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
    await expect(page.getByRole('heading', { name: 'رحلة التدشين' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'رحلات التدشين المسجلة مبدئياً' }).getByRole('button')).toHaveCount(6);
    await expect(page.locator('.kaga-v2-source-map')).toHaveAttribute('data-asset-state', 'ready');
    await expect(page.getByText('ثقة التسجيل: تقريبية')).toBeVisible();
    await capture(page, testInfo, '04-v2-masterplan-event-mode');

    await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
    await expect(page.getByRole('heading', { name: 'استكشف الحدائق' })).toBeVisible();
    await expect(page.locator('.kaga-v2-map-panel__candidate-count')).toContainText('٢٨');
    await expect(page.locator('.kaga-v2-map-panel__candidate-count')).toContainText('بصمة مرشحة غير مسماة');
    await capture(page, testInfo, '05-v2-masterplan-garden-mode');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
