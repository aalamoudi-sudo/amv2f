import { expect, test, type Page } from '@playwright/test';
import { ensureSpatialMarkerInteractive } from './spatial-marker-helpers';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const scope = `project=${projectId}&event=${eventId}&venue=${venueId}`;
const commandUrl = `/?workspace=spatial-command&${scope}&mode=experience`;

async function expectCommandIdentity(page: Page) {
  await expect(page.getByTestId('spatial-command-workspace')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.getByTestId('spatial-command-workspace')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

test('opens the KAP map-dominant command experience from the upgraded portfolio', async ({ page }) => {
  await page.goto('/?workspace=portfolio');
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card).toBeVisible();
  await expect(card).toContainText('مركز القيادة المكاني متاح للمراجعة');
  await expect(card).toContainText('خريطة التجربة');
  await expect(card).toContainText('خريطة القيادة');
  await expect(card).toContainText('قصة رحلة الزائر');
  await expect(card).not.toContainText('founder-approved-working-source');

  await page.getByTestId('spatial-command-open').click();
  await expectCommandIdentity(page);
  await expect(page).toHaveURL(/workspace=spatial-command/);
  await expect(page).toHaveURL(/mode=experience/);
  await expect(page.getByTestId('active-spatial-source')).toContainText('التقسيم التشغيلي المرشح');

  const canvasBox = await page.getByTestId('spatial-command-canvas').boundingBox();
  const contextBox = await page.locator('.sc-context-panel').boundingBox();
  const workspaceBox = await page.getByTestId('spatial-command-workspace').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(contextBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(contextBox!.width * 1.25);
  expect(canvasBox!.height).toBeGreaterThan(workspaceBox!.height * 0.55);

  const markers = page.locator('[data-testid^="spatial-command-marker-"]');
  await expect(markers).toHaveCount(11);
  await ensureSpatialMarkerInteractive(page, 1);
  for (let sourceNumber = 1; sourceNumber <= 11; sourceNumber += 1) {
    await expect(page.getByTestId(`spatial-command-marker-${sourceNumber}`)).toHaveAccessibleName(new RegExp(`^${sourceNumber}\\.`));
  }

  await page.getByTestId('spatial-command-marker-1').focus();
  await page.getByTestId('spatial-command-marker-1').press('ArrowDown');
  await expect(page.getByTestId('spatial-command-marker-2')).toBeFocused();
  await expect(page.getByTestId('spatial-command-marker-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('الاستقبال');
  await expect(page).toHaveURL(/candidateEntity=ENTITY-KAP-OP-002/);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test('switches command modes and runs the interruptible five-step narrative without creating a route', async ({ page }) => {
  await page.goto(commandUrl);
  await expectCommandIdentity(page);

  await page.getByTestId('spatial-command-mode-executive').click();
  await expect(page.getByTestId('executive-command-context')).toBeVisible();
  await expect(page.getByTestId('executive-candidate-summary')).toContainText('وجهة مرشحة');
  await expect(page.getByTestId('spatial-entity-inspector')).toHaveCount(0);
  await expect(page).toHaveURL(/mode=executive/);
  await expect(page).not.toHaveURL(/candidateEntity=/);
  await expect(page).not.toHaveURL(/journeyStep=/);

  for (const blockerNumber of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await page.getByTestId(`executive-blocker-${blockerNumber}`).click();
    await expect(page.getByTestId('executive-blocker-detail')).toBeVisible();
  }
  await expect(page.getByTestId('executive-blocker-detail')).toContainText('خريطة الزائر');

  await page.getByTestId('spatial-command-mode-journey').click();
  await expect(page.getByTestId('visitor-journey-controller')).toBeVisible();
  await expect(page.getByTestId('journey-play')).toBeVisible();
  await expect(page.getByTestId('journey-pause')).toHaveCount(0);
  await expect(page).toHaveURL(/mode=journey/);
  await expect(page).toHaveURL(/journeyStep=arrival/);
  await expect(page.getByText('تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا').first()).toBeVisible();

  await page.clock.install();
  await page.getByTestId('journey-play').click();
  await expect(page.getByTestId('journey-pause')).toBeVisible();
  await page.clock.fastForward(12_100);
  await expect(page.getByTestId('journey-step-ages')).toHaveAttribute('aria-current', 'step');
  await expect(page).toHaveURL(/journeyStep=ages/);
  await page.getByTestId('journey-pause').click();
  await expect(page.getByTestId('journey-play')).toBeVisible();

  await page.getByTestId('journey-next').click();
  await expect(page.getByTestId('journey-step-show')).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('journey-unresolved-step')).toContainText('موقع غير محسوم');
  await expect(page.getByTestId('canvas-unresolved-show')).toContainText('لا توجد نقطة خفية أو بديلة');
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);

  await page.getByTestId('journey-next').click();
  await expect(page.getByTestId('journey-step-media')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('journey-next').click();
  await expect(page.getByTestId('journey-step-dinner')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('journey-previous').click();
  await expect(page.getByTestId('journey-step-media')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('journey-reset').click();
  await expect(page.getByTestId('journey-step-arrival')).toHaveAttribute('aria-current', 'step');
  await expect(page).toHaveURL(/journeyStep=arrival/);
});

test('owns selection by source layer and exposes technical codes only in the focus-trapped drawer', async ({ page }) => {
  await page.goto(commandUrl);
  await ensureSpatialMarkerInteractive(page, 6);
  await page.getByTestId('spatial-command-marker-6').click();
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('ممر العصور');

  await page.getByTestId('spatial-source-layer-kap-concept-masterplan').click();
  await expect(page.getByTestId('concept-source-context')).toContainText('A–T');
  await expect(page.getByTestId('spatial-entity-inspector')).toHaveCount(0);
  await expect(page.getByTestId('spatial-candidate-status-footer')).toHaveCount(0);
  await expect(page.getByTestId('spatial-source-status-footer')).toBeVisible();
  await expect(page).not.toHaveURL(/candidateEntity=/);

  await page.getByTestId('spatial-source-layer-kap-field-evidence').click();
  await expect(page.getByTestId('evidence-source-context')).toContainText('195');
  await expect(page.getByTestId('field-evidence-privacy')).toContainText('لا يغيّر الجاهزية');
  await expect(page.getByTestId('spatial-entity-inspector')).toHaveCount(0);

  await page.getByTestId('spatial-source-layer-kap-visitor-map').click();
  await expect(page.getByTestId('visitor-map-source-context')).toContainText('لم تُسلّم');
  await expect(page.getByTestId('missing-visitor-map-command-layer')).toContainText('لن تصنع المنصة خريطة بديلة');

  await page.goBack();
  await expect(page.getByTestId('evidence-source-context')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('visitor-map-source-context')).toBeVisible();

  await page.getByTestId('spatial-source-layer-kap-candidate-zoning').click();
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/candidateEntity=ENTITY-KAP-OP-006/);

  const drawerTrigger = page.getByTestId('source-truth-drawer-open');
  await drawerTrigger.focus();
  await drawerTrigger.click();
  await expect(page.getByTestId('source-truth-drawer')).toBeVisible();
  await expect(page.getByTestId('source-truth-drawer-close')).toBeFocused();
  await expect(page.getByTestId('source-truth-drawer')).toContainText('DRIVE-PERMISSION-ANONYMOUS-WRITER');
  await expect(page.getByTestId('source-truth-drawer')).toContainText('1f37e95a7d00c38d');
  expect(await page.locator('.sc-header').evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await page.getByTestId('source-truth-drawer-close').click();
  await expect(page.getByTestId('source-truth-drawer')).toHaveCount(0);
  await expect(drawerTrigger).toBeFocused();
});

test('preserves canonical deep links, history, and strict project isolation', async ({ page }) => {
  for (const mode of ['experience', 'executive', 'journey'] as const) {
    const journey = mode === 'journey' ? '&journeyStep=show' : '';
    await page.goto(`/?workspace=spatial-command&${scope}&mode=${mode}${journey}`);
    await expectCommandIdentity(page);
    await page.reload();
    await expect(page.getByTestId(`spatial-command-mode-${mode}`)).toHaveAttribute('aria-pressed', 'true');
    if (mode === 'journey') await expect(page.getByTestId('journey-step-show')).toHaveAttribute('aria-current', 'step');
  }

  await page.goto(commandUrl);
  await page.getByTestId('spatial-command-mode-executive').click();
  await page.getByTestId('spatial-command-mode-journey').click();
  await page.goBack();
  await expect(page.getByTestId('spatial-command-mode-executive')).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(page.getByTestId('spatial-command-mode-experience')).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(page.getByTestId('spatial-command-mode-executive')).toHaveAttribute('aria-pressed', 'true');

  await page.goto(`/?workspace=spatial-command&${scope}&mode=invalid&sourceLayer=invalid&candidateEntity=invalid&journeyStep=invalid&viewMode=invalid`);
  await expect(page.getByTestId('spatial-route-correction')).toContainText('سياق مكاني آمن');
  await expect(page).toHaveURL(/mode=experience/);
  await expect(page).not.toHaveURL(/sourceLayer=invalid|candidateEntity=invalid|journeyStep=invalid|viewMode=invalid/);
  await expectCommandIdentity(page);

  await page.goto('/?workspace=spatial-command&project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&venue=VENUE-EXHIBITION-DEMO-001&mode=experience');
  await expect(page.getByTestId('spatial-command-configuration-missing')).toContainText('لا توجد تجربة قيادة مكانية لهذا السياق');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXHIBITION-001');
  await expect(page.locator('body')).not.toContainText('KAGA ZONING PLAN UPDATE 27-7.pdf');
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت حدائق الملك عبدالله');
});

test('handles missing local previews, reduced motion, RTL, and browser errors safely', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/local-assets/kap/kaga-zoning-candidate.jpg*', (route) => route.fulfill({
    status: 200,
    contentType: 'image/jpeg',
    body: 'invalid-local-preview'
  }));
  await page.goto(commandUrl);
  await expect(page.getByTestId('local-preview-missing')).toContainText('مشتق الخريطة المحلي غير متاح');
  await expect(page.getByTestId('local-preview-missing')).toContainText('لم يُستخدم مصدر بديل');
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(0);
  await expect(page.getByTestId('experience-map-context')).toContainText('11 وجهة');
  expect(await page.locator('.sc-map-stage').evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.getByTestId('spatial-command-workspace').evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
