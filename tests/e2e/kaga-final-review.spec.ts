import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_FINAL_REVIEW === '1';
const outputRoot = resolve(process.cwd(), 'reports/kaga-final');
const videoRoot = resolve(process.cwd(), 'tmp/kaga-final-video');
test.skip(!enabled, 'Set KAGA_FINAL_REVIEW=1 to capture the final integration review package.');

const is2560 = (testInfo: TestInfo) => testInfo.project.name.includes('2560');

async function shot(page: Page, testInfo: TestInfo, name: string) {
  const viewport = is2560(testInfo) ? '2560x1080' : '1920x1080';
  const directory = resolve(outputRoot, viewport);
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(750);
  await page.screenshot({ path: resolve(directory, `${name}.png`), animations: 'disabled' });
}

async function enterDays(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
}

async function openLegendary(page: Page, explore = true) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  if (explore) await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
}

test('captures final integration evidence', async ({ page }, testInfo) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'تجربة تدشين حدائق الملك عبدالله', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('.kaga-v2-intro img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await shot(page, testInfo, '01-intro');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await shot(page, testInfo, '02-four-days');
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة', exact: true }).click();
  await shot(page, testInfo, '03-source-true-masterplan');
  await page.getByRole('tab', { name: 'استكشف الحدائق', exact: true }).click();
  await shot(page, testInfo, '04-garden-explorer');

  await openLegendary(page, false);
  await shot(page, testInfo, '05-legendary-home');
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await shot(page, testInfo, '06-place-lens-illustrated');
  await page.getByRole('button', { name: /القصة/ }).click();
  await shot(page, testInfo, '07-story-lens');
  await page.getByRole('button', { name: /الضيف/ }).click();
  await shot(page, testInfo, '08-guest-lens');
  await page.getByRole('button', { name: /التجربة/ }).click();
  await shot(page, testInfo, '09-experience-lens');

  if (!is2560(testInfo)) {
    await page.getByRole('button', { name: /المكان/ }).click();
    for (let index = 1; index <= 4; index += 1) {
      await page.getByRole('button', { name: `اليوم ${index}`, exact: true }).first().click();
      await shot(page, testInfo, `10-living-day-${index}`);
    }
    await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
    await shot(page, testInfo, '11-grayscale-masterplan');
    await page.evaluate(() => { document.documentElement.style.filter = ''; });

    await openLegendary(page, false);
    await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click();
    for (let index = 0; index < 4; index += 1) await page.getByRole('button', { name: 'الفصل التالي', exact: true }).click();
    await shot(page, testInfo, '12-global-director');

    await enterDays(page);
    await page.getByRole('tab', { name: /اليوم الثاني/ }).click();
    await page.getByRole('button', { name: 'لحظة التدشين', exact: true }).click();
    await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين', exact: true }).click();
    await shot(page, testInfo, '13-royal-moment');
    await page.getByRole('button', { name: 'تشغيل لحظة التدشين', exact: true }).click();
    await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين', exact: true }).click();
    await shot(page, testInfo, '14-launch-show');

    await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'معرض التصاميم', exact: true })).toBeVisible();
    await shot(page, testInfo, '15-visual-museum');
  }
});

async function recording(browser: Browser) {
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
  if (!video) throw new Error('Playwright video recorder unavailable.');
  return { context, page, video };
}

test('records raw normal-motion Global Director proof', async ({ browser }, testInfo) => {
  test.skip(is2560(testInfo), 'The raw Director proof is recorded once at 1920×1080.');
  test.slow();
  const record = await recording(browser);
  await openLegendary(record.page, false);
  await record.page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click();
  await record.page.waitForTimeout(3_000);
  for (let index = 0; index < 5; index += 1) {
    await record.page.getByRole('button', { name: 'الفصل التالي', exact: true }).click();
    await record.page.waitForTimeout(3_000);
  }
  await record.page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click();
  await record.page.waitForTimeout(5_000);
  await record.page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click();
  await record.page.waitForTimeout(5_000);
  await record.context.close();
  await copyFile(await record.video.path(), resolve(videoRoot, 'KAGA-FINAL-DIRECTOR-PROOF.webm'));
});
