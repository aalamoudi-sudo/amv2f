import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const screenshotsDirectory = resolve(process.cwd(), 'reports/screenshots');

async function openIntro(page: Page, reducedMotion: 'reduce' | 'no-preference' = 'reduce') {
  await page.emulateMedia({ reducedMotion });
  await page.goto('/kaga');
  await expect(page.getByRole('button', { name: 'دخول تجربة التدشين' })).toBeVisible();
}

async function enterExperience(page: Page) {
  await openIntro(page);
  await page.getByRole('button', { name: 'دخول تجربة التدشين' }).click();
  await expect(page.getByRole('heading', { name: 'أربعة أيام، تجربة واحدة مترابطة' })).toBeVisible();
}

async function openSection(page: Page, name: string, heading: string) {
  await page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
}

async function shot(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(screenshotsDirectory, { recursive: true });
  const suffix = testInfo.project.name === 'chromium-2560x1080' ? '-2560x1080' : '';
  await page.screenshot({ path: resolve(screenshotsDirectory, `${name}${suffix}.png`), animations: 'disabled' });
}

function collectRuntimeErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

function journeyButton(selector: Locator, title: string) {
  return selector.locator('button').filter({ hasText: new RegExp(`^\\s*${title}\\s*ص\\s*\\d+\\s*$`) });
}

