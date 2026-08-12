import { expect, test } from '@playwright/test';

const enabled = process.env.KAGA_V2_GATE23 === '1';

test.describe('KAGA V2 Gate 2/3 semantic spatial registration', () => {
  test.skip(!enabled, 'Set KAGA_V2_GATE23=1 for the isolated V2 build.');

  test('keeps one source timeline across route playback and knowledge discovery', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('٧ داخلية')).toBeVisible();
    await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();

    await expect(page.getByTestId('registered-masterplan')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'رحلات التدشين الست' }).getByRole('button')).toHaveCount(6);
    for (const title of [
      'رحلة العاملين في الحدائق',
      'رحلة سمو الأمين',
      'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين',
      'رحلة الضيوف',
      'رحلة سمو الأمين ومعالي وزير الإعلام',
      'مسار الإعلاميين',
    ]) {
      await page.getByRole('button', { name: new RegExp(`^${title} ص`) }).click();
    }

    await page.getByRole('button', { name: /^رحلة العاملين في الحدائق/ }).click();
    const slider = page.getByLabel('تقدم الرحلة');
    await page.getByRole('button', { name: 'تشغيل', exact: true }).click();
    await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0.01);
    await page.getByRole('button', { name: 'إيقاف مؤقت', exact: true }).click();

    const devonianStop = page.getByRole('button', { name: 'H، الحديقة الديفونية' });
    await devonianStop.click();
    const stopPosition = await devonianStop.evaluate((element) => {
      const matrix = (element as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix;
      return [matrix.e, matrix.f];
    });
    const markerPosition = await page.getByTestId('registered-marker').evaluate((element) => {
      const matrix = (element as unknown as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix;
      return [matrix.e, matrix.f];
    });
    expect(markerPosition[0]).toBeCloseTo(stopPosition[0]!, 3);
    expect(markerPosition[1]).toBeCloseTo(stopPosition[1]!, 3);
    await expect(page.getByTestId('stop-inspector')).toContainText('الحديقة الديفونية');
    await page.getByRole('button', { name: 'اكتشف الموقع' }).click();
    await expect(page.getByTestId('garden-detail')).toContainText('الحديقة الديفونية');

    await page.getByRole('button', { name: 'العودة إلى الدليل' }).click();
    await expect(page.getByRole('navigation', { name: 'الحدائق المسجلة' }).getByRole('button')).toHaveCount(6);
    await expect(page.getByText('بصمات مرشحة')).toHaveCount(0);
    await page.getByRole('button', { name: 'حالة تسجيل مبنى الهلالين' }).click();
    await expect(page.getByTestId('crescent-registration')).toContainText('غير محسوم');
    await page.getByRole('button', { name: 'قصة مبنى الهلالين' }).click();
    await expect(page.getByTestId('crescent-story')).toContainText('أكثر من 400 مليون سنة');

    expect(consoleErrors).toEqual([]);
  });
});
