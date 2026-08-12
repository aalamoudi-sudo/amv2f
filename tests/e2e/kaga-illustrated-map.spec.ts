import { expect, test, type Page } from '@playwright/test';

async function openPlaceLens(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة', exact: true }).click();
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).click();
  await page.getByRole('button', { name: 'استكشف الحدث', exact: true }).click();
  await expect(page.getByTestId('legendary-place-lens')).toBeVisible();
}

test('three readings preserve canonical route and stop context', async ({ page }) => {
  await openPlaceLens(page);
  const map = page.getByTestId('legendary-living-map');
  const routeBefore = await map.locator('.route-line').first().getAttribute('d');
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await expect(map).toHaveAttribute('data-reading', 'illustrated');
  await expect(page.getByTestId('illustrated-map-layers')).toBeVisible();
  expect(await map.locator('.route-line').first().getAttribute('d')).toBe(routeBefore);
  await page.getByRole('button', { name: 'قصة التدشين', exact: true }).last().click();
  await expect(map).toHaveAttribute('data-reading', 'story');
  expect(await map.locator('.route-line').first().getAttribute('d')).toBe(routeBefore);
  await page.getByRole('button', { name: 'المخطط', exact: true }).click();
  await expect(map).toHaveAttribute('data-reading', 'masterplan');
});

test('illustrated hotspots expose only canonical Arabic entities and queries', async ({ page }) => {
  await openPlaceLens(page);
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  const hotspots = page.locator('.kaga-illustrated-hotspot');
  await expect(hotspots).toHaveCount(3);
  await page.getByRole('button', { name: 'حديقة الخيارات', exact: true }).click();
  await expect(page.getByTestId('legendary-place-lens').locator('aside h2')).toHaveText('حديقة الخيارات');
  await page.getByRole('button', { name: 'من يمر من هنا؟', exact: true }).click();
  await expect(page.getByText('رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين').last()).toBeVisible();
});

test('Evidence distinguishes cartographic illustration from spatial truth', async ({ page }) => {
  await openPlaceLens(page);
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await page.getByRole('button', { name: 'الدليل', exact: true }).click();
  await expect(page.getByTestId('legendary-project-evidence')).toContainText('الحقيقة المكانية المعتمدة');
  await expect(page.getByTestId('illustrated-evidence')).toContainText('مصدر بصري خرائطي');
});

test('normal motion Director continues after changing the map reading', async ({ page }) => {
  await openPlaceLens(page);
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'الخريطة التصويرية', exact: true }).click();
  await page.getByRole('button', { name: 'شاهد قصة الرحلة', exact: true }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await expect(page.getByTestId('legendary-living-map')).toHaveAttribute('data-reading', 'illustrated');
  await page.getByRole('button', { name: 'استكشف', exact: true }).click();
  await page.locator('.kaga-l2-resume').click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await expect(page.getByTestId('legendary-living-map')).toHaveAttribute('data-reading', 'illustrated');
});
