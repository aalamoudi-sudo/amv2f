import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_LEGENDARY_GATE1 === '1';
const outputRoot = resolve(process.cwd(), 'reports/legendary-gate1');

test.skip(!enabled, 'Set KAGA_LEGENDARY_GATE1=1 for the Prince orchestration proof.');

function resolution(testInfo: TestInfo) {
  return testInfo.project.name.includes('2560') ? '2560x1080' : '1920x1080';
}

async function capture(page: Page, testInfo: TestInfo, name: string, liveMotion = false) {
  const directory = resolve(outputRoot, resolution(testInfo));
  await mkdir(directory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(directory, `${name}.png`),
    animations: liveMotion ? 'allow' : 'disabled',
    fullPage: false,
  });
}

async function openPrinceDay(page: Page) {
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await page.getByRole('tab', { name: /اليوم الثالث/ }).click();
}

test('Legendary Prince is a live, interruptible, source-backed orchestration', async ({ page }, testInfo) => {
  test.slow();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await openPrinceDay(page);

  await page.getByRole('button', { name: 'ابدأ رحلة اليوم', exact: true }).click();
  await expect(page.getByTestId('kaga-v2-masterplan-experience')).toBeVisible();
  await capture(page, testInfo, '00-prince-v21-before');
  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الأيام' }).click();
  await page.getByRole('tab', { name: /اليوم الثالث/ }).click();

  await page.getByRole('button', { name: 'شاهد رحلة سمو أمير المنطقة' }).click();
  await expect(page.getByTestId('legendary-entry')).toBeVisible();
  await capture(page, testInfo, '01-legendary-entry');

  await page.getByRole('button', { name: 'شاهد قصة الرحلة' }).click();
  const experience = page.getByTestId('legendary-prince-experience');
  await expect(experience).toHaveAttribute('data-mode', 'directed');
  await capture(page, testInfo, '02-director-start');

  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.getByText('من المدخل الرئيسي إلى الاستقبال')).toBeVisible();
  await capture(page, testInfo, '03-temporal-choreography');

  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.getByText('الاستقبال والعرضة السعودية', { exact: true }).first()).toBeVisible();
  await capture(page, testInfo, '04-map-arrival-at-stop');

  await page.getByRole('button', { name: 'دخول التجربة' }).click();
  await page.waitForTimeout(120);
  await capture(page, testInfo, '05-spatial-transition-begin', true);
  await expect(page.getByTestId('legendary-experience-reveal')).toBeVisible();
  await page.waitForTimeout(900);
  await capture(page, testInfo, '06-experience-full');

  await page.getByRole('button', { name: 'كشف التجربة' }).click();
  await expect(page.getByTestId('legendary-xray')).toBeVisible();
  await capture(page, testInfo, '07-experience-xray');

  await page.getByRole('button', { name: 'العودة إلى الرحلة' }).click();
  await expect(page.getByTestId('legendary-experience-reveal')).toHaveCount(0);
  await expect(experience).toHaveAttribute('data-mode', 'paused');
  await capture(page, testInfo, '08-return-to-map');

  await page.getByRole('button', { name: 'متابعة القصة' }).click();
  await page.getByRole('button', { name: 'استكشف' }).click();
  await page.getByRole('button', { name: 'ماذا يحدث هنا؟' }).click();
  await expect(page.getByTestId('legendary-spatial-query')).toBeVisible();
  await capture(page, testInfo, '09-what-happens-here');

  await page.getByTestId('legendary-spatial-query').getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'دخول التجربة' }).click();
  await page.waitForTimeout(850);
  await page.getByRole('button', { name: 'أين يحدث هذا؟' }).click();
  await expect(page.getByTestId('legendary-spatial-query')).toBeVisible();
  await page.waitForTimeout(900);
  await capture(page, testInfo, '10-where-does-this-happen');

  await page.getByTestId('legendary-spatial-query').getByRole('button', { name: 'إغلاق' }).click();
  await expect(experience).toHaveAttribute('data-mode', 'explore');
  await capture(page, testInfo, '11-explore-interruption');

  await page.getByRole('button', { name: 'متابعة القصة' }).click();
  await expect(experience).toHaveAttribute('data-mode', 'directed');
  await capture(page, testInfo, '12-resume-story');

  await page.goto('/?provenance=1');
  await openPrinceDay(page);
  await page.getByRole('button', { name: 'شاهد رحلة سمو أمير المنطقة' }).click();
  await page.getByRole('button', { name: 'شاهد قصة الرحلة' }).click();
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  const evidence = page.getByTestId('legendary-evidence');
  await evidence.getByText('إظهار الدليل').click();
  await expect(evidence).toHaveAttribute('open', '');
  await capture(page, testInfo, '13-evidence-mode');

  for (let index = 0; index < princeStepsToFinale; index += 1) {
    await experience.getByRole('button', { name: 'التالي', exact: true }).click();
  }
  await expect(page.getByTestId('legendary-finale')).toBeVisible();
  await capture(page, testInfo, '14-prince-finale');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

const princeStepsToFinale = 8;
