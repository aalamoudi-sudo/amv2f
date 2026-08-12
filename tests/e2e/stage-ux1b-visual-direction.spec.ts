import { expect, test } from '@playwright/test';

const reviewPath = '/?workspace=visual-direction&concept=hybrid-light';

test('Stage UX.1B loads only through the explicit deep link and keeps the production launcher unchanged', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.getByTestId('visual-direction-workspace')).toHaveCount(0);
  await expect(page).not.toHaveURL(/visual-direction/);

  await page.goto('/?project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&workspace=executive');
  await expect(page.getByTestId('executive-overview')).toBeVisible();
  await expect(page.getByTestId('visual-direction-workspace')).toHaveCount(0);

  await page.goto('/?workspace=visual-direction');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.getByTestId('visual-direction-workspace')).toHaveCount(0);

  await page.goto(reviewPath);
  const workspace = page.getByTestId('visual-direction-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('data-concept', 'hybrid-light');
  await expect(workspace).toHaveAttribute('data-theme-resolution', 'event-theme');
  await expect(page).toHaveURL(/workspace=visual-direction/);
  await expect(page).toHaveURL(/concept=hybrid-light/);
});

test('Stage UX.1B preserves Arabic RTL, readable text, keyboard focus, and LTR technical identifiers', async ({ page }) => {
  await page.goto(reviewPath);
  const workspace = page.getByTestId('visual-direction-workspace');
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await workspace.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);

  await page.keyboard.press('Tab');
  await expect(page.locator('.vd-skip-link')).toBeFocused();
  const focusOutline = await page.locator('.vd-skip-link').evaluate((element) => ({
    style: getComputedStyle(element).outlineStyle,
    width: Number.parseFloat(getComputedStyle(element).outlineWidth)
  }));
  expect(focusOutline.style).not.toBe('none');
  expect(focusOutline.width).toBeGreaterThanOrEqual(3);

  await page.getByTestId('executive-primary-action').click();
  await expect(page.getByTestId('visual-review-drawer')).toBeVisible();
  await expect(page.getByTestId('visual-review-drawer-close')).toBeFocused();
  await page.getByTestId('technical-id-disclosure').locator('summary').click();
  const technicalIds = page.getByTestId('technical-id-disclosure').locator('.vd-technical');
  await expect(technicalIds).toHaveCount(5);
  for (const technicalId of await technicalIds.all()) {
    await expect(technicalId).toHaveAttribute('dir', 'ltr');
    expect(await technicalId.evaluate((element) => getComputedStyle(element).direction)).toBe('ltr');
    expect(await technicalId.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBe(12);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('visual-review-drawer')).toHaveCount(0);
  await expect(page.getByTestId('executive-primary-action')).toBeFocused();
});

test('Executive Command Overview states only the current KAP candidate truth', async ({ page }) => {
  await page.goto(reviewPath);
  const screen = page.getByTestId('visual-screen-executive');
  await expect(screen).toContainText('حفل افتتاح وتدشين حدائق الملك عبدالله');
  await expect(screen).toContainText('حزمة مرشحة');
  await expect(screen).toContainText('السنة مستنتجة');
  await expect(screen).toContainText('محتوى DWG معتمد للعمل المنصي؛ التحويل والربط الهندسي غير معتمدين');
  await expect(screen).toContainText('المناطق الخمس مثبتة منطقيًا فقط');
  await expect(screen.locator('.vd-executive-journey li')).toHaveCount(5);
  await expect(screen.locator('.vd-priority-row')).toHaveCount(3);
  await expect(screen.getByTestId('executive-primary-action')).toBeVisible();

  const text = await screen.innerText();
  for (const fabricated of ['جاهزية 100%', 'الحشود منخفضة', 'الحشود متوسطة', 'الحشود مرتفعة', 'السعة 5000', 'تشغيل مباشر', 'حالة حية']) {
    expect(text).not.toContain(fabricated);
  }
});

