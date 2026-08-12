import { expect, test, type Page } from '@playwright/test';

async function openLegendary(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
  await page.getByRole('button', { name: 'قصة التدشين' }).click();
  await expect(page.getByTestId('legendary-l2-home')).toBeVisible();
  await page.getByRole('button', { name: 'استكشف الحدث' }).click();
  await expect(page.getByTestId('legendary-l2-system')).toBeVisible();
}

test('normal-motion lenses preserve the same day, journey and stop', async ({ page }) => {
  await openLegendary(page);
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'رحلة سمو أمير المنطقة وسمو نائبه وسمو الأمين' }).first().click();
  const system = page.getByTestId('legendary-l2-system');
  await expect(system).toHaveAttribute('data-lens', 'guest');
  await page.getByRole('button', { name: /المكان/ }).click();
  await expect(system).toHaveAttribute('data-lens', 'place');
  await page.getByRole('button', { name: /القصة/ }).click();
  await expect(system).toHaveAttribute('data-lens', 'story');
});

test('living map changes overlays across four days on the same surface', async ({ page }) => {
  await openLegendary(page);
  const map = page.getByTestId('legendary-living-map');
  for (const [index, id] of ['day-01', 'day-02', 'day-03', 'day-04'].entries()) {
    await page.getByRole('button', { name: `اليوم ${index + 1}` }).first().click();
    if (id === 'day-02') await expect(page.getByText('لا يحدد المصدر رحلة ميدانية لهذا اليوم')).toBeVisible();
    else await expect(map).toHaveAttribute('data-day', id);
  }
});

test('non-Prince Director interrupts and resumes without restart', async ({ page }) => {
  await openLegendary(page);
  await page.getByRole('button', { name: /الضيف/ }).click();
  await page.getByRole('button', { name: 'رحلة سمو الأمين ومعالي وزير الإعلام' }).first().click();
  await page.getByRole('button', { name: 'شاهد قصة الرحلة' }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
  await page.getByRole('button', { name: 'استكشف' }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'explore');
  await page.locator('.kaga-l2-resume').click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
});

test('global Director is live UI and can be interrupted and resumed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ابدأ الرحلة' }).click();
  await page.getByRole('button', { name: 'قصة التدشين' }).click();
  await page.getByRole('button', { name: 'شاهد قصة التدشين' }).click();
  await expect(page.getByTestId('legendary-global-director')).toBeVisible();
  await page.getByRole('button', { name: 'استكشف' }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'explore');
  await page.getByRole('button', { name: /متابعة قصة التدشين/ }).click();
  await expect(page.getByTestId('legendary-l2-system')).toHaveAttribute('data-mode', 'directed');
});

test('Evidence stays hidden until explicitly enabled', async ({ page }) => {
  await openLegendary(page);
  await expect(page.getByTestId('legendary-project-evidence')).toHaveCount(0);
  await page.getByRole('button', { name: 'الدليل' }).click();
  await expect(page.getByTestId('legendary-project-evidence')).toBeVisible();
});
