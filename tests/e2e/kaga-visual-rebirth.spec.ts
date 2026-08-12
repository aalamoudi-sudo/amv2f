import { expect, test, type Page } from '@playwright/test';

const reportDir = 'reports/kaga-visual-rebirth';

async function enterExecutive(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
}

async function openGuestWorld(page: Page) {
  await enterExecutive(page);
  await page.getByRole('button', { name: 'الخريطة', exact: true }).click();
  await page.getByRole('button', { name: /رحلة الضيوف عرض المسار/ }).click();
  await expect(page.getByTestId('mythic-guest-journey')).toBeVisible();
}

test('the four Visual Rebirth proofs remain live, source-true product states', async ({ page }, testInfo) => {
  test.setTimeout(135_000);
  const isReviewViewport = testInfo.project.name.includes('1920');
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.goto('/');
  await page.waitForTimeout(2_200);
  const opening = page.locator('[data-visual-rebirth="opening"]');
  await expect(opening).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'التنقل التنفيذي' })).toHaveCount(0);
  const openingBox = await opening.boundingBox();
  expect(openingBox?.width ?? 0).toBeGreaterThan(testInfo.project.name.includes('2560') ? 2_500 : 1_880);
  expect(openingBox?.height ?? 0).toBeGreaterThan(1_040);
  if (isReviewViewport) await page.screenshot({ path: `${reportDir}/02-opening-rebirth.png`, animations: 'allow' });

  await openGuestWorld(page);
  const guestWorld = page.locator('[data-visual-rebirth="guest-journey"]');
  const guestMap = guestWorld.locator('.kaga-rebirth-guest-world__map');
  const guestBox = await guestMap.boundingBox();
  expect(guestBox?.width ?? 0).toBeGreaterThan(testInfo.project.name.includes('2560') ? 2_500 : 1_880);
  await expect(page.getByTestId('mythic-guest-journey')).toHaveAttribute('data-active-stop', 'A');
  await expect(page.locator('.kaga-mythic-rail')).toHaveAttribute('data-continuous-sequence', 'A-L');
  await expect(page.locator('.kaga-mythic-rail > button')).toHaveCount(12);
  if (isReviewViewport) await page.screenshot({ path: `${reportDir}/04-guest-rebirth.png`, animations: 'allow' });

  await page.goto('/');
  await page.waitForTimeout(1_600);
  await page.getByRole('button', { name: 'شاهد التجربة في 90 ثانية', exact: true }).click();
  const start = page.getByRole('button', { name: 'ابدأ الرحلة', exact: true });
  await expect(start).toBeVisible({ timeout: 22_000 });
  await start.click();
  await expect(page.getByTestId('delight-experience')).toBeVisible({ timeout: 31_000 });
  await page.waitForTimeout(2_200);
  await expect(page.getByTestId('delight-experience').locator('img')).toHaveAttribute('src', /saudi-ardah-clean-p027\.jpg$/);
  if (isReviewViewport) await page.screenshot({ path: `${reportDir}/06-experience-rebirth.png`, animations: 'allow' });

  await page.getByRole('button', { name: 'كشف التجربة', exact: true }).click();
  const xray = page.getByTestId('delight-xray');
  await expect(xray).toBeVisible();
  await page.waitForTimeout(2_500);
  await expect(xray.locator(':scope > div')).toHaveCount(5);
  await expect(xray.locator(':scope > div[data-active="true"]')).toHaveCount(1);
  if (isReviewViewport) await page.screenshot({ path: `${reportDir}/08-xray-rebirth.png`, animations: 'allow' });

  await enterExecutive(page);
  await page.getByRole('button', { name: 'التصاميم', exact: true }).click();
  const museum = page.getByTestId('visual-museum');
  await expect(museum).toHaveAttribute('data-visual-rebirth', 'museum');
  await expect(museum.locator('.kaga-museum-strip')).toHaveAttribute('aria-hidden', 'true');
  await expect(museum.locator('.kaga-museum-strip')).toBeHidden();
  if (isReviewViewport) await page.screenshot({ path: `${reportDir}/10-museum-rebirth.png`, animations: 'allow' });

  expect(consoleErrors).toEqual([]);
});
