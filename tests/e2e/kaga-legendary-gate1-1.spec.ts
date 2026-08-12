import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_LEGENDARY_GATE11 === '1';
const outputRoot = resolve(process.cwd(), 'reports/legendary-gate1-1');
const videoScratch = resolve(process.cwd(), 'tmp/legendary-gate1-1-video');

test.skip(!enabled, 'Set KAGA_LEGENDARY_GATE11=1 for the L1.1 signature polish proof.');

async function openLegendaryEntry(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await page.getByRole('tab', { name: /اليوم الثالث/ }).click();
  await page.getByRole('button', { name: 'شاهد رحلة سمو أمير المنطقة', exact: true }).click();
  await expect(page.getByTestId('legendary-entry')).toBeVisible();
}

async function openReceptionBeat(page: Page) {
  await page.getByRole('button', { name: 'شاهد قصة الرحلة', exact: true }).click();
  const experience = page.getByTestId('legendary-prince-experience');
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.getByText('الاستقبال والعرضة السعودية', { exact: true }).first()).toBeVisible();
  return experience;
}

async function screenshot(page: Page, name: string) {
  await mkdir(outputRoot, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outputRoot, `${name}.png`), animations: 'disabled' });
}

function isWide(testInfo: TestInfo) {
  return testInfo.project.name.includes('2560');
}

test('L1.1 visual states remain source-backed and context-preserving', async ({ page }, testInfo) => {
  test.slow();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await openLegendaryEntry(page);
  const entryName = isWide(testInfo) ? '02-entry-2560' : '01-entry-1920';
  await screenshot(page, entryName);

  const titleFit = await page.getByTestId('legendary-entry').locator('h1').evaluate((element) => {
    const title = element as HTMLElement;
    const section = title.closest('section')!.getBoundingClientRect();
    const rect = title.getBoundingClientRect();
    return {
      noInternalOverflow: title.scrollHeight <= title.clientHeight + 1 && title.scrollWidth <= title.clientWidth + 1,
      insideEntry: rect.top >= section.top && rect.bottom <= section.bottom,
    };
  });
  expect(titleFit.insideEntry).toBe(true);
  if (!isWide(testInfo)) expect(titleFit.noInternalOverflow).toBe(true);

  if (isWide(testInfo)) {
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    return;
  }

  const experience = await openReceptionBeat(page);
  await page.getByRole('button', { name: 'دخول التجربة', exact: true }).click();
  await expect(page.getByTestId('legendary-experience-reveal')).toBeVisible();
  await page.waitForTimeout(900);
  await screenshot(page, '03-experience-normal');

  await page.getByRole('button', { name: 'كشف التجربة', exact: true }).click();
  const xray = page.getByTestId('legendary-xray');
  await expect(xray).toBeVisible();
  await expect(xray.locator('.kaga-legendary-xray-callout')).toHaveCount(5);
  await screenshot(page, '04-experience-xray');

  await page.getByRole('button', { name: 'أين يحدث هذا؟', exact: true }).click();
  const whereAnswer = page.getByTestId('legendary-spatial-query');
  await expect(whereAnswer).toContainText('هنا يحدث هذا');
  await expect(page.getByTestId('legendary-experience-reveal')).toHaveCount(0);
  await page.waitForTimeout(1100);
  await screenshot(page, '07-where-does-this-happen-map-answer');

  await whereAnswer.getByRole('button', { name: 'العودة إلى التجربة', exact: true }).click();
  await expect(page.getByTestId('legendary-experience-reveal')).toBeVisible();
  await expect(experience).toHaveAttribute('data-mode', 'explore');
  await page.waitForTimeout(900);
  await screenshot(page, '08-return-to-experience');

  await page.getByRole('button', { name: 'العودة إلى الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'متابعة القصة', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟', exact: true }).click();
  const whatAnswer = page.getByTestId('legendary-spatial-query');
  await expect(whatAnswer).toContainText('المكان الحالي');
  await expect(whatAnswer).toContainText('اليوم');
  await expect(whatAnswer).toContainText('الرحلة');
  await expect(whatAnswer).toContainText('التجربة');
  await screenshot(page, '06-what-happens-here');

  await whatAnswer.getByRole('button', { name: 'العودة إلى الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'متابعة القصة', exact: true }).click();
  await expect(experience).toHaveAttribute('data-mode', 'directed');
  await screenshot(page, '09-resume-after-explore');

  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  for (let index = 0; index < 8; index += 1) {
    await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  }
  await expect(page.getByTestId('legendary-finale')).toBeVisible();
  await screenshot(page, '10-final-state');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

async function recordedPage(browser: Browser, name: string) {
  await mkdir(videoScratch, { recursive: true });
  const context = await browser.newContext({
    baseURL: process.env.KAGA_BASE_URL ?? 'http://127.0.0.1:4173',
    viewport: { width: 1920, height: 1080 },
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'no-preference',
    recordVideo: { dir: videoScratch, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error(`Video recorder did not start for ${name}.`);
  return { context, page, video, name };
}

async function saveRecording(recording: Awaited<ReturnType<typeof recordedPage>>) {
  await recording.context.close();
  await copyFile(await recording.video.path(), resolve(videoScratch, `${recording.name}.webm`));
}

test('normal-motion signature workflow is one continuous live-UI recording', async ({ browser }, testInfo) => {
  test.skip(isWide(testInfo), 'Signature video is captured once at 1920×1080.');
  test.slow();
  const recording = await recordedPage(browser, 'signature-motion');
  const { page } = recording;
  await openLegendaryEntry(page);
  await page.getByRole('button', { name: 'شاهد قصة الرحلة', exact: true }).click();
  const experience = page.getByTestId('legendary-prince-experience');
  await page.waitForTimeout(800);
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await page.waitForTimeout(7_500);
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await page.waitForTimeout(9_000);
  await expect(page.getByTestId('legendary-experience-reveal')).toBeVisible();
  await page.waitForTimeout(3_000);
  await page.getByRole('button', { name: 'العودة إلى الرحلة', exact: true }).click();
  await page.waitForTimeout(2_000);
  await expect(experience).toHaveAttribute('data-mode', 'paused');
  await page.getByRole('button', { name: 'متابعة القصة', exact: true }).click();
  await expect(experience).toHaveAttribute('data-mode', 'directed');
  await page.waitForTimeout(2_000);
  await saveRecording(recording);
});

test('normal-motion interruption resumes the exact live beat', async ({ browser }, testInfo) => {
  test.skip(isWide(testInfo), 'Interruption video is captured once at 1920×1080.');
  test.slow();
  const recording = await recordedPage(browser, 'interrupt-resume');
  const { page } = recording;
  await openLegendaryEntry(page);
  const experience = await openReceptionBeat(page);
  const chapterBefore = await page.locator('.kaga-legendary__chapters [data-current="true"]').innerText();
  await page.waitForTimeout(1_500);
  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await expect(experience).toHaveAttribute('data-mode', 'explore');
  await page.waitForTimeout(1_500);
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟', exact: true }).click();
  await expect(page.getByTestId('legendary-spatial-query')).toBeVisible();
  await page.waitForTimeout(3_000);
  await page.getByTestId('legendary-spatial-query').getByRole('button', { name: 'العودة إلى الرحلة', exact: true }).click();
  await page.waitForTimeout(1_500);
  await page.getByRole('button', { name: 'متابعة القصة', exact: true }).click();
  await expect(experience).toHaveAttribute('data-mode', 'directed');
  await expect(page.locator('.kaga-legendary__chapters [data-current="true"]')).toHaveText(chapterBefore);
  await page.waitForTimeout(3_000);
  await saveRecording(recording);
});
