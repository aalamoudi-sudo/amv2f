import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_PRESENTATION_FIDELITY === '1';
const outputDirectory = resolve(process.cwd(), 'reports/presentation-fidelity-gate1-1');

test.skip(!enabled, 'Set KAGA_PRESENTATION_FIDELITY=1 for the isolated PF-1 branch.');

function isWide(testInfo: TestInfo) {
  return testInfo.project.name.includes('2560');
}

async function capture(page: Page, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(outputDirectory, `${name}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

async function openDays(page: Page) {
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await expect(page.getByTestId('project-scale')).toBeVisible();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await expect(page.getByTestId('presentation-fidelity-four-days')).toBeVisible();
}

test('PF-1 visual proof and functional smoke', async ({ page }, testInfo) => {
  test.slow();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('presentation-fidelity-intro')).toBeVisible();
  await expect(page.locator('.kaga-pf-intro__frame')).toHaveAttribute('data-presentation-contour', 'hero');
  await expect(page.locator('.kaga-pf-intro__frame')).toHaveAttribute('data-presentation-archetype', 'editorial');

  const introVisual = await page.locator('.kaga-pf-intro .kaga-pf-frame__visual').boundingBox();
  const introContent = await page.locator('.kaga-pf-intro .kaga-pf-frame__content').boundingBox();
  expect(introVisual?.width ?? 0).toBeGreaterThan(isWide(testInfo) ? 1500 : 1050);
  expect(introContent?.width ?? 0).toBeGreaterThan(isWide(testInfo) ? 900 : 700);
  await capture(page, isWide(testInfo) ? '04-intro-refined-2560' : '01-intro-refined-1920');

  await openDays(page);
  await expect(page.locator('.kaga-day-panel__frame--presentation')).toHaveAttribute('data-presentation-contour', 'chapter');
  await expect(page.locator('.kaga-day-panel__frame--presentation')).toHaveAttribute('data-presentation-archetype', 'event-day');
  await expect(page.getByTestId('v2-day-masterplan-base')).toHaveAttribute(
    'href',
    '/kaga/spatial-registered-v1/executive-masterplan.svg',
  );
  await expect(page.getByRole('img', { name: 'المشهد الجوي لحدائق الملك عبدالله' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'أيام التدشين' }).getByRole('tab')).toHaveCount(4);
  await capture(page, isWide(testInfo) ? '05-four-days-refined-2560' : '02-four-days-refined-1920');

  await page.getByRole('button', { name: 'ابدأ رحلة اليوم', exact: true }).click();
  await expect(page.getByTestId('kaga-v2-masterplan-experience')).toBeVisible();
  await expect(page.locator('.kaga-pf-masterplan__frame')).toHaveAttribute('data-presentation-contour', 'map');
  await expect(page.locator('.kaga-pf-masterplan__frame')).toHaveAttribute('data-presentation-archetype', 'route-map');
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'رحلات التدشين الست' }).getByRole('button')).toHaveCount(6);

  const mapVisual = await page.locator('.kaga-pf-masterplan .kaga-pf-frame__visual').boundingBox();
  expect(mapVisual?.width ?? 0).toBeGreaterThan(isWide(testInfo) ? 1780 : 1300);
  const frameBox = await page.locator('.kaga-pf-masterplan__frame').boundingBox();
  expect((mapVisual?.width ?? 0) / (frameBox?.width ?? 1)).toBeGreaterThanOrEqual(0.715);
  expect((mapVisual?.width ?? 0) / (frameBox?.width ?? 1)).toBeLessThanOrEqual(0.725);
  const mayorJourney = page.getByRole('navigation', { name: 'رحلات التدشين الست' })
    .getByRole('button', { name: 'رحلة سمو الأمين عرض المسار', exact: true });
  await mayorJourney.click();
  await expect(mayorJourney).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.kaga-v2-registered-map__route')).toBeVisible();
  await capture(page, isWide(testInfo) ? '06-masterplan-refined-2560' : '03-masterplan-refined-1920');

  await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('تقدم الرحلة').inputValue())).toBeGreaterThan(0.005);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  await page.getByRole('button', { name: 'المحطة التالية' }).click();
  await expect(page.getByTestId('stop-inspector')).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
