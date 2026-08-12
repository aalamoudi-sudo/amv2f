import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const enabled = process.env.KAGA_VISUAL_REBIRTH_VIDEO === '1';
test.skip(!enabled, 'Set KAGA_VISUAL_REBIRTH_VIDEO=1 to capture the raw review recording.');

test('records the uncut normal-motion Visual Rebirth sequence', async ({ browser }) => {
  test.setTimeout(150_000);
  const output = resolve(process.cwd(), 'reports/kaga-visual-rebirth');
  const raw = resolve(process.cwd(), 'tmp/kaga-visual-rebirth-video');
  await Promise.all([mkdir(output, { recursive: true }), mkdir(raw, { recursive: true })]);

  const context = await browser.newContext({
    baseURL: process.env.KAGA_BASE_URL,
    locale: 'ar-SA',
    reducedMotion: 'no-preference',
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: raw, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error('Playwright video recorder is unavailable.');

  await page.goto('/');
  await page.waitForTimeout(3_200);
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
  const start = page.getByRole('button', { name: 'ابدأ الرحلة', exact: true });
  await expect(start).toBeVisible({ timeout: 22_000 });
  await start.click();
  await expect(page.getByTestId('delight-tease')).toBeVisible({ timeout: 75_000 });
  await page.waitForTimeout(2_000);

  await context.close();
  await copyFile(await video.path(), resolve(output, 'KAGA-VISUAL-REBIRTH-90S.webm'));
});
