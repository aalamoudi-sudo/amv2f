import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_PRESENTATION_FIDELITY_GATE2 === '1';
const outputDirectory = resolve(process.cwd(), 'reports/presentation-fidelity-gate2');

test.skip(!enabled, 'Set KAGA_PRESENTATION_FIDELITY_GATE2=1 for PF-2 visual review.');

function viewportLabel(testInfo: TestInfo) {
  return testInfo.project.name.includes('2560') ? '2560' : '1920';
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  await page.screenshot({
    path: resolve(outputDirectory, `${name}-${viewportLabel(testInfo)}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

async function openDays(page: Page) {
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await expect(page.getByTestId('project-scale')).toBeVisible();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين', exact: true }).click();
  await expect(page.getByTestId('presentation-fidelity-four-days')).toBeVisible();
}

test('PF-2 full executive presentation propagation', async ({ page }, testInfo) => {
  test.slow();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('presentation-fidelity-intro')).toBeVisible();
  await capture(page, testInfo, '01-intro');

  await openDays(page);
  await capture(page, testInfo, '02-four-days');

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التجارب' }).click();
  await expect(page.getByTestId('experiences-hub')).toHaveAttribute('data-presentation-archetype', 'editorial-render');
  const experienceFigure = page.locator('.kaga-experience-focus');
  const experienceImage = experienceFigure.locator('img');
  expect((await experienceImage.boundingBox())?.height ?? 0).toBeGreaterThan((await experienceFigure.boundingBox())?.height ?? 0);

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
  const map = page.getByTestId('kaga-v2-masterplan-experience');
  await expect(map).toHaveAttribute('data-presentation-archetype', 'route-map');
  await capture(page, testInfo, '03-masterplan');

  await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
  await expect(map).toHaveAttribute('data-presentation-surface', 'garden-explorer');
  await expect(page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button')).toHaveCount(6);
  await capture(page, testInfo, '04-garden-explorer');

  await page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button', { name: /الحديقة الديفونية/ }).click();
  await expect(page.getByTestId('garden-detail')).toHaveAttribute('data-presentation-archetype', 'quiet-identity');
  await capture(page, testInfo, '05-garden-detail');

  await page.getByRole('button', { name: 'العودة إلى دليل الحدائق' }).click();
  await page.getByRole('tab', { name: 'رحلة التدشين' }).click();
  await page.getByRole('button', { name: 'H، الحديقة الديفونية' }).click();
  await expect(page.getByTestId('stop-inspector')).toHaveAttribute('data-presentation-archetype', 'route-map');
  await capture(page, testInfo, '06-journey-stop-inspector');

  await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
  await page.getByRole('button', { name: 'قصة مبنى الهلالين' }).click();
  await expect(page.getByTestId('crescent-story')).toHaveAttribute('data-presentation-archetype', 'editorial-render');
  await capture(page, testInfo, '07-crescent-story');

  await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين' }).click();
  await expect(page.locator('.kaga-royal')).toHaveAttribute('data-presentation-archetype', 'editorial-render');
  await capture(page, testInfo, '08-royal-moment');
  await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
  await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' })).toBeVisible();
  await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' }).click();
  await expect(page.locator('.kaga-launch')).toHaveAttribute('data-presentation-archetype', 'editorial-render');
  await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
  await expect(page.getByText('التسلسل قيد العرض')).toBeVisible();
  await capture(page, testInfo, '09-launch-show');

  await page.getByRole('button', { name: 'وضع التقديم' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('mobile-exhibition')).toHaveAttribute('data-presentation-archetype', 'quiet-identity');
  await page.getByRole('button', { name: /النقطة 1:/ }).click();
  await page.getByRole('button', { name: 'تفعيل كبسولة البذرة' }).click();
  await expect(page.getByText(/مشهد بصري يأخذ/)).toBeVisible();
  await capture(page, testInfo, '10-mobile-exhibition');

  await page.getByRole('button', { name: 'منصة الدعوات' }).click();
  await expect(page.getByTestId('invitation-experience')).toHaveAttribute('data-presentation-archetype', 'quiet-identity');
  await capture(page, testInfo, '11-invitations');

  await page.getByRole('button', { name: 'الهوية البصرية', exact: true }).click();
  await expect(page.getByTestId('identity-applications')).toHaveAttribute('data-presentation-archetype', 'quiet-identity');
  const identityFigure = page.locator('.kaga-identity-stage figure').first();
  const identityImage = identityFigure.locator('img');
  expect((await identityImage.boundingBox())?.height ?? 0).toBeGreaterThan((await identityFigure.boundingBox())?.height ?? 0);
  await capture(page, testInfo, '12-visual-identity');

  await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم' }).click();
  await expect(page.getByTestId('visual-museum')).toHaveAttribute('data-presentation-archetype', 'editorial-render');
  await capture(page, testInfo, '13-visual-museum');

  await page.getByRole('button', { name: 'وضع التقديم' }).click();
  await expect(page.getByTestId('kaga-v2-app')).toHaveAttribute('data-presentation-archetype', 'minimal-shell');
  await expect(page.getByRole('navigation', { name: 'التنقل التنفيذي' })).toHaveCount(0);
  await capture(page, testInfo, '14-presenter-mode');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('PF-2 normal-motion Royal, Launch, and Mobile smoke', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('2560'), 'One normal-motion presentation validation is sufficient.');
  test.slow();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await openDays(page);
  await page.getByRole('tab', { name: /اليوم الثاني/ }).click();
  await page.getByRole('button', { name: 'لحظة التدشين' }).click();
  await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين' }).click();
  await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
  await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' })).toBeVisible({ timeout: 11_000 });
  await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' }).click();
  await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
  await expect(page.getByText('3 من 3 طبقات مفعّلة')).toBeVisible({ timeout: 11_000 });
  await page.getByRole('button', { name: 'وضع التقديم' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /النقطة 1:/ }).click();
  await page.getByRole('button', { name: 'تفعيل كبسولة البذرة' }).click();
  await expect(page.getByText(/مشهد بصري يأخذ/)).toBeVisible({ timeout: 4_000 });
});
