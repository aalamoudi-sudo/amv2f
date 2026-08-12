import { expect, test, type Browser, type Page } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_ILLUSTRATED_REVIEW === '1';
const outputRoot = resolve(process.cwd(), 'reports/illustrated-map-gate1');
const videoRoot = resolve(process.cwd(), 'tmp/illustrated-map-video');
test.skip(!enabled, 'Set KAGA_ILLUSTRATED_REVIEW=1 for Gate M1 review artifacts.');

async function openPlaceLens(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await expect(page.getByTestId('legendary-place-lens')).toBeVisible();
}

async function setReading(page: Page, label: 'المخطط' | 'الخريطة التصويرية' | 'قصة التدشين') {
  await page.getByTestId('map-reading-switcher').getByRole('button', { name: label, exact: true }).click();
}

async function shot(page: Page, name: string, animations: 'allow' | 'disabled' = 'disabled') {
  await mkdir(outputRoot, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outputRoot, `${name}.png`), animations });
}

test('captures the 16 illustrated map review states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'), 'Named Gate M1 captures use 1920×1080.');
  test.slow();
  await openPlaceLens(page);
  await shot(page, '01-source-true-masterplan');
  await setReading(page, 'الخريطة التصويرية');
  await page.waitForTimeout(900);
  await shot(page, '02-illustrated-map');
  await setReading(page, 'قصة التدشين');
  await shot(page, '03-story-map');
  await setReading(page, 'المخطط');
  await setReading(page, 'الخريطة التصويرية');
  await page.waitForTimeout(260);
  await shot(page, '04-source-to-illustrated-reveal', 'allow');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'حديقة الخيارات', exact: true }).click();
  await shot(page, '05-place-lens-illustrated');
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟', exact: true }).click();
  await shot(page, '06-what-happens-here-illustrated');
  await page.getByRole('button', { name: 'من يمر من هنا؟', exact: true }).click();
  await shot(page, '07-who-passes-here-illustrated');
  await page.getByRole('button', { name: 'متى يُستخدم هذا الموقع؟', exact: true }).click();
  await shot(page, '08-when-place-used-illustrated');
  for (const [index, name] of ['09-living-day-map-illustrated-day1', '10-living-day-map-illustrated-day2', '11-living-day-map-illustrated-day3', '12-living-day-map-illustrated-day4'].entries()) {
    await page.getByRole('button', { name: `اليوم ${index + 1}`, exact: true }).first().click();
    await shot(page, name);
  }
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'رحلة سمو الأمين ومعالي وزير الإعلام', exact: true }).first().click();
  await shot(page, '13-journey-on-illustrated-map');
  const guest = page.getByTestId('legendary-guest-lens');
  for (let index = 0; index < 7; index += 1) await guest.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(guest.locator('h3')).toContainText('المؤتمر الصحفي');
  await guest.getByRole('button', { name: 'دخول التجربة', exact: true }).click();
  await page.getByRole('button', { name: 'كشف التجربة', exact: true }).click();
  await expect(page.getByTestId('xray-illustrated-context')).toBeVisible();
  await shot(page, '14-xray-with-illustrated-context');
  await page.getByRole('button', { name: 'العودة إلى السياق', exact: true }).click();
  await page.getByRole('button', { name: 'الدليل', exact: true }).click();
  await shot(page, '15-evidence-mode-illustrated');
  await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
  await shot(page, '16-grayscale-illustrated-proof');
});

test('captures key 2560 illustrated compositions', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('2560'));
  await openPlaceLens(page);
  await setReading(page, 'الخريطة التصويرية');
  await page.waitForTimeout(900);
  const directory = resolve(outputRoot, '2560x1080');
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, '02-illustrated-map.png'), animations: 'disabled' });
  await setReading(page, 'قصة التدشين');
  await page.screenshot({ path: resolve(directory, '03-story-map.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'حديقة الخيارات', exact: true }).click();
  await page.screenshot({ path: resolve(directory, '05-place-lens-illustrated.png'), animations: 'disabled' });
});

async function recording(browser: Browser, name: string) {
  await mkdir(videoRoot, { recursive: true });
  const context = await browser.newContext({
    baseURL: process.env.KAGA_BASE_URL,
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA',
    reducedMotion: 'no-preference',
    recordVideo: { dir: videoRoot, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error('Video recorder unavailable.');
  return { context, page, video, name };
}

async function save(record: Awaited<ReturnType<typeof recording>>) {
  await record.context.close();
  await copyFile(await record.video.path(), resolve(videoRoot, `${record.name}.webm`));
}

test('records the raw source-to-illustrated reveal', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'));
  const record = await recording(browser, 'KAGA-ILLUSTRATED-MAP-REVEAL');
  await openPlaceLens(record.page);
  await record.page.waitForTimeout(1_500);
  await setReading(record.page, 'الخريطة التصويرية');
  await record.page.waitForTimeout(4_000);
  await setReading(record.page, 'المخطط');
  await record.page.waitForTimeout(1_500);
  await setReading(record.page, 'الخريطة التصويرية');
  await record.page.waitForTimeout(3_000);
  await save(record);
});

test('records the illustrated Living Map across four days', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'));
  const record = await recording(browser, 'KAGA-ILLUSTRATED-MAP-DAY-TRANSITION');
  await openPlaceLens(record.page);
  await setReading(record.page, 'الخريطة التصويرية');
  await record.page.waitForTimeout(1_500);
  for (let index = 0; index < 4; index += 1) {
    await record.page.getByRole('button', { name: `اليوم ${index + 1}`, exact: true }).first().click();
    await record.page.waitForTimeout(2_200);
  }
  await save(record);
});