test.describe('KAGA executive inauguration experience', () => {
  test('boots Arabic RTL, enters the experience and exposes the source PDF without console errors', async ({ page }) => {
    const { consoleErrors, pageErrors } = collectRuntimeErrors(page);

    await openIntro(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { name: 'تدشين حدائق الملك عبدالله' })).toBeVisible();
    await page.getByRole('button', { name: 'دخول تجربة التدشين' }).click();
    await expect(page.getByRole('heading', { name: 'أربعة أيام، تجربة واحدة مترابطة' })).toBeVisible();

    const source = page.getByRole('link', { name: 'فتح وثيقة المشروع الأصلية PDF' });
    await expect(source).toBeVisible();
    await expect(source).toHaveAttribute('href', /Rev06-King-Abdullah-Gardens-Inauguration\.pdf$/);
    const sourceResponse = await page.request.get(await source.getAttribute('href') ?? '');
    expect(sourceResponse.ok()).toBeTruthy();
    expect(sourceResponse.headers()['content-type']).toContain('application/pdf');

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('selects all four event days and preserves source metadata', async ({ page }) => {
    await enterExperience(page);
    const tabs = page.getByRole('tablist', { name: 'أيام التدشين' }).getByRole('tab');
    await expect(tabs).toHaveCount(4);
    const expectedHeadings = [
      'ما قبل التدشين الملكي',
      'التدشين الملكي وعرض التدشين',
      'زيارة سمو أمير منطقة الرياض',
      'المؤتمر الصحفي',
    ];
    for (let index = 0; index < 4; index += 1) {
      await tabs.nth(index).click();
      await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('heading', { name: expectedHeadings[index], exact: true })).toBeVisible();
      await expect(page.getByText(/المصدر: الصفحات/).last()).toBeVisible();
    }
    await tabs.nth(3).click();
    await page.getByRole('button', { name: 'فتح المسار 1' }).click();
    await expect(page.locator('.kaga-map-caption__title')).toHaveText('رحلة سمو الأمين ومعالي وزير الإعلام');
  });

  test('runs deterministic playback and controls across all six journeys', async ({ page }) => {
    await enterExperience(page);
    await openSection(page, 'الخريطة', 'ادخل إلى مسار الافتتاح');

    const journeyNames = [
      'رحلة العاملين في الحدائق',
      'رحلة سمو الأمين',
      'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين',
      'رحلة الضيوف',
      'رحلة سمو الأمين ومعالي وزير الإعلام',
      'مسار الإعلاميين',
    ];
    const selector = page.getByRole('navigation', { name: 'اختيار الرحلة' });
    for (const name of journeyNames) {
      const button = journeyButton(selector, name);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.kaga-route')).not.toHaveCount(0);
      await expect(page.locator('.kaga-map-caption__title')).toHaveText(name);
    }

    await journeyButton(selector, 'رحلة العاملين في الحدائق').click();
    const progress = page.getByLabel('تقدم عرض الرحلة');
    await expect(progress).toHaveValue('0');
    const optionalRoute = page.getByRole('button', { name: 'عرض المسار الاختياري', exact: true });
    await optionalRoute.click();
    await expect(page.getByRole('button', { name: 'العودة إلى المسار الأساسي', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'المحطة التالية' }).click();
    await expect(page.getByRole('heading', { name: 'الرحلة الخارجية لحديقة الطبيعة', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'العودة إلى المسار الأساسي', exact: true }).click();
    await expect(progress).toHaveValue('0');
    await page.getByRole('button', { name: 'تشغيل الرحلة', exact: true }).click();
    await expect(page.getByRole('button', { name: 'إيقاف الرحلة مؤقتاً' })).toBeVisible();
    await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'إيقاف الرحلة مؤقتاً' }).click();
    const pausedAt = Number(await progress.inputValue());
    await page.waitForTimeout(250);
    expect(Number(await progress.inputValue())).toBe(pausedAt);
    await page.getByRole('button', { name: 'تشغيل الرحلة', exact: true }).click();
    await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(pausedAt);

    const stopBeforeNext = await page.locator('.kaga-stop-inspector__code').textContent();
    await page.getByRole('button', { name: 'المحطة التالية' }).click();
    await expect(page.locator('.kaga-stop-inspector__code')).not.toHaveText(stopBeforeNext ?? '');
    await page.getByRole('button', { name: 'المحطة السابقة' }).click();
    await expect(page.locator('.kaga-stop-inspector__code')).toHaveText(stopBeforeNext ?? '');
    await page.getByRole('button', { name: /فتح محطة مجسم الحدائق/ }).click();
    await expect(page.getByRole('heading', { name: 'مجسم الحدائق', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'فتح التجربة المرتبطة' })).toBeVisible();
    const alignedStop = page.locator('.kaga-map-stop.is-selected');
    const alignedMarker = page.locator('.kaga-playback-marker');
    expect(Number(await alignedMarker.getAttribute('data-marker-x'))).toBeCloseTo(Number(await alignedStop.getAttribute('data-stop-x')), 2);
    expect(Number(await alignedMarker.getAttribute('data-marker-y'))).toBeCloseTo(Number(await alignedStop.getAttribute('data-stop-y')), 2);
    await page.getByRole('button', { name: 'إعادة ضبط الخريطة' }).click();
    await page.getByRole('button', { name: 'إعادة تشغيل الرحلة' }).click();
    await expect(page.getByRole('button', { name: 'إيقاف الرحلة مؤقتاً' })).toBeVisible();
    await page.getByRole('button', { name: 'إيقاف الرحلة مؤقتاً' }).click();
    await page.getByRole('button', { name: 'تركيز الخريطة على المسار' }).click();
    await page.getByRole('button', { name: '1.5×' }).click();
    await expect(page.getByRole('button', { name: '1.5×' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('runs royal, launch, mobile, invitation, museum and presenter interactions', async ({ page }) => {
    const { consoleErrors, pageErrors } = collectRuntimeErrors(page);
    await enterExperience(page);

    await openSection(page, 'اللحظة الملكية', 'لحظة تنطلق منها الحديقة');
    await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
    await expect(page.getByRole('status')).not.toHaveText('جاهز للعرض');
    await expect(page.getByText(/لا يمثل محاكاة فيزيائية/)).toBeVisible();

    await openSection(page, 'العرض', 'عرض التدشين');
    await expect(page.getByLabel('طبقات العرض').getByRole('checkbox')).toHaveCount(3);
    await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
    await expect(page.getByText('التسلسل قيد العرض')).toBeVisible();

    await openSection(page, 'المعرض المتنقل', 'المعرض المتنقل');
    await expect(page.getByRole('button', { name: /النقطة \d:/ })).toHaveCount(7);
    await page.getByRole('button', { name: /النقطة 1:/ }).click();
    await expect(page.getByText(/فعّل كبسولة البذرة/)).toBeVisible();
    await expect(page.getByText(/مشهد بصري يأخذ/)).toHaveCount(0);
    await page.getByRole('button', { name: 'تفعيل كبسولة البذرة' }).click();
    await expect(page.getByText(/تنتقل الكبسولة/)).toBeVisible();
    await expect(page.getByText(/مشهد بصري يأخذ/)).toBeVisible();

    await openSection(page, 'الدعوات', 'منصة إدارة الدعوات');
    for (let index = 0; index < 5; index += 1) await page.getByRole('button', { name: /متابعة/ }).click();
    await expect(page.locator('.kaga-invite-card h2')).toHaveText('دليل الضيف');
    await expect(page.getByText(/لا يتصل ببيانات ضيوف حقيقية/)).toBeVisible();

    await openSection(page, 'التصاميم', 'معرض التصاميم');
    await expect(page.getByRole('navigation', { name: 'بيئات معرض التصاميم' }).getByRole('button')).toHaveCount(8);
    await page.getByRole('button', { name: 'الصورة التالية' }).click();
    await page.getByRole('button', { name: 'عرض بملء الشاشة' }).click();
    await expect(page.getByRole('button', { name: 'إنهاء ملء الشاشة' })).toBeVisible();
    await page.getByRole('button', { name: 'إنهاء ملء الشاشة' }).click();

    await page.getByRole('button', { name: 'وضع التقديم' }).click();
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toHaveAttribute('data-presenter', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'وضع التقديم' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toHaveAttribute('data-presenter', 'false');
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('smoke-validates full royal and launch timing with normal motion', async ({ page }) => {
    await openIntro(page, 'no-preference');
    await page.getByRole('button', { name: 'دخول تجربة التدشين' }).click();
    await openSection(page, 'اللحظة الملكية', 'لحظة تنطلق منها الحديقة');
    await page.getByRole('button', { name: 'تشغيل لحظة التدشين' }).click();
    await expect(page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' })).toBeVisible({ timeout: 10_500 });
    await page.getByRole('button', { name: 'الانتقال إلى عرض التدشين' }).click();
    await expect(page.getByRole('heading', { name: 'عرض التدشين', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'تشغيل عرض التدشين' }).click();
    await expect(page.getByText('التسلسل قيد العرض')).toBeVisible();
    await expect(page.getByText('3 من 3 طبقات مفعّلة')).toBeVisible({ timeout: 11_000 });
  });

  test('keeps the command-center experience usable at all target desktop resolutions', async ({ page }) => {
    const targets = [
      { width: 2560, height: 1440 },
      { width: 2560, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
    ];
    for (const viewport of targets) {
      await page.setViewportSize(viewport);
      await enterExperience(page);
      await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeVisible();
      await openSection(page, 'الخريطة', 'ادخل إلى مسار الافتتاح');
      await expect(page.getByLabel('الخريطة التفاعلية لمسارات الافتتاح')).toBeVisible();
      const stage = await page.locator('.kaga-spatial-engine__stage').boundingBox();
      expect(stage?.width ?? 0).toBeGreaterThan(800);
      expect(stage?.height ?? 0).toBeGreaterThan(300);
    }
  });

  test('captures only the source-correction frames for final approval', async ({ page }, testInfo) => {
    await enterExperience(page);
    await openSection(page, 'الخريطة', 'ادخل إلى مسار الافتتاح');
    const selector = page.getByRole('navigation', { name: 'اختيار الرحلة' });
    const princeTitle = 'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين';

    await journeyButton(selector, princeTitle).click();
    await shot(page, testInfo, '08-prince-journey');
    await page.getByRole('button', { name: 'فتح محطة الاستقبال والعرضة السعودية', exact: true }).click();
    await expect(page.locator('.kaga-stop-inspector')).toContainText('40 دقيقة');
    await expect(page.getByText(/سيتم نقل مؤقت لمجسم الحدائق/)).toBeVisible();
    await shot(page, testInfo, '08b-prince-source-detail');
    await page.getByRole('button', { name: 'فتح محطة بداية الجولة - حديقة الخيارات', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'بداية الجولة - حديقة الخيارات', exact: true })).toBeVisible();
    await shot(page, testInfo, '08c-options-garden-stop-inspector');

    await journeyButton(selector, 'رحلة الضيوف').click();
    await shot(page, testInfo, '09-guests-journey');
    await journeyButton(selector, 'رحلة سمو الأمين ومعالي وزير الإعلام').click();
    await expect(page.getByRole('button', { name: 'فتح محطة ممر العصور', exact: true })).toBeVisible();
    await shot(page, testInfo, '10b-mayor-media-journey');
  });
});
