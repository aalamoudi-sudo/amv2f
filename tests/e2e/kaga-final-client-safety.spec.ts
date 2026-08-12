import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.KAGA_FINAL_E2E === '1';
test.skip(!enabled, 'Set KAGA_FINAL_E2E=1 for the clean client runtime checks.');

test('required runtime URLs exist and forbidden internal URLs are absent', async ({ request }) => {
  for (const path of [
    '/',
    '/kaga/illustrated-map/illustrated-composite.webp',
    '/kaga/spatial-registered-v1/executive-masterplan.svg',
    '/kaga/spatial-registered-v1/registered-gardens.geojson',
    '/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf',
  ]) {
    expect((await request.get(path)).status(), `${path} should be public`).toBe(200);
  }

  for (const path of [
    '/specifications/kap-disney-style-map-input-spec.txt',
    '/visual-direction/kap-cover-review.png',
    '/kaga/spatial-v2/selected-layers.json',
    '/kaga/spatial-v2/source-linework.geojson',
    '/kaga/illustrated-map/manifest.json',
    '/kaga/illustrated-map/registration.json',
    '/kaga/spatial-registered-v1/registered-spatial-metadata.json',
  ]) {
    expect((await request.get(path)).status(), `${path} should not be public`).toBe(404);
  }
});

async function enterDays(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
}

test('clean executive runtime loads critical modules without asset or console failures', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('1920'), 'One full client-runtime smoke is sufficient.');
  test.slow();

  const failures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => failures.push(`request: ${request.url()} — ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/kaga/')) {
      failures.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  await enterDays(page);
  const pdfHref = await page.getByRole('link', { name: 'الوثيقة الأصلية', exact: true }).getAttribute('href');
  expect(pdfHref).toContain('/kaga/source/Rev06-King-Abdullah-Gardens-Inauguration.pdf');
  await page.getByRole('button', { name: 'ابدأ رحلة اليوم', exact: true }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('تقدم الرحلة').inputValue())).toBeGreaterThan(0.01);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();

  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await expect(page.getByTestId('legendary-living-map')).toHaveAttribute('data-reading', 'illustrated');

  await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await page.getByRole('button', { name: /متابعة قصة التدشين/ }).click();

  await expect.poll(() => failures).toEqual([]);
});
