import { expect, test, openTechnicalWorkspace } from './test-fixtures';

const localDemoVisualSystemPath = '/?project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&workspace=visual-system';

test('Stage UX.1A exposes the lazy visual system only through technical administration', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('command-visual-system-workspace')).toHaveCount(0);

  await openTechnicalWorkspace(page, 'visual-system-open');
  await expect(page).toHaveURL(/workspace=visual-system/);
  await expect(page.getByTestId('command-visual-system-workspace')).toBeVisible();
  await expect(page.getByTestId('command-visual-system-workspace')).toContainText('نظام مَيادين المرئي للقيادة');
  await expect(page.getByText('لا لون بلا نص أو رمز')).toBeVisible();
  const visualSystem = page.getByTestId('command-visual-system-workspace');
  await expect(visualSystem.locator('.truth-reported').first()).toContainText('مُبلّغ');
  await expect(visualSystem.locator('.status-critical').first()).toContainText('حرج');
});

test('Stage UX.1A preserves keyboard navigation, reduced motion, and command context', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(localDemoVisualSystemPath);
  await expect(page.getByTestId('command-visual-system-workspace')).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  const transitionDuration = await page.getByRole('button', { name: 'الإجراء الأساسي' }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.01);

  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