test('Spatial Command makes the canvas dominant while refusing fabricated geometry in every view', async ({ page }) => {
  await page.goto(`${reviewPath}&screen=spatial&view=2d`);
  const workspace = page.locator('.vd-spatial-workspace');
  const canvas = page.getByTestId('spatial-review-canvas');
  const workspaceBox = await workspace.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(workspaceBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width / workspaceBox!.width).toBeGreaterThanOrEqual(0.6);

  await expect(canvas).toHaveAttribute('data-spatial-mode', '2d');
  await expect(canvas).toContainText('لا توجد خريطة 2D معتمدة');
  await expect(canvas).toContainText('لا temporary-demo geometry مستخدمة');
  await expect(canvas.locator('.vd-logical-relationship li')).toHaveCount(5);

  await page.getByTestId('spatial-mode-3d').click();
  await expect(canvas).toHaveAttribute('data-spatial-mode', '3d');
  await expect(canvas).toContainText('لا يوجد مشهد 3D معتمد');
  await expect(page).toHaveURL(/view=3d/);

  await page.getByTestId('spatial-mode-hybrid').click();
  await expect(canvas).toHaveAttribute('data-spatial-mode', 'hybrid');
  await expect(canvas).toContainText('العرض الهجين ينتظر المصدرين');
  await expect(page).toHaveURL(/view=hybrid/);
  await expect(page.locator('.vd-zone-inspector')).toContainText('من دون إحداثيات أو مضلع أو سعة أو حالة تشغيلية');
});

test('KAP journey behaves as a narrative with safe playback and projection review controls', async ({ page }) => {
  await page.goto(`${reviewPath}&screen=experience&stage=1`);
  const screen = page.getByTestId('visual-screen-experience');
  await expect(screen).toContainText('رحلة مرشحة');
  await expect(screen).toContainText('غير معتمد مكانيًا');
  await expect(screen.locator('.vd-journey-progress button')).toHaveCount(5);
  await expect(page.getByTestId('journey-stage-1')).toHaveAttribute('aria-current', 'step');

  await page.getByTestId('journey-stage-3').click();
  await expect(screen.locator('.vd-story-copy h2')).toContainText('المسرح ومنطقة العرض');
  await expect(page).toHaveURL(/stage=3/);
  await page.getByTestId('journey-reset').click();
  await expect(page.getByTestId('journey-stage-1')).toHaveAttribute('aria-current', 'step');

  await page.getByTestId('projection-preview-open').click();
  await expect(page.getByTestId('projection-preview')).toBeVisible();
  await expect(page.getByTestId('projection-preview')).toContainText('ليست معايرة');
  await expect(page.getByTestId('projection-preview-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('projection-preview')).toHaveCount(0);
  await expect(page.getByTestId('projection-preview-open')).toBeFocused();
});

test('semantic truth stays labeled and the non-KAP theme remains isolated', async ({ page }) => {
  await page.goto(reviewPath);
  await page.getByTestId('visual-review-drawer-open').click();
  await page.getByTestId('drawer-section-semantics').click();
  const semanticReview = page.getByTestId('semantic-token-review');
  await expect(semanticReview.locator('[data-semantic]')).toHaveCount(10);
  await expect(semanticReview).toContainText('أخضر KAP هوية فعالية');
  for (const semantic of await semanticReview.locator('[data-semantic]').all()) {
    await expect(semantic.locator('svg')).toHaveCount(1);
    await expect(semantic.locator('strong')).not.toBeEmpty();
  }

  await page.getByTestId('drawer-section-isolation').click();
  const isolation = page.getByTestId('theme-isolation-review');
  await expect(isolation.locator('[data-theme-id="THEME-KAP-HYBRID-LIGHT-CANDIDATE"]')).toBeVisible();
  await expect(isolation.locator('[data-theme-id="THEME-CONFERENCE-REFERENCE-TEMPORARY"]')).toBeVisible();
  await expect(isolation).toContainText('لا تنتقل ألوان KAP أو أصوله');
});
