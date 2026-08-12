import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const enabled = process.env.KAGA_V2_GATE45 === '1';
const outputDirectory = resolve(process.cwd(), 'reports/v2-gate45');

test.skip(!enabled, 'Set KAGA_V2_GATE45=1 for the isolated KAGA V2 Gate 4/5 build.');

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(outputDirectory, { recursive: true });
  const suffix = testInfo.project.name.includes('2560') ? '-2560x1080' : '';
  await page.screenshot({
    path: resolve(outputDirectory, `${name}${suffix}.png`),
    animations: 'disabled',
    fullPage: false,
  });
}

async function openIntro(page: Page, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'تجربة تدشين حدائق الملك عبدالله' })).toBeVisible();
}

async function enterDays(page: Page) {
  await openIntro(page);
  await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
  await expect(page.getByTestId('project-scale')).toBeVisible();
  await page.getByRole('button', { name: 'اكتشف أيام التدشين' }).click();
  await expect(page.getByRole('heading', { name: 'أربعة أيام، تجربة واحدة مترابطة' })).toBeVisible();
}

test.describe('KAGA V2 Gate 4/5 executive integration', () => {
  test('preserves executive language, scale, days, dual map modes, and journey-place context', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await openIntro(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const areaMetric = page.locator('.kaga-metric-value[aria-label="+2M م²"]');
    await expect(areaMetric).toBeVisible();
    await expect(areaMetric).toHaveAttribute('dir', 'ltr');
    await expect(areaMetric.locator('.kaga-metric-value__number')).toHaveText('+2M');
    await expect(areaMetric.locator('.kaga-metric-value__unit')).toHaveText('م2');
    await expect(page.locator('.kaga-metric-value[aria-label="+1M"]')).toBeVisible();
    await capture(page, testInfo, '01-intro');

    await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
    await expect(page.getByTestId('project-scale')).toBeVisible();
    await capture(page, testInfo, '02-project-scale');
    await page.getByRole('button', { name: 'اكتشف أيام التدشين' }).click();
    await expect(page.getByRole('tablist', { name: 'أيام التدشين' }).getByRole('tab')).toHaveCount(4);
    await capture(page, testInfo, '03-four-days');

    await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
    await expect(page.getByTestId('registered-masterplan')).toBeVisible();
    const routeNavigation = page.getByRole('navigation', { name: 'رحلات التدشين الست' });
    await expect(routeNavigation.getByRole('button')).toHaveCount(6);
    const journeyTitles = [
      'رحلة العاملين في الحدائق',
      'رحلة سمو الأمين',
      'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين',
      'رحلة الضيوف',
      'رحلة سمو الأمين ومعالي وزير الإعلام',
      'مسار الإعلاميين',
    ];
    for (const title of journeyTitles) {
      await routeNavigation.getByRole('button', { name: `${title} عرض المسار`, exact: true }).click();
    }
    await routeNavigation.getByRole('button', { name: 'رحلة العاملين في الحدائق عرض المسار', exact: true }).click();
    await capture(page, testInfo, '04-event-masterplan');

    await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
    await expect(page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button')).toHaveCount(6);
    await expect(page.getByText('حدائق أخرى في الدليل المعرفي')).toBeVisible();
    await expect(page.locator('.kaga-v2-registered-map__crescent-audit')).toHaveCount(0);
    await capture(page, testInfo, '05-garden-explorer');
    await page.getByRole('navigation', { name: 'الحدائق على المخطط' }).getByRole('button', { name: /الحديقة الديفونية/ }).click();
    await expect(page.getByTestId('garden-detail')).toContainText('موضّحة على المخطط التفاعلي');
    await capture(page, testInfo, '06-garden-detail');

    await page.getByRole('button', { name: 'العودة إلى دليل الحدائق' }).click();
    await page.getByRole('tab', { name: 'رحلة التدشين' }).click();
    const devonianStop = page.getByRole('button', { name: 'H، الحديقة الديفونية' });
    await devonianStop.click();
    await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
    await expect.poll(async () => Number(await page.getByLabel('تقدم الرحلة').inputValue())).toBeGreaterThan(0.01);
    await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();
    await capture(page, testInfo, '07-journey-playback');
    await devonianStop.click();
    const markerBefore = await page.getByTestId('registered-marker').getAttribute('transform');
    await page.getByRole('button', { name: 'اكتشف الموقع' }).click();
    await expect(page.getByTestId('garden-detail')).toContainText('الحديقة الديفونية');
    await capture(page, testInfo, '08-journey-to-knowledge');
    await page.getByRole('button', { name: 'العودة إلى الرحلة' }).click();
    await expect(page.getByTestId('stop-inspector')).toContainText('الحديقة الديفونية');
    await expect(page.getByTestId('registered-marker')).toHaveAttribute('transform', markerBefore ?? '');
    await capture(page, testInfo, '09-knowledge-return-to-journey');

    const visibleText = await page.locator('body').innerText();
    for (const forbidden of ['Gate 2/3', 'KAGA-SPATIAL-REGISTERED-V1', 'KAGA-SOURCE-2D-V1', 'Rhino', 'high confidence', 'registration confidence']) {
      expect(visibleText).not.toContain(forbidden);
    }
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('integrates Crescent, ceremony, experiences, knowledge extension, museum, and Presenter Mode', async ({ page }, testInfo) => {
    await enterDays(page);
    await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
    await page.getByRole('tab', { name: 'استكشف الحدائق' }).click();
    await page.getByRole('button', { name: 'قصة مبنى الهلالين' }).click();
    await expect(page.getByTestId('crescent-story')).toContainText('أكثر من 400 مليون سنة');
    await capture(page, testInfo, '10-crescent-story');
    await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين' }).click();
    await expect(page.getByRole('heading', { name: 'لحظة تنطلق منها الحديقة' })).toBeVisible();
    await capture(page, testInfo, '11-royal-moment');
    await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();

    await page.getByRole('button', { name: 'وضع التقديم' }).click();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('heading', { name: 'عرض التدشين', exact: true })).toBeVisible();
    await capture(page, testInfo, '12-launch-show');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('heading', { name: 'المعرض المتنقل', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /النقطة 1:/ }).click();
    await page.getByRole('button', { name: 'تفعيل كبسولة البذرة' }).click();
    await expect(page.getByText(/مشهد بصري يأخذ/)).toBeVisible();
    await page.getByRole('button', { name: /اعرف أكثر:/ }).click();
    await expect(page.getByTestId('mobile-knowledge-extension')).toBeVisible();
    await capture(page, testInfo, '13-mobile-exhibition');

    await page.getByRole('button', { name: 'إغلاق المعرفة' }).click();
    await page.getByRole('button', { name: 'منصة الدعوات' }).click();
    await expect(page.getByRole('heading', { name: 'منصة إدارة الدعوات' })).toBeVisible();
    await capture(page, testInfo, '14-invitations');

    await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'التصاميم' }).click();
    await expect(page.getByRole('heading', { name: 'معرض التصاميم' })).toBeVisible();
    await capture(page, testInfo, '15-visual-museum');
    await page.getByRole('button', { name: 'وضع التقديم' }).click();
    await expect(page.getByTestId('kaga-v2-app')).toHaveAttribute('data-presenter', 'true');
    await capture(page, testInfo, '16-presenter-mode');
  });

  test('normal-motion smoke completes Royal Moment and Launch Show', async ({ page }) => {
    await openIntro(page, 'no-preference');
    await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
    await page.getByRole('button', { name: 'اكتشف أيام التدشين' }).click();
    await page.getByRole('tab', { name: /اليوم الثاني/ }).click();
    await page.getByRole('button', { name: 'لحظة التدشين' }).click();
    await page.getByRole('button', { name: 'انتقل إلى لحظة التدشين' }).click();
    await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
    await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' })).toBeVisible({ timeout: 11_000 });
    await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' }).click();
    await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
    await expect(page.getByText('التسلسل قيد العرض')).toBeVisible();
    await expect(page.getByText('3 من 3 طبقات مفعّلة')).toBeVisible({ timeout: 11_000 });
  });

  test('remains presentation-ready at 1440×900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterDays(page);
    await expect(page.getByTestId('executive-header')).toBeVisible();
    await page.getByRole('navigation', { name: 'التنقل التنفيذي' }).getByRole('button', { name: 'الخريطة' }).click();
    const map = await page.getByTestId('registered-masterplan').boundingBox();
    expect(map?.width ?? 0).toBeGreaterThan(700);
    expect(map?.height ?? 0).toBeGreaterThan(450);
  });
});
