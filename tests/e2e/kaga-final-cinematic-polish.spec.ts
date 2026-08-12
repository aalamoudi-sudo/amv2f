import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const captureEnabled = process.env.KAGA_CINEMATIC_CAPTURE === '1';
const reportRoot = resolve(process.cwd(), 'reports/kaga-final-cinematic-polish');

test('registered map gains restrained depth without geometry drift or text blur', async ({ page }) => {
  test.setTimeout(50_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
  const director = page.getByTestId('executive-delight-90s');
  await expect(director).toHaveAttribute('data-camera-state', 'site-reveal', { timeout: 8_000 });

  const layers = page.getByTestId('illustrated-map-layers');
  await expect(layers.locator('[data-depth-plane="background"]')).toHaveCount(1);
  await expect(layers.locator('[data-depth-plane="midground-base"]')).toHaveCount(2);
  await expect(layers.locator('[data-depth-plane="midground-raised"]')).toHaveCount(2);

  await expect(page.getByRole('button', { name: 'ابدأ الرحلة', exact: true })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await expect(director).toHaveAttribute('data-camera-state', 'approach-b', { timeout: 7_000 });

  const mapBounds = await page.getByTestId('delight-map-world').locator('.kaga-delight-map-world__map').boundingBox();
  expect(mapBounds).not.toBeNull();
  expect(mapBounds!.width).toBeGreaterThan(page.viewportSize()!.width);
  expect(mapBounds!.height).toBeGreaterThan(page.viewportSize()!.height);
  const focusVeil = await page.getByTestId('delight-map-world').evaluate((element) => getComputedStyle(element, '::after').backgroundImage);
  expect(focusVeil).toContain('radial-gradient');
  expect(await layers.locator('[data-layer-role="architecture"]').evaluate((element) => getComputedStyle(element).filter)).toContain('drop-shadow');
  await expect(page.getByTestId('delight-current-stop').locator('h3')).toHaveCSS('filter', 'none');

  const frameRate = await page.evaluate(() => new Promise<number>((resolveFrameRate) => {
    const samples: number[] = [];
    const startedAt = performance.now();
    const sample = (now: number) => {
      samples.push(now);
      if (now - startedAt >= 1_000) {
        resolveFrameRate((samples.length - 1) / ((now - startedAt) / 1_000));
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  // Floors are 90% of the approved Kinetic baseline measured in this same
  // headless runtime: 49.24 fps at 1920 and 36.34 fps at 2560.
  const minimumFrameRate = page.viewportSize()!.width >= 2_300 ? 32 : 44;
  expect(frameRate).toBeGreaterThanOrEqual(minimumFrameRate);

  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);
});

test.describe('final cinematic review capture', () => {
  test.skip(!captureEnabled, 'Set KAGA_CINEMATIC_CAPTURE=1 to create the raw review proof.');

  test('records one uncut live sequence and final visual states', async ({ browser }) => {
    test.setTimeout(180_000);
    const rawRoot = resolve(process.cwd(), 'tmp/kaga-final-cinematic-video');
    await Promise.all([mkdir(reportRoot, { recursive: true }), mkdir(rawRoot, { recursive: true })]);
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
    const captureAt = async (second: number, name: string) => {
      await expect.poll(async () => Number(await director.getAttribute('data-elapsed-second')), { timeout: 60_000 }).toBeGreaterThanOrEqual(second);
      await page.screenshot({ path: resolve(reportRoot, name), animations: 'allow', caret: 'hide' });
    };

    await captureAt(8, 'depth-overview-after.png');
    await captureAt(11, 'depth-route-origin-after.png');
    await expect(page.getByRole('button', { name: 'ابدأ الرحلة', exact: true })).toBeVisible({ timeout: 6_000 });
    await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
    await captureAt(20, '04-approach-after.png');
    await captureAt(29, '02-map-depth-after.png');
    await captureAt(38, '06-arrival-after.png');
    await captureAt(89, '08-royal-ending-after.png');
    await captureAt(91, '09-final-frame.png');

    const title = page.getByRole('heading', { name: 'لحظة التدشين', exact: true });
    await expect(title).toBeVisible();
    await expect(page.getByText('ويبقى فصلٌ آخر…')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'اكتشفها لاحقًا' })).toHaveCount(0);
    await expect(page.locator('.kaga-delight-director')).toHaveCSS('opacity', '0');

    await context.close();
    await copyFile(await video.path(), resolve(reportRoot, 'KAGA-FINAL-CINEMATIC-90S.webm'));

    const boardFrames = [
      ['نظرة عامة', 'depth-overview-after.png'],
      ['بداية المسار', 'depth-route-origin-after.png'],
      ['الاقتراب من B', '04-approach-after.png'],
      ['الانتقال B إلى C', '02-map-depth-after.png'],
      ['الوصول إلى C', '06-arrival-after.png'],
    ] as const;
    const cells = await Promise.all(boardFrames.map(async ([titleAr, path]) => {
      const data = await readFile(resolve(reportRoot, path));
      return `<figure><img src="data:image/png;base64,${data.toString('base64')}" alt=""><figcaption>${titleAr}</figcaption></figure>`;
    }));
    const boardContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const board = await boardContext.newPage();
    await board.setContent(`<!doctype html><html dir="rtl"><style>
      *{box-sizing:border-box}body{margin:0;padding:34px;background:#102c27;color:#f7f0e5;font-family:Arial,sans-serif}
      header{display:flex;align-items:end;justify-content:space-between;margin-bottom:24px;border-bottom:1px solid #b99a5b;padding-bottom:15px}
      h1{margin:0;font-size:28px;font-weight:500}p{margin:0;color:#d6c8ad;font-size:12px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
      figure{margin:0;border:1px solid rgba(185,154,91,.3);background:#071814}img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
      figcaption{padding:12px;color:#f2d99a;font-size:14px;text-align:center}
    </style><body><header><h1>KAGA · MAP DEPTH</h1><p>REGISTERED COMPOSITING · NO GEOMETRY CHANGE</p></header><main class="grid">${cells.join('')}</main></body></html>`);
    await board.screenshot({ path: resolve(reportRoot, 'KAGA-MAP-DEPTH-CONTACT-SHEET.png'), fullPage: true, animations: 'disabled' });
    await boardContext.close();
  });
});
