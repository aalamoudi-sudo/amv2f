import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const captureEnabled = process.env.KAGA_KINETIC_CAPTURE === '1';
const reportRoot = resolve(process.cwd(), 'reports/kaga-kinetic-dramaturgy');

test('normal-motion dramaturgy evolves through distinct visual chapters', async ({ page }) => {
  test.setTimeout(140_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();

  const director = page.getByTestId('executive-delight-90s');
  await expect(director).toHaveAttribute('data-camera-state', 'cinematic-majesty');
  await expect(director).toHaveAttribute('data-camera-state', 'site-reveal', { timeout: 8_000 });
  await expect(director).toHaveAttribute('data-camera-state', 'route-origin', { timeout: 6_000 });

  const start = page.getByRole('button', { name: 'ابدأ الرحلة', exact: true });
  await expect(start).toBeVisible({ timeout: 5_000 });
  await start.click();
  await expect(director).toHaveAttribute('data-camera-state', 'route-awakening');
  await expect(director).toHaveAttribute('data-camera-state', 'approach-b', { timeout: 6_000 });

  const map = page.getByTestId('delight-map-world');
  const scale = await map.locator('.kaga-delight-map-world__map').evaluate((element) => getComputedStyle(element).transform);
  expect(scale).not.toBe('none');
  await expect(page.locator('.kaga-delight-director')).toHaveCSS('opacity', '0.08');
  await page.getByRole('button', { name: 'العودة إلى المشروع', exact: true }).click();
  await expect(director).toBeHidden();
});

test('reduced motion keeps the live Director usable without spatial animation', async ({ page }) => {
  test.setTimeout(35_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
  const director = page.getByTestId('executive-delight-90s');
  await expect(director).toBeVisible();
  const transitionDuration = await director.locator('.kaga-delight-majesty').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(['0s', '0.00001s']).toContain(transitionDuration);
  await expect(director).toHaveAttribute('data-camera-state', 'site-reveal', { timeout: 8_000 });
});

test('Visual Museum begins as image and environment title before navigation chrome', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'التصاميم', exact: true }).click();
  const museum = page.getByTestId('visual-museum');
  await expect(museum).toHaveAttribute('data-chrome-visible', 'false');
  await expect(museum.locator('.kaga-museum-tabs')).toHaveCSS('opacity', '0');
  await expect(museum.locator('.kaga-museum-caption h2')).toBeVisible();
  await page.getByRole('button', { name: 'زوايا المشهد' }).click();
  await expect(museum).toHaveAttribute('data-chrome-visible', 'true');
});

test.describe('review capture', () => {
  test.skip(!captureEnabled, 'Set KAGA_KINETIC_CAPTURE=1 to record the raw normal-motion review proof.');

  test('records one uncut video and a frame every three seconds', async ({ browser }) => {
    test.setTimeout(180_000);
    const frameRoot = resolve(reportRoot, 'frames');
    const rawRoot = resolve(process.cwd(), 'tmp/kaga-kinetic-dramaturgy-video');
    await Promise.all([mkdir(frameRoot, { recursive: true }), mkdir(rawRoot, { recursive: true })]);

    const context = await browser.newContext({
      baseURL: process.env.KAGA_BASE_URL ?? 'http://127.0.0.1:4173',
      locale: 'ar-SA',
      reducedMotion: 'no-preference',
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: rawRoot, size: { width: 1920, height: 1080 } },
    });
    const page = await context.newPage();
    const video = page.video();
    if (!video) throw new Error('Playwright video recorder is unavailable.');

    await page.goto('/');
    await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
    const director = page.getByTestId('executive-delight-90s');
    let started = false;
    const framePaths: string[] = [];

    for (let second = 0; second <= 90; second += 3) {
      if (second >= 15 && !started) {
        const start = page.getByRole('button', { name: 'ابدأ الرحلة', exact: true });
        await expect(start).toBeVisible({ timeout: 16_000 });
        await start.click();
        started = true;
      }
      await expect.poll(async () => Number(await director.getAttribute('data-elapsed-second')), { timeout: 10_000 }).toBeGreaterThanOrEqual(second);
      const framePath = resolve(frameRoot, `${String(second).padStart(2, '0')}s.png`);
      await page.screenshot({ path: framePath, animations: 'allow', caret: 'hide' });
      framePaths.push(framePath);
    }

    await expect(page.getByTestId('delight-tease')).toBeVisible();
    await context.close();
    const rawVideo = resolve(reportRoot, 'KAGA-KINETIC-DRAMATURGY-90S.webm');
    await copyFile(await video.path(), rawVideo);

    const boardContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const board = await boardContext.newPage();
    const cells = await Promise.all(framePaths.map(async (framePath, index) => {
      const data = await readFile(framePath);
      return `<figure><img src="data:image/png;base64,${data.toString('base64')}" alt=""><figcaption>${String(index * 3).padStart(2, '0')}s</figcaption></figure>`;
    }));
    await board.setContent(`<!doctype html><html dir="rtl"><style>
      *{box-sizing:border-box}body{margin:0;padding:28px;background:#102c27;color:#f7f0e5;font-family:Arial,sans-serif}
      header{display:flex;align-items:end;justify-content:space-between;margin:0 0 22px;border-bottom:1px solid #b99a5b;padding-bottom:14px}
      h1{margin:0;font-size:28px;font-weight:500}p{margin:0;color:#d6c8ad;font-size:12px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
      figure{position:relative;margin:0;border:1px solid rgba(185,154,91,.28);background:#071814}img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
      figcaption{position:absolute;bottom:7px;left:8px;padding:3px 6px;background:rgba(5,20,16,.72);color:#f2d99a;font:11px monospace}
    </style><body><header><h1>KAGA · KINETIC DRAMATURGY · 90 SECONDS</h1><p>RAW LIVE UI · FRAME EVERY 3 SECONDS · 1920×1080</p></header><main class="grid">${cells.join('')}</main></body></html>`);
    await board.screenshot({ path: resolve(reportRoot, 'KAGA-KINETIC-90S-CONTACT-SHEET.png'), fullPage: true, animations: 'disabled' });
    await boardContext.close();

    await writeFile(resolve(reportRoot, 'CAPTURE-NOTES.txt'), [
      'Raw live UI capture; no cuts and no post-production.',
      'Source recording: KAGA-KINETIC-DRAMATURGY-90S.webm',
      'Frame cadence: one screenshot every three director seconds.',
      'Viewport: 1920x1080; reduced motion disabled.',
    ].join('\n') + '\n');
  });
});
