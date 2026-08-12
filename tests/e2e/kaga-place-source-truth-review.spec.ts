import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_PLACE_SOURCE_TRUTH_REVIEW === '1';
const outputRoot = resolve(process.cwd(), 'reports/kaga-final-place-truth');

test.skip(!enabled, 'Set KAGA_PLACE_SOURCE_TRUTH_REVIEW=1 for the place-truth review package.');

async function openMap(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'الخريطة', exact: true }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
}

async function capture(page: Page, name: string) {
  await mkdir(outputRoot, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(outputRoot, `${name}.png`), animations: 'disabled' });
}

test('captures executive whitelist and all six journey/place validations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'), 'Place truth board uses 1920×1080 evidence frames.');
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await openMap(page);

  await page.getByRole('button', { name: 'رحلة الضيوف عرض المسار', exact: true }).click();
  await expect(page.getByRole('button', { name: 'الخريطة التصويرية' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.kaga-illustrated-hotspot')).toHaveCount(3);
  await page.getByRole('button', { name: 'D، بداية الجولة التعريفية - حديقة الخيارات', exact: true }).click();
  await capture(page, '03-guest-route-place-validation');

  await page.getByText('رحلات التدشين الأخرى', { exact: true }).click();
  await page.getByRole('navigation', { name: 'اختيار رحلة أخرى' }).getByRole('button', {
    name: 'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين',
    exact: true,
  }).click();
  await capture(page, '04-prince-route-place-validation');

  const journeys = [
    ['رحلة سمو الأمين عرض المسار', '05-mayor-route-place-validation'],
    ['رحلة سمو الأمين ومعالي وزير الإعلام عرض المسار', '06-mayor-media-route-place-validation'],
    ['مسار الإعلاميين عرض المسار', '07-media-route-place-validation'],
    ['رحلة العاملين في الحدائق عرض المسار', '08-workers-route-place-validation'],
  ] as const;
  for (const [buttonName, captureName] of journeys) {
    await page.getByRole('button', { name: buttonName, exact: true }).click();
    await expect(page.getByTestId('registered-masterplan')).toBeVisible();
    await capture(page, captureName);
  }

  await page.getByRole('tab', { name: 'استكشف الحدائق', exact: true }).click();
  const executiveGardens = page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button');
  await expect(executiveGardens).toHaveCount(3);
  await expect(executiveGardens).toContainText(['الحديقة الديفونية', 'الحديقة البليوسينية', 'حديقة الخيارات']);
  await expect(page.getByText('حديقة الفراشات')).toHaveCount(0);
  await expect(page.getByText('حديقة المتاهة')).toHaveCount(0);
  await expect(page.getByText('حديقة الصوت والضوء')).toHaveCount(0);
  await capture(page, '09-canonical-gardens-only');

  expect(consoleErrors).toEqual([]);
});

test('captures the illustrated Place Lens with canonical KAGA labels only', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'), 'Place truth board uses 1920×1080 evidence frames.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await page.getByRole('button', { name: 'حديقة الخيارات', exact: true }).click();
  await expect(page.locator('.kaga-illustrated-hotspot')).toHaveCount(3);
  await expect(page.locator('.kaga-illustrated-hotspot[data-active="true"] text')).toContainText('حديقة الخيارات');
  await capture(page, '02-disney-map-canonical-labels');
});
