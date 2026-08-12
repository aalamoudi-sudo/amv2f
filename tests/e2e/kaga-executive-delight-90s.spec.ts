import { expect, test } from '@playwright/test';

const reportDir = 'reports/kaga-executive-delight-90s';

test.use({
  video: { mode: 'on', size: { width: 1920, height: 1080 } },
});

test('the live first-90-second experience preserves source and spatial continuity', async ({ page }) => {
  test.setTimeout(150_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto('/');
  await page.waitForTimeout(3_200);
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();

  const delight = page.getByTestId('executive-delight-90s');
  await expect(delight).toHaveAttribute('data-act', 'majesty');
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: `${reportDir}/01-majesty-1920.png` });

  const start = page.getByRole('button', { name: 'ابدأ الرحلة', exact: true });
  await expect(start).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('delight-journey-rail')).toHaveAttribute('data-continuous-sequence', 'A-L');
  await page.screenshot({ path: `${reportDir}/02-discovery-1920.png` });
  await start.click();

  await page.waitForTimeout(8_000);
  await expect(delight).toHaveAttribute('data-act', 'journey');
  await page.screenshot({ path: `${reportDir}/03-movement-1920.png` });

  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await expect(delight).toHaveAttribute('data-exploring', 'true');
  const pausedStop = await page.getByTestId('delight-current-stop').innerText();
  await page.waitForTimeout(2_000);
  expect(await page.getByTestId('delight-current-stop').innerText()).toBe(pausedStop);
  await page.getByRole('button', { name: 'متابعة العرض', exact: true }).click();

  await page.waitForTimeout(12_500);
  await expect(page.getByTestId('delight-current-stop')).toContainText('الاستقبال والعرضة السعودية');
  await expect(page.getByTestId('delight-current-stop')).toContainText('60 دقيقة');
  await page.screenshot({ path: `${reportDir}/04-arrival-1920.png` });

  await expect(page.getByTestId('delight-experience')).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(2_300);
  await page.screenshot({ path: `${reportDir}/05-experience-1920.png` });

  await expect(page.getByTestId('delight-xray')).toBeVisible({ timeout: 27_000 });
  await page.waitForTimeout(3_000);
  await expect(page.getByTestId('delight-xray').locator(':scope > div')).toHaveCount(5);
  await page.screenshot({ path: `${reportDir}/06-xray-1920.png` });

  await expect(page.getByTestId('delight-experience')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId('delight-current-stop')).toContainText('الاستقبال والعرضة السعودية');
  await page.screenshot({ path: `${reportDir}/07-return-1920.png` });
  await expect(page.getByTestId('delight-tease')).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: `${reportDir}/08-tease-1920.png` });

  expect(consoleErrors).toEqual([]);
});

test('the delight composition remains intentional at 2560x1080', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.goto('/');
  await page.waitForTimeout(3_200);
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: `${reportDir}/01-majesty-2560.png` });
  await expect(page.getByRole('button', { name: 'ابدأ الرحلة', exact: true })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: `${reportDir}/02-discovery-2560.png` });
  const mapBox = await page.getByTestId('delight-map-world').locator('.kaga-delight-map-world__map').boundingBox();
  expect(mapBox?.width ?? 0).toBeGreaterThan(1_700);
});
