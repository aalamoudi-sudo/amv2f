import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openGuestJourney(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'مكانٌ بحجم قصة' })).toBeVisible();
  await page.getByRole('button', { name: 'الخريطة', exact: true }).click();
  await expect(page.getByTestId('registered-masterplan')).toBeVisible();
  await page.getByRole('button', { name: 'رحلة الضيوف عرض المسار', exact: true }).click();
  await expect(page.getByTestId('mythic-guest-journey')).toBeVisible();
}

test.describe('KAGA Mythic Guest Journey', () => {
  test('first-time executive understands, explores, returns, and completes without provenance UI', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await openGuestJourney(page);

    await expect(page.getByRole('heading', { name: 'رحلة الضيوف' })).toBeVisible();
    await expect(page.getByText('من 05:30 م إلى 07:30 م')).toBeVisible();
    const railStops = page.locator('.kaga-mythic-rail > button');
    await expect(railStops).toHaveCount(12);
    await expect(page.getByRole('navigation', { name: 'تسلسل محطات رحلة الضيوف' })).toHaveAttribute('data-continuous-sequence', 'A-L');
    expect(await railStops.evaluateAll((stops) => stops.map((stop) => stop.getAttribute('aria-label')?.slice(0, 1)))).toEqual(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    );
    await expect(page.getByRole('button', { name: 'الخريطة التصويرية' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('المحطة الحالية')).toBeVisible();
    await expect(page.getByText('التالي')).toBeVisible();

    await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
    await expect(page.getByRole('button', { name: 'إيقاف مؤقت' })).toBeVisible();
    await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
    await page.locator('.kaga-mythic-rail > button').nth(3).click();
    await expect(page.getByRole('heading', { name: 'بداية الجولة التعريفية - حديقة الخيارات' })).toBeVisible();
    await expect(page.getByText('E · الحديقة البليوسينية')).toBeVisible();
    await page.getByRole('button', { name: 'اكتشف الموقع' }).click();
    await expect(page.getByRole('heading', { name: 'حديقة الخيارات' })).toBeVisible();
    await page.getByRole('button', { name: 'العودة إلى الرحلة' }).click();
    await expect(page.getByRole('heading', { name: 'بداية الجولة التعريفية - حديقة الخيارات' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'متابعة الرحلة' })).toBeVisible();

    await page.getByLabel('تقدم رحلة الضيوف').fill('1');
    await expect(page.getByTestId('mythic-guest-ending')).toBeVisible();
    await expect(page.getByTestId('provenance-panel')).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });

  test('map readings and page-26 route mode preserve the same canonical anchors', async ({ page }) => {
    await openGuestJourney(page);
    const marker = page.getByTestId('registered-marker');
    const before = await marker.getAttribute('transform');
    await page.getByRole('button', { name: 'المخطط', exact: true }).click();
    expect(await marker.getAttribute('transform')).toBe(before);
    await page.getByTestId('map-reading-switcher').getByRole('button', { name: 'قصة التدشين', exact: true }).click();
    expect(await marker.getAttribute('transform')).toBe(before);
    await expect(page.getByTestId('registered-masterplan')).toHaveAttribute('data-source-fidelity', 'true');
    await expect(page.locator('.kaga-v2-registered-map__source-segments polyline')).toHaveCount(11);
    await expect(page.locator('.kaga-v2-registered-map__source-segments polyline[data-state="current"]')).toHaveCount(1);
    await expect(page.locator('.kaga-v2-registered-map__source-segments polyline[data-state="next"]')).toHaveCount(1);
    await expect(page.locator('.kaga-v2-registered-map__source-segments polyline[data-state="future"]')).toHaveCount(9);
    await expect(page.locator('.kaga-v2-registered-map__source-segments polyline[data-state="current"]')).toHaveCSS('stroke', 'rgb(185, 154, 91)');
    expect(await marker.getAttribute('transform')).toBe(before);
  });

  test('entry begins as a full-bleed cinematic source image before the editorial contour', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const opening = page.getByTestId('source-native-opening');
    await expect(opening).toBeVisible();
    await expect(opening.locator('img')).toHaveCSS('object-fit', 'cover');
    await expect(opening).toContainText('تدشين');
    await page.waitForTimeout(3_000);
    await expect(opening).toHaveCSS('opacity', '0');
    await expect(page.getByTestId('presentation-fidelity-intro')).toBeVisible();
  });

  test('one-tap Guest story enters the existing Legendary orchestration with normal motion', async ({ page }) => {
    await openGuestJourney(page);
    await page.getByRole('button', { name: 'شاهد رحلة الضيوف' }).click();
    await expect(page.getByTestId('legendary-l2-system')).toBeVisible();
    await expect(page.getByTestId('legendary-guest-lens')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'رحلة الضيوف', exact: true })).toBeVisible();
    await expect(page.locator('.kaga-l2').first()).toHaveAttribute('data-mode', 'directed');
  });
});
