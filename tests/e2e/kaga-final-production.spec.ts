import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.KAGA_FINAL_E2E === '1';
test.skip(!enabled, 'Set KAGA_FINAL_E2E=1 for the final production scenarios.');

async function enterDays(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
}

async function openLegendary(page: Page, explore = true) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-home')).toBeVisible();
  if (explore) await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
}

test('A — Intro to journey playback to knowledge and exact return', async ({ page }) => {
  await enterDays(page);
  await page.getByRole('button', { name: 'ابدأ رحلة اليوم', exact: true }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await page.getByRole('button', { name: 'H، الحديقة الديفونية', exact: true }).click();
  await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('تقدم الرحلة').inputValue())).toBeGreaterThan(0.01);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  await page.getByRole('button', { name: 'H، الحديقة الديفونية', exact: true }).click();
  const marker = await page.getByTestId('registered-marker').getAttribute('transform');
  await page.getByRole('button', { name: 'اكتشف الموقع', exact: true }).click();
  await expect(page.getByTestId('garden-detail')).toContainText('الحديقة الديفونية');
  await page.getByRole('button', { name: 'العودة إلى الرحلة', exact: true }).click();
  await expect(page.getByTestId('registered-marker')).toHaveAttribute('transform', marker ?? '');
});

test('B — Global Director interruption and exact resume', async ({ page }) => {
  await openLegendary(page, false);
  await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click();
  const system = page.getByTestId('legendary-l2-system');
  await expect(system).toHaveAttribute('data-mode', 'directed');
  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await expect(system).toHaveAttribute('data-mode', 'explore');
  await page.getByRole('button', { name: /متابعة قصة التدشين/ }).click();
  await expect(system).toHaveAttribute('data-mode', 'directed');
});

test('C — Place lens illustrated queries resolve to a journey', async ({ page }) => {
  await openLegendary(page);
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await page.getByRole('button', { name: 'حديقة الخيارات', exact: true }).click();
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟', exact: true }).click();
  await expect(page.getByTestId('legendary-place-lens').getByText('الأيام')).toBeVisible();
  await page.getByRole('button', { name: 'من يمر من هنا؟', exact: true }).click();
  await page.getByRole('button', { name: 'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين', exact: true }).last().click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-lens', 'place');
});

test('D — Guest lens starts a non-Prince journey Director', async ({ page }) => {
  await openLegendary(page);
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'رحلة سمو الأمين ومعالي وزير الإعلام', exact: true }).first().click();
  await page.getByRole('button', { name: 'شاهد قصة الرحلة', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await expect(page.getByText('رحلة سمو الأمين ومعالي وزير الإعلام', { exact: true }).last()).toBeVisible();
});

test('E — normal-motion Royal Moment continues into Launch Show', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('1920'), 'One deterministic normal-motion ceremony proof is sufficient.');
  test.slow();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await enterDays(page);
  await page.getByRole('tab', { name: /اليوم الثاني/ }).click();
  await page.getByRole('button', { name: 'لحظة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'تشغيل لحظة التدشين', exact: true }).click();
  await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين', exact: true })).toBeVisible({ timeout: 12_000 });
  await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'تشغيل عرض التدشين', exact: true }).click();
  await expect(page.getByText('3 من 3 طبقات مفعّلة')).toBeVisible({ timeout: 12_000 });
});

test('F — Visual Museum remains available in Presenter Mode', async ({ page }) => {
  await enterDays(page);
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'معرض التصاميم', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'وضع التقديم', exact: true }).click();
  await expect(page.getByTestId('kaga-v2-app')).toHaveAttribute('data-presenter', 'true');
  await expect(page.getByRole('navigation', { name: 'التنقل التنفيذي' })).toHaveCount(0);
});

test('G — three map readings preserve the same journey geometry and stop', async ({ page }) => {
  await openLegendary(page);
  const map = page.getByTestId('legendary-living-map');
  const switcher = page.getByTestId('map-reading-switcher');
  const route = await map.locator('.route-line').first().getAttribute('d');
  const activeStop = await map.locator('.route-stop[data-active="true"]').first().getAttribute('transform');
  for (const reading of ['الخريطة التصويرية', 'قصة التدشين', 'المخطط']) {
    await switcher.getByRole('button', { name: reading, exact: true }).click();
    expect(await map.locator('.route-line').first().getAttribute('d')).toBe(route);
    expect(await map.locator('.route-stop[data-active="true"]').first().getAttribute('transform')).toBe(activeStop);
  }
  await expect(page.getByRole('button', { name: 'الدليل', exact: true })).toHaveCount(0);
});
