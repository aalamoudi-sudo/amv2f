import { expect, test, type Browser, type Page } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_LEGENDARY_GATE2_REVIEW === '1';
const outputRoot = resolve(process.cwd(), 'reports/legendary-gate2');
const videoRoot = resolve(process.cwd(), 'tmp/legendary-gate2-video');
test.skip(!enabled, 'Set KAGA_LEGENDARY_GATE2_REVIEW=1 for the Gate L2 review package.');

async function entry(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-home')).toBeVisible();
}
async function explore(page: Page) { await entry(page); await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click(); }
async function shot(page: Page, name: string) { await mkdir(outputRoot, { recursive: true }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: resolve(outputRoot, `${name}.png`), animations: 'disabled' }); }

test('captures the full Legendary L2 review state set', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'), 'Gate L2 named review captures are 1920×1080.');
  test.slow();
  await entry(page); await shot(page, '01-legendary-home');
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await page.getByRole('button', { name: /القصة/ }).click(); await shot(page, '02-story-lens');
  await page.getByRole('button', { name: /المكان/ }).click(); await shot(page, '03-place-lens');
  await page.getByRole('button', { name: /الضيف/ }).click(); await shot(page, '04-guest-lens');
  await page.getByRole('button', { name: /التجربة/ }).click(); await shot(page, '05-experience-lens');
  await page.getByRole('button', { name: /المكان/ }).click();
  for (const [index, name] of ['06-day1-living-map', '07-day2-living-map', '08-day3-living-map', '09-day4-living-map'].entries()) {
    await page.getByRole('button', { name: `اليوم ${index + 1}` }).first().click(); await shot(page, name);
  }
  await shot(page, '10-multi-journey-masterplan');
  await page.getByRole('button', { name: /حديقة الخيارات/ }).first().click();
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟', exact: true }).click(); await shot(page, '11-what-happens-here-global');
  await page.getByRole('button', { name: 'من يمر من هنا؟', exact: true }).click(); await shot(page, '12-who-passes-here');
  await page.getByRole('button', { name: 'متى يُستخدم هذا الموقع؟', exact: true }).click(); await shot(page, '13-when-place-used');
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'رحلة سمو الأمين ومعالي وزير الإعلام', exact: true }).first().click();
  await page.getByRole('button', { name: 'شاهد قصة الرحلة', exact: true }).click(); await shot(page, '14-non-prince-journey-director');
  const guestLens = page.getByTestId('legendary-guest-lens');
  for (let index = 0; index < 7; index += 1) await guestLens.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(guestLens.locator('h3')).toContainText('المؤتمر الصحفي');
  await guestLens.getByRole('button', { name: 'دخول التجربة', exact: true }).click();
  await expect(page.locator('.kaga-l2-experience-overlay')).toBeVisible();
  await page.waitForTimeout(1_000);
  await shot(page, '15-spatial-transition-second-journey');
  await page.reload(); await entry(page); await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click(); await shot(page, '16-global-director-opening');
  const next = page.getByRole('button', { name: 'الفصل التالي', exact: true });
  for (let index = 0; index < 4; index += 1) await next.click(); await shot(page, '17-global-director-middle');
  await next.click(); await shot(page, '18-global-director-royal');
  await page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click(); await shot(page, '19-global-director-launch-show');
  await page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click();
  if (await page.locator('.kaga-l2-experience-overlay').count()) await page.locator('.kaga-l2-experience-overlay').getByRole('button', { name: 'العودة إلى السياق', exact: true }).click();
  await page.getByRole('button', { name: 'الفصل التالي', exact: true }).click();
  await shot(page, '20-global-director-finale');
  await page.getByRole('button', { name: 'الدليل', exact: true }).click(); await shot(page, '21-evidence-project-wide');
  await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; }); await shot(page, '22-grayscale-route-proof');
});

async function recording(browser: Browser, name: string) {
  await mkdir(videoRoot, { recursive: true });
  const context = await browser.newContext({ baseURL: process.env.KAGA_BASE_URL, viewport: { width: 1920, height: 1080 }, locale: 'ar-SA', reducedMotion: 'no-preference', recordVideo: { dir: videoRoot, size: { width: 1920, height: 1080 } } });
  const page = await context.newPage(); const video = page.video(); if (!video) throw new Error('Video recorder unavailable.'); return { context, page, video, name };
}
async function save(record: Awaited<ReturnType<typeof recording>>) { await record.context.close(); await copyFile(await record.video.path(), resolve(videoRoot, `${record.name}.webm`)); }

test('records raw full Director excerpt', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560')); test.slow(); const record = await recording(browser, 'full-director-proof'); const { page } = record;
  await entry(page); await page.getByRole('button', { name: 'شاهد قصة التدشين', exact: true }).click(); await page.waitForTimeout(8_000);
  for (let index = 0; index < 5; index += 1) { await page.getByRole('button', { name: 'الفصل التالي', exact: true }).click(); await page.waitForTimeout(5_000); }
  await page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click(); await page.waitForTimeout(8_000);
  await page.getByRole('button', { name: 'متابعة قصة التدشين', exact: true }).click(); await page.waitForTimeout(8_000);
  if (await page.locator('.kaga-l2-experience-overlay').count()) await page.getByRole('button', { name: 'العودة إلى السياق', exact: true }).click();
  await page.waitForTimeout(8_000); await save(record);
});

test('records lens context continuity', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560')); const record = await recording(browser, 'lens-continuity'); const { page } = record;
  await explore(page); await page.getByRole('button', { name: /الضيف/ }).click(); await page.waitForTimeout(2_000); await page.getByRole('button', { name: /المكان/ }).click(); await page.waitForTimeout(2_000); await page.getByRole('button', { name: /القصة/ }).click(); await page.waitForTimeout(2_000); await page.getByRole('button', { name: /الضيف/ }).click(); await page.waitForTimeout(2_000); await save(record);
});

test('records the same map across four days', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560')); const record = await recording(browser, 'living-map'); const { page } = record;
  await explore(page); for (let index = 0; index < 4; index += 1) { await page.getByRole('button', { name: `اليوم ${index + 1}` }).first().click(); await page.waitForTimeout(2_200); } await save(record);
});
