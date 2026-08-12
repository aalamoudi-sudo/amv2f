import { expect, test, type Page } from '@playwright/test';
import { ensureSpatialMarkerInteractive } from './spatial-marker-helpers';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const candidateLayerId = 'SOURCE-LAYER-KAP-CANDIDATE-ZONING';
const scope = `project=${projectId}&event=${eventId}&venue=${venueId}`;
const mapUrl = `/?workspace=spatial-command&${scope}&sourceLayer=${candidateLayerId}&mode=experience&viewMode=top`;
const editingUrl = `${mapUrl}&candidateEntity=ENTITY-KAP-OP-006&edit=candidate-anchors`;

async function expectKapMap(page: Page) {
  const workspace = page.getByTestId('spatial-command-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-truth-pack', /^SPATIAL-TRUTH-PACK-v1-b63207f0/);
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.getByTestId('founder-truth-frozen-indicator')).toContainText('قرار المؤسس مجمّد');
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

async function openSearch(page: Page, query: string) {
  const toggle = page.getByTestId('spatial-search-toggle');
  if (await page.getByTestId('spatial-search-panel').count() === 0) await toggle.click();
  const input = page.getByRole('textbox', { name: 'بحث في الخريطة' });
  await input.fill(query);
  return input;
}

async function waitForSpatialLayout(page: Page) {
  await page.getByTestId('spatial-command-workspace').evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map(async (animation) => {
      try {
        await animation.finished;
      } catch {
        // A superseded CSS transition is safe; the following frames observe its replacement.
      }
    }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

test('presents a dominant controllable map with layers, decluttering, filters, and project-local views', async ({ page }) => {
  await page.goto(mapUrl);
  await expectKapMap(page);
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);
  await expect(page.locator('[data-testid^="marker-cluster-"]')).not.toHaveCount(0);

  await page.getByTestId('collapse-context-panel').click();
  const canvas = page.getByTestId('spatial-command-canvas');
  const workspace = page.getByTestId('spatial-command-workspace');
  const canvasBox = await canvas.boundingBox();
  const workspaceBox = await workspace.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  expect(canvasBox!.width / workspaceBox!.width).toBeGreaterThan(.7);

  await page.getByTestId('collapse-source-layers').click();
  const markerLayer = page.getByTestId('display-layer-candidate-entity-markers');
  await markerLayer.click();
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(0);
  await markerLayer.click();
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);

  const zoningOpacity = page.getByTestId('display-layer-opacity-candidate-zoning');
  await zoningOpacity.fill('0.35');
  expect(await page.getByTestId('candidate-command-map').evaluate((element) => (
    getComputedStyle(element).getPropertyValue('--candidate-base-opacity').trim()
  ))).toBe('0.35');

  await page.getByTestId('spatial-filter-toggle').click();
  await page.getByTestId('spatial-filter-independent-landmarks').click();
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(3);
  await expect(page.getByTestId('spatial-command-marker-4')).toHaveClass(/is-independent/);
  await page.getByTestId('spatial-filter-independent-landmarks').click();
  await page.getByTestId('spatial-filter-toggle').click();

  const cluster = page.locator('[data-testid^="marker-cluster-"]').first();
  await cluster.click();
  await expect(page.locator('[data-testid^="spatial-command-marker-"][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByLabel('مستوى التكبير')).toHaveText('100%');
  const firstExpandedMarker = page.locator('[data-testid^="spatial-command-marker-"][data-pointer-interactive="true"]').first();
  await firstExpandedMarker.press('Enter');
  await expect(page.locator('[data-testid^="spatial-command-marker-"][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.getByLabel('مستوى التكبير')).toHaveText(/122%/);

  await page.getByTestId('save-spatial-view').click();
  await expect(page.getByTestId('restore-spatial-view')).toBeEnabled();
  await page.getByRole('button', { name: 'إعادة ضبط الخريطة' }).click();
  await expect(page.getByLabel('مستوى التكبير')).toHaveText('100%');
  await page.getByTestId('restore-spatial-view').click();
  await expect(page.getByLabel('مستوى التكبير')).toHaveText(/122%/);

  await page.getByRole('button', { name: 'ملاءمة جميع العناصر' }).click();
  await page.waitForTimeout(500);
  const fittedStageBox = await page.locator('.sc-map-stage').boundingBox();
  const fittedCanvasBox = await canvas.boundingBox();
  expect(fittedStageBox).not.toBeNull();
  expect(fittedCanvasBox).not.toBeNull();
  expect(fittedStageBox!.x).toBeGreaterThanOrEqual(fittedCanvasBox!.x - 1);
  expect(fittedStageBox!.y).toBeGreaterThanOrEqual(fittedCanvasBox!.y - 1);
  expect(fittedStageBox!.x + fittedStageBox!.width).toBeLessThanOrEqual(fittedCanvasBox!.x + fittedCanvasBox!.width + 1);
  expect(fittedStageBox!.y + fittedStageBox!.height).toBeLessThanOrEqual(fittedCanvasBox!.y + fittedCanvasBox!.height + 1);
});

test('searches Arabic, aliases, IDs, landmarks, blockers, and keeps the show unanchored', async ({ page }) => {
  await page.goto(mapUrl);
  await openSearch(page, 'Tunnel');
  const aliasResult = page.getByTestId('spatial-search-result-ENTITY-KAP-OP-006');
  await expect(aliasResult).toContainText('ممر العصور');
  await expect(aliasResult).toContainText('له مرساة مرشحة');
  await aliasResult.click();
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('ممر العصور');
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveClass(/is-conflicted/);
  await expect(page.getByTestId('spatial-command-marker-1')).toHaveClass(/is-dimmed/);

  await openSearch(page, 'النصب التذكاري');
  await page.getByTestId('spatial-search-result-ENTITY-KAP-OP-005').click();
  await expect(page.getByTestId('spatial-command-marker-5')).toHaveClass(/is-independent/);
  await expect(page.getByTestId('spatial-command-marker-5')).toHaveAccessibleName(/مستقل/);
  await expect(page.getByTestId('spatial-entity-inspector')).toContainText('معلم مستقل');
  await expect(page.getByTestId('spatial-entity-inspector')).not.toContainText('تعارض ظاهر');
  await expect(page.getByTestId('spatial-entity-inspector').locator('header i')).toHaveText('معلم مستقل');

  await openSearch(page, 'ENTITY-KAP-OP-006');
  await expect(page.getByTestId('spatial-search-result-ENTITY-KAP-OP-006')).toContainText('ممر العصور');
  await page.getByRole('button', { name: 'مسح البحث' }).click();
  await page.getByRole('textbox', { name: 'بحث في الخريطة' }).fill('المسرح');
  await page.getByTestId('spatial-search-result-ZONE-SHOW-001').click();
  await expect(page.getByTestId('spatial-search-result-inspector')).toContainText('لا يوجد موضع على الخريطة');
  await expect(page.getByTestId('spatial-search-result-inspector')).toContainText('غير محسومة');
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);
  await expect(page.locator('[data-candidate-id="ZONE-SHOW-001"]')).toHaveCount(0);

  await page.getByTestId('spatial-command-mode-executive').click();
  await expect(page.getByTestId('spatial-search-result-inspector')).toHaveCount(0);
  await expect(page.getByTestId('executive-blocker-5')).toBeVisible();

  await openSearch(page, 'خريطة الزائر');
  const blockerResult = page.getByTestId('spatial-search-result-VISITOR-MAP-EDITABLE-SOURCE-MISSING');
  await blockerResult.click();
  await expect(page.getByTestId('spatial-command-mode-executive')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('executive-blocker-detail')).toContainText('خريطة الزائر');
});

test('supports map navigation, focus, full screen, keyboard ownership, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(mapUrl);
  const zoom = page.getByLabel('مستوى التكبير');

  await page.getByRole('button', { name: 'تكبير الخريطة' }).click();
  await expect(zoom).toHaveText('120%');
  await page.keyboard.press('-');
  await expect(zoom).toHaveText('100%');
  await page.keyboard.press('0');
  await expect(zoom).toHaveText('100%');

  await ensureSpatialMarkerInteractive(page, 6);
  await page.getByTestId('spatial-command-marker-6').click();
  await page.keyboard.press('f');
  await expect(zoom).toHaveText(/122%/);
  await page.getByRole('button', { name: 'ملاءمة جميع العناصر' }).click();
  await expect(zoom).toHaveText('100%');

  const stage = page.locator('.sc-map-stage');
  const beforePan = await stage.getAttribute('style');
  await page.getByTestId('spatial-command-canvas').focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => stage.getAttribute('style')).not.toBe(beforePan);

  const input = await openSearch(page, '');
  const zoomBeforeTyping = await zoom.textContent();
  await input.press('+');
  await expect(zoom).toHaveText(zoomBeforeTyping ?? '');
  await page.keyboard.press('Escape');

  await page.getByTestId('spatial-focus-mode').click();
  await expect(page.getByTestId('spatial-command-workspace')).toHaveClass(/is-focus-mode/);
  await expect(page.locator('.sc-header')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByTestId('spatial-focus-mode').click();
  await expect(page.locator('.sc-header')).toBeVisible();

  await page.getByTestId('spatial-fullscreen').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expect(page.getByTestId('spatial-command-workspace')).toHaveClass(/is-fullscreen/);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expect(page.locator('.sc-marker').first()).toHaveCSS('transition-duration', '0s');
});

test('keeps all three modes synchronized while preserving the unresolved journey step', async ({ page }) => {
  await page.goto(`${mapUrl}&candidateEntity=ENTITY-KAP-OP-001`);
  await page.getByTestId('spatial-command-mode-executive').click();
  await expect(page.getByTestId('executive-command-context')).toBeVisible();
  await expect(page.getByTestId('spatial-entity-inspector')).toHaveCount(0);

  await page.getByTestId('executive-blocker-2').click();
  await expect(page.getByTestId('executive-decision-state')).toContainText('قرار مؤسس مجمّد');
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveClass(/is-emphasized/);
  await page.getByTestId('display-layer-executive-blockers').click();
  await expect(page.getByTestId('spatial-command-marker-6')).not.toHaveClass(/is-emphasized/);
  await page.getByTestId('display-layer-executive-blockers').click();
  await expect(page.getByTestId('spatial-command-marker-6')).toHaveClass(/is-emphasized/);

  await page.getByTestId('spatial-command-mode-journey').click();
  await expect(page.getByText('تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا').first()).toBeVisible();
  await page.getByTestId('journey-play').click();
  await expect(page.getByTestId('journey-pause')).toBeVisible();
  await page.getByTestId('spatial-command-marker-6').click();
  await expect(page.getByTestId('journey-play')).toBeVisible();

  await page.getByTestId('journey-step-show').click();
  await expect(page.getByTestId('journey-unresolved-step')).toContainText('موقع غير محسوم');
  await expect(page.getByTestId('canvas-unresolved-show')).toContainText('لا توجد نقطة خفية أو بديلة');
  await expect(page.locator('[data-candidate-id="ZONE-SHOW-001"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="spatial-command-marker-"]')).toHaveCount(11);

  await page.getByTestId('journey-next').click();
  await expect(page.getByTestId('journey-step-media')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('journey-previous').click();
  await expect(page.getByTestId('journey-step-show')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('journey-reset').click();
  await expect(page.getByTestId('journey-step-arrival')).toHaveAttribute('aria-current', 'step');
});

test('edits only existing visual candidate anchors with undo, redo, draft, and explicit candidate freeze', async ({ page }) => {
  await page.goto(editingUrl);
  await expectKapMap(page);
  const workspace = page.getByTestId('spatial-command-workspace');
  await expect(workspace).toHaveAttribute('data-editing-mode', 'candidate-anchors');
  await expect(page.getByTestId('candidate-edit-warning')).toContainText('ليس إحداثيات مساحية');
  await page.getByTestId('spatial-focus-mode').click();
  await expect(page.getByTestId('candidate-edit-persistent-warning')).toContainText('ليس إحداثيات مساحية');
  await page.getByTestId('spatial-focus-mode').click();
  await page.getByTestId('spatial-fullscreen').click();
  await expect(page.getByTestId('candidate-edit-persistent-warning')).toBeVisible();
  await page.getByTestId('spatial-fullscreen').click();
  await page.getByTestId('spatial-focus-mode').click();
  await expect(page.getByTestId('candidate-anchor-comparison')).toContainText('x 0.3270');
  await waitForSpatialLayout(page);

  const marker = page.getByTestId('spatial-command-marker-6');
  const box = await marker.locator(':scope > span').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 34, box!.y + box!.height / 2 + 18, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByTestId('candidate-anchor-comparison')).not.toContainText('بعدx 0.3270 · y 0.3630');
  await expect(page.getByTestId('candidate-anchor-undo')).toBeEnabled();
  await page.getByTestId('candidate-anchor-undo').click();
  await expect(page.getByTestId('candidate-anchor-redo')).toBeEnabled();
  await expect(page.getByTestId('candidate-anchor-comparison')).toContainText('بعدx 0.3270 · y 0.3630');
  await page.getByTestId('candidate-anchor-redo').click();
  await expect(page.getByTestId('candidate-anchor-comparison')).not.toContainText('بعدx 0.3270 · y 0.3630');

  await page.getByTestId('candidate-anchor-change-reason').fill('تصحيح بصري مرشح وفق العلامة المصدرية المراجعة.');
  await page.getByTestId('candidate-anchor-save-draft').click();
  await expect(page.getByTestId('candidate-anchor-draft-ready')).toContainText('المسودة جاهزة للمراجعة');
  await expect(page.getByTestId('candidate-anchor-authoring-message')).toContainText('لم تُجمّد');
  await page.getByTestId('candidate-anchor-freeze-confirmation').check();
  await page.getByTestId('candidate-anchor-undo').click();
  await page.getByTestId('candidate-anchor-redo').click();
  await page.getByTestId('candidate-anchor-save-draft').click();
  await expect(page.getByTestId('candidate-anchor-freeze-confirmation')).not.toBeChecked();
  await page.getByTestId('candidate-anchor-freeze-confirmation').check();
  await page.getByTestId('candidate-anchor-freeze').click();
  await expect(page.getByTestId('candidate-anchor-authoring-message')).toContainText('جُمّدت المراجعة المرشحة R2');
  await expect(page.getByTestId('founder-truth-frozen-indicator')).toContainText('T1 / A2');

  await page.reload();
  await expect(page.getByTestId('candidate-anchor-authoring')).toBeVisible();
  await expect(page.getByTestId('candidate-anchor-authoring')).toContainText('R2');
  await expect(page.getByTestId('candidate-edit-warning')).toBeVisible();
  await expect(page.locator('[data-candidate-id="ZONE-SHOW-001"]')).toHaveCount(0);
});

test('requires explicit confirmation before discarding a dirty candidate edit', async ({ page }) => {
  await page.goto(editingUrl);
  const marker = page.getByTestId('spatial-command-marker-6');
  const box = await marker.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 28, box!.y + box!.height / 2 + 14, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('candidate-anchor-undo')).toBeEnabled();

  page.once('dialog', (dialog) => void dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('spatial-command-workspace')).toHaveAttribute('data-editing-mode', 'candidate-anchors');

  page.once('dialog', (dialog) => void dialog.accept());
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('spatial-command-workspace')).toHaveAttribute('data-editing-mode', 'none');
  await expect(page).not.toHaveURL(/edit=candidate-anchors/);
});

test('restores valid deep links and history while rejecting foreign state without demo fallback', async ({ page }) => {
  await page.goto(`${mapUrl}&focus=map`);
  await expect(page.getByTestId('spatial-command-workspace')).toHaveClass(/is-focus-mode/);
  await page.reload();
  await expect(page.getByTestId('spatial-command-workspace')).toHaveClass(/is-focus-mode/);

  await page.getByTestId('spatial-focus-mode').click();
  await page.getByTestId('candidate-anchor-edit-toggle').click();
  await expect(page).toHaveURL(/edit=candidate-anchors/);
  await page.goBack();
  await expect(page.getByTestId('spatial-command-workspace')).toHaveAttribute('data-editing-mode', 'none');
  await page.goForward();
  await expect(page.getByTestId('spatial-command-workspace')).toHaveAttribute('data-editing-mode', 'candidate-anchors');

  await page.goto(`/?workspace=spatial-command&project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&venue=VENUE-EXHIBITION-DEMO-001&sourceLayer=${candidateLayerId}&mode=experience&edit=candidate-anchors&focus=map`);
  await expect(page.getByTestId('spatial-command-configuration-missing')).toContainText('لا توجد تجربة قيادة مكانية لهذا السياق');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXHIBITION-001');
  await expect(page.locator('body')).not.toContainText('KAGA ZONING PLAN UPDATE 27-7.pdf');
  await expect(page.locator('body')).not.toContainText('تحرير المراسي المرشحة');
});
