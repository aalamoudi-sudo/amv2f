import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_V2_FINAL === '1';
const outputDirectory = resolve(process.cwd(), 'reports/v2-final/screenshots');

test.skip(!enabled, 'Set KAGA_V2_FINAL=1 for the isolated KAGA V2 final-polish build.');

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  await page.waitForTimeout(100);
  const suffix = testInfo.project.name.includes('2560') ? '-2560x1080' : '';
  await page.screenshot({
    path: resolve(outputDirectory, `${name}${suffix}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

async function captureProof(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  const suffix = testInfo.project.name.includes('2560') ? '-2560x1080' : '';
  await page.screenshot({
    path: resolve(outputDirectory, `${name}${suffix}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

test('KAGA V2 final executive visual and interaction polish', async ({ page }, testInfo) => {
  test.slow();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'تجربة تدشين حدائق الملك عبدالله' })).toBeVisible();

  const introArea = page.locator('.kaga-v2-intro .kaga-metric-value[aria-label="+2M م²"]');
  await expect(introArea).toBeVisible();
  await expect(introArea.locator(':scope > .kaga-metric-value__number')).toHaveText('+2M');
  await expect(introArea.locator(':scope > .kaga-metric-value__unit > sup')).toHaveText('2');
  expect(await introArea.evaluate((element) => ({
    display: getComputedStyle(element).display,
    direction: getComputedStyle(element).direction,
    children: Array.from(element.children).map((child) => child.className),
  }))).toEqual({
    display: 'inline-flex',
    direction: 'ltr',
    children: ['kaga-metric-value__number', 'kaga-metric-value__unit'],
  });

  if (testInfo.project.name.includes('2560')) {
    const frame = await page.locator('.kaga-v2-intro > .kaga-organic-frame').boundingBox();
    const visual = await page.locator('.kaga-v2-intro .kaga-organic-frame__visual-shell').boundingBox();
    const content = await page.locator('.kaga-v2-intro .kaga-organic-frame__content').boundingBox();
    expect(frame?.width ?? 0).toBeGreaterThan(2380);
    expect(visual?.width ?? 0).toBeGreaterThan(1250);
    expect(content?.width ?? 0).toBeGreaterThan(850);
  }
  await capture(page, testInfo, '01-intro');

  await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
  await expect(page.getByTestId('project-scale')).toBeVisible();
  await expect(page.getByTestId('project-scale').locator('.kaga-metric-value[aria-label="+2M م²"]')).toBeVisible();
  await capture(page, testInfo, '02-project-scale');

  await page.getByRole('button', { name: 'اكتشف أيام التدشين' }).click();
  await expect(page.getByTestId('v2-day-spatial-preview')).toBeVisible();
  await expect(page.getByTestId('v2-day-masterplan-base')).toHaveAttribute('href', '/kaga/spatial-registered-v1/executive-masterplan.svg');
  await expect(page.locator('[data-journey-id="workers"]')).toBeVisible();
  await capture(page, testInfo, '03-four-days');
  await captureProof(page, testInfo, 'four-days-v2-map-proof');

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await capture(page, testInfo, '04-masterplan');

  await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
  await expect(page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button')).toHaveCount(6);
  await capture(page, testInfo, '05-garden-explorer');

  await page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button', { name: /الحديقة الديفونية/ }).click();
  const gardenArea = page.getByTestId('garden-detail').locator('.kaga-metric-value[aria-label="3,600 م²"]');
  await expect(gardenArea).toBeVisible();
  await expect(gardenArea.locator(':scope > .kaga-metric-value__number')).toHaveText('3,600');
  await expect(gardenArea.locator(':scope > .kaga-metric-value__unit > sup')).toHaveText('2');
  await capture(page, testInfo, '06-garden-detail');
  await captureProof(page, testInfo, 'metric-rendering-proof');

  await page.getByRole('button', { name: 'العودة إلى دليل الحدائق' }).click();
  await page.getByRole('tab', { name: 'رحلة التدشين' }).click();
  await page.getByRole('button', { name: 'H، الحديقة الديفونية' }).click();
  await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
  await expect.poll(async () => Number(await page.getByLabel('تقدم الرحلة').inputValue())).toBeGreaterThan(0.01);
  await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
  await capture(page, testInfo, '07-journey-playback');

  await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
  await page.getByRole('button', { name: 'قصة مبنى الهلالين' }).click();
  await expect(page.getByTestId('crescent-story')).toBeVisible();
  const crescentImage = page.getByTestId('crescent-story').locator('img');
  await expect(crescentImage).toHaveAttribute('src', '/kaga/assets/v2/royal-model-clean-p015.jpg');
  expect(await crescentImage.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([1787, 1003]);
  await capture(page, testInfo, '08-crescent-story');
  await captureProof(page, testInfo, 'crescent-clean-source-proof');

  await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين' }).click();
  const royalModel = page.getByRole('img', { name: 'مجسم التدشين الملكي المعتمد' });
  await expect(royalModel).toBeVisible();
  expect(await royalModel.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('royal-model-clean-p015.jpg');
  await capture(page, testInfo, '09-royal-moment');

  await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
  await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' })).toBeVisible();
  await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' }).click();
  const launchStage = page.getByRole('img', { name: 'حدائق الملك عبدالله ومبنى الهلالين في مشهد عرض التدشين' });
  expect(await launchStage.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('launch-stage-clean-p020.jpg');
  await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
  await expect(page.getByText('التسلسل قيد العرض')).toBeVisible();
  await capture(page, testInfo, '10-launch-show');

  await page.getByRole('button', { name: 'وضع التقديم' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'المعرض المتنقل', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /النقطة 1:/ }).click();
  await page.getByRole('button', { name: 'تفعيل كبسولة البذرة' }).click();
  await expect(page.getByText(/مشهد بصري يأخذ/)).toBeVisible();
  await capture(page, testInfo, '11-mobile-exhibition');

  await page.getByRole('button', { name: 'منصة الدعوات' }).click();
  await expect(page.getByRole('heading', { name: 'منصة إدارة الدعوات' })).toBeVisible();
  await capture(page, testInfo, '12-invitations');

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم' }).click();
  await expect(page.getByRole('heading', { name: 'معرض التصاميم' })).toBeVisible();
  const museumImage = page.locator('.kaga-museum-stage > img');
  await expect(museumImage).toBeVisible();
  await expect.poll(() => museumImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await capture(page, testInfo, '13-visual-museum');

  await page.getByRole('button', { name: 'وضع التقديم' }).click();
  await expect(page.getByTestId('kaga-v2-app')).toHaveAttribute('data-presenter', 'true');
  await expect(page.getByRole('navigation', { name: 'التنقل التنفيذي' })).toHaveCount(0);
  await capture(page, testInfo, '14-presenter-mode');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
