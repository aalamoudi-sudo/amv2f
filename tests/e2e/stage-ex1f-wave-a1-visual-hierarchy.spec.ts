import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const experienceUrl = `/?workspace=experience-twin&${scope}`;
const storyUrl = `${experienceUrl}&experienceMode=story&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&mapMode=story&viewMode=map-focus`;

async function openExperienceSpace(page: Page) {
  const trigger = page.getByTestId('experience-space-menu-trigger');
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await expect(page.getByTestId('experience-space-drawer')).toBeVisible();
}

test('uses one compact experience bar and keeps the source-backed hero dominant', async ({ page }) => {
  await page.goto(experienceUrl);
  const workspace = page.getByTestId('experience-twin-workspace');
  const bar = page.getByTestId('experience-compact-bar');
  const hero = page.getByTestId('experience-review-overview');
  const spatial = page.getByTestId('experience-hero-spatial');

  await expect(workspace).toBeVisible();
  await expect(bar).toBeVisible();
  await expect(hero).toBeVisible();
  await expect(page.getByTestId('launcher-open')).toHaveCount(0);
  await expect(hero).toContainText('مشروع تدشين حدائق الملك عبدالله');
  await expect(hero).toContainText('31 أكتوبر – 3 نوفمبر 2026');
  await expect(hero).toContainText('أربعة أيام');
  await expect(hero).toContainText('مرجع 2D محسن · ليس 3D أو 360°');
  await expect(hero).toContainText('لا يمكن تحديدها');
  await expect(page.getByTestId('experience-start-from-gate')).toContainText('ابدأ رحلة التجربة');
  await expect(page.getByTestId('experience-presentation-open')).toBeVisible();

  const [barBox, heroBox, spatialBox] = await Promise.all([bar.boundingBox(), hero.boundingBox(), spatial.boundingBox()]);
  expect(barBox?.height ?? 999).toBeLessThanOrEqual(76);
  expect(heroBox?.height ?? 0).toBeGreaterThanOrEqual(680);
  expect((spatialBox?.width ?? 0) / Math.max(heroBox?.width ?? 1, 1)).toBeGreaterThanOrEqual(0.55);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }]) {
  test(`keeps the story world dominant with compact overlays at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(storyUrl);
    const workspace = page.getByTestId('experience-twin-workspace');
    const map = page.getByTestId('experience-map-surface');
    const rail = page.getByTestId('experience-rehearsal');
    await expect(map).toBeVisible();
    await expect(page.getByTestId('experience-inspector')).toHaveCount(0);

    const [workspaceBox, mapBox, railBox] = await Promise.all([workspace.boundingBox(), map.boundingBox(), rail.boundingBox()]);
    expect((mapBox?.height ?? 0) / Math.max(workspaceBox?.height ?? 1, 1)).toBeGreaterThanOrEqual(0.84);
    expect((mapBox?.width ?? 0) / Math.max(workspaceBox?.width ?? 1, 1)).toBeGreaterThanOrEqual(0.98);
    expect(railBox?.height ?? 999).toBeLessThanOrEqual(62);
    expect((railBox?.y ?? 0) + (railBox?.height ?? 0)).toBeLessThanOrEqual((mapBox?.y ?? 0) + (mapBox?.height ?? 0) + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
}

test('declutters the narrative by default and exposes all relationships only on demand', async ({ page }) => {
  await page.goto(storyUrl);
  const shell = page.getByTestId('story-map-shell');
  await expect(shell.locator('.story-map-route.is-analysis')).toHaveCount(0);
  await expect(shell.locator('.story-map-route.is-current')).toHaveCount(1);
  await expect(shell.locator('.story-map-route.is-completed')).not.toHaveCount(0);
  await expect(shell.locator('.story-map-route.is-upcoming')).not.toHaveCount(0);

  const toggle = page.getByTestId('story-map-all-relationships');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.locator('.story-map-route.is-analysis')).not.toHaveCount(0);
  await toggle.click();
  await expect(shell.locator('.story-map-route.is-analysis')).toHaveCount(0);
  await expect(shell).toContainText('لا تمثل حركة ميدانية أو زمن وصول معتمدًا');
});

test('renders 1 November as separate ceremony contexts without a guessed route', async ({ page }) => {
  await page.goto(`${experienceUrl}&experienceMode=journey&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-MAIN-SHOW&mapMode=story&viewMode=map-focus`);
  await expect(page.getByTestId('story-map-journey-not-applicable-20261101')).toContainText('لا خط انتقال ولا مدة سفر');
  await expect(page.getByTestId('story-map-dual-site-transition')).toHaveCount(0);
  await expect(page.locator('.story-map-route')).toHaveCount(0);
  await expect(page.getByTestId('story-map-narrative-break')).toHaveCount(0);
  await expect(page.getByTestId('story-map-unresolved-list')).toContainText('العرض الرئيسي');
  await expect(page.getByTestId('experience-review-context-strip')).toContainText('العرض الرئيسي المرشح');
  await expect(page).not.toHaveURL(/route=/);
});

test('reveals command intelligence around the same selected visitor moment', async ({ page }) => {
  await page.goto(storyUrl);
  const initial = new URL(page.url());
  await page.getByTestId('experience-behind-the-experience').click();
  const reveal = page.getByTestId('experience-command-reveal');
  await expect(reveal).toBeVisible();
  await expect(reveal.locator('.experience-command-reveal-stack article')).toHaveCount(1);
  await expect(reveal.locator('.experience-command-reveal-queued')).toHaveCount(5);
  await expect(reveal).toContainText('ما يراه الزائر');

  for (let index = 0; index < 5; index += 1) await reveal.getByRole('button', { name: /اكشف الطبقة التالية/ }).click();
  await expect(reveal.locator('.experience-command-reveal-stack article')).toHaveCount(6);
  await expect(reveal).toContainText('ما يجب أن تجهزه العمليات');
  await expect(reveal).toContainText('مالك الاعتماد');
  await expect(reveal).toContainText('الدليل المفقود');
  await expect(reveal).toContainText('القرار المطلوب');
  await expect(reveal).toContainText('الأثر المتوقع');

  const after = new URL(page.url());
  expect(after.searchParams.get('step')).toBe(initial.searchParams.get('step'));
  expect(after.searchParams.get('day')).toBe(initial.searchParams.get('day'));
  expect(after.searchParams.get('persona')).toBe(initial.searchParams.get('persona'));
  await page.keyboard.press('Escape');
  await expect(reveal).toHaveCount(0);
});

test('uses a visual anchor throughout the client presentation and preserves safe keyboard behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(experienceUrl);
  await page.getByTestId('experience-presentation-open').click();
  const presentation = page.getByTestId('experience-client-presentation');
  await expect(presentation).toBeVisible();
  await expect(page.getByTestId('experience-presentation-visual')).toBeVisible();
  await expect(page.getByTestId('experience-presentation-visual')).toContainText('مرجع 2D محسن · ليس 3D أو 360°');
  await expect(presentation.locator('.experience-presentation-steps button')).toHaveCount(14);
  await presentation.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.getByTestId('experience-presentation-visual')).toHaveAttribute('data-visual-kind', 'spatial');
  await presentation.getByRole('button', { name: /الخطوة 3:/ }).click();
  await expect(page.getByTestId('experience-presentation-visual')).toHaveAttribute('data-visual-kind', 'days');
  await presentation.press('Escape');
  await expect(presentation).toHaveCount(0);

  await page.getByTestId('experience-space-menu-trigger').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('experience-space-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('experience-space-drawer')).toHaveCount(0);
});

test('keeps truth and technical details within one click without making them persistent chrome', async ({ page }) => {
  await page.goto(storyUrl);
  await expect(page.getByTestId('experience-truth-drawer')).toHaveCount(0);
  await page.getByTestId('experience-truth-open').click();
  await expect(page.getByTestId('experience-truth-drawer')).toBeVisible();
  await expect(page.getByTestId('experience-truth-drawer')).toContainText('حزمة مرشحة غير مفعلة');
  await expect(page.getByTestId('experience-truth-drawer')).toContainText('candidate');

  await page.getByTestId('experience-truth-drawer').getByRole('button', { name: 'إغلاق' }).click();
  await openExperienceSpace(page);
  await expect(page.getByTestId('experience-source-truth')).toContainText('معاينة تصميم من مصدر مرشح');
});
