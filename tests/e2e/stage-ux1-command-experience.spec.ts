import type { Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

const localDemoContext = 'project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001';
const kapContext = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026';
const exhibitionContext = 'project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001';

async function openOperationalWorkspace(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
}

async function persistedBaselineFingerprint(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const serialized = window.localStorage.getItem('mayadeen-event-intelligence-twin:v1');
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = (parsed as { state?: unknown }).state;
    if (!state || typeof state !== 'object') return null;
    const baselineEntities = (state as { baselineEntities?: unknown }).baselineEntities;
    return baselineEntities && typeof baselineEntities === 'object' ? JSON.stringify(baselineEntities) : null;
  });
}

test('universal navigation preserves project-scoped deep links and browser history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
  await page.getByTestId('executive-open').click();
  await expect(page).toHaveURL(/workspace=executive/);
  await expect(page.getByTestId('executive-overview')).toBeVisible();

  await page.getByTestId('executive-open-operations').click();
  await expect(page).toHaveURL(/workspace=command/);
  await expect(page.getByTestId('operational-command-center')).toBeVisible();

  await page.getByTestId('spatial-open').click();
  await expect(page).toHaveURL(/workspace=spatial/);
  await expect(page.getByTestId('spatial-workspace')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('spatial-workspace')).toBeVisible();

  await page.goto(`/?${localDemoContext}&workspace=spatial`);
  await expect(page.getByTestId('spatial-workspace')).toBeVisible();
  await page.goto(`/?${localDemoContext}&workspace=executive`);
  await expect(page.getByTestId('executive-overview')).toBeVisible();
});

test('global search is keyboard-accessible, scoped, and synchronizes list, 2D, and 3D selection', async ({ page }) => {
  await openOperationalWorkspace(page);
  await page.getByTestId('zone-list-item-ZONE-001').click();
  await expect.poll(async () => page.evaluate(() => Boolean(window.localStorage.getItem('mayadeen-event-intelligence-twin:v1')))).toBe(true);
  const baselineBefore = await persistedBaselineFingerprint(page);
  expect(baselineBefore).not.toBeNull();

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.getByTestId('global-search-dialog')).toBeVisible();
  await page.getByTestId('global-search-input').fill('ZONE-002');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/workspace=spatial/);
  await expect(page.getByTestId('spatial-workspace')).toBeVisible();
  await expect(page.getByTestId('spatial-attention-list')).toContainText('منطقة المعارض');

  await page.getByTestId('spatial-view-2d').click();
  await page.getByTestId('readiness-2d-zone-ZONE-002').click();
  await expect(page.getByTestId('readiness-2d-zone-ZONE-002')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('spatial-view-3d').click();
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-002');
  await page.getByTestId('spatial-view-hybrid').click();
  await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', 'ZONE-002');

  const baselineAfter = await persistedBaselineFingerprint(page);
  expect(baselineAfter).toEqual(baselineBefore);
});

test('operator flow progressively reveals trust, opens the structured decision, and retains context', async ({ page }) => {
  await openOperationalWorkspace(page);
  await page.getByTestId('zone-list-item-ZONE-005').click();
  await expect(page.getByTestId('operator-decision-flow')).toContainText('الحالة أو الملاحظة');
  await page.getByTestId('operator-flow-provenance-toggle').click();
  await expect(page.getByTestId('operator-flow-provenance')).toContainText('المصدر');

  await page.getByTestId('operator-flow-open-decision').click();
  await expect(page).toHaveURL(/workspace=decisions/);
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await expect(page.getByTestId('decision-details')).toBeVisible();
});

test('technical administration is explicit, lazy, and does not flash an operational laboratory', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('command-open').click();
  await page.getByTestId('presentation-preset-technical').click();
  await expect(page.getByTestId('technical-administration-drawer')).toContainText('لا يمثل نظام صلاحيات');
  await expect(page.getByTestId('integration-workspace')).toHaveCount(0);
  await expect(page.getByTestId('iot-workspace')).toHaveCount(0);

  await openTechnicalWorkspace(page, 'configuration-open');
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
});

test('active event search excludes another event package and candidate experience remains isolated', async ({ page }) => {
  await page.goto(`/?${exhibitionContext}&workspace=configuration`);
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();

  await page.getByTestId('global-search-open').click();
  await page.getByTestId('global-search-input').fill('حدائق الملك عبدالله');
  await expect(page.getByTestId('global-search-empty')).toBeVisible();
  await page.getByTestId('global-search-close').click();

  await page.goto(`/?${kapContext}&workspace=experience`);
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page.getByTestId('system-status')).toContainText('حزمة تجربة مرشحة');
  await expect(page.getByTestId('visual-screen-experience')).not.toContainText('EVENT-EXHIBITION-DEMO-001');
});

test('the command experience remains usable at each required command-center viewport', async ({ page }, testInfo) => {
  await openOperationalWorkspace(page);
  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('spatial-workspace')).toBeVisible();
  await expect(page.getByTestId('spatial-view-selector')).toBeVisible();
  await expect(page.getByTestId('operator-decision-flow')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  if (testInfo.project.name === 'chromium-1366x768') {
    await expect(page.getByTestId('spatial-view-hybrid')).toBeVisible();
  }
});

test('the command experience honors reduced-motion preferences without changing the truth context', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByTestId('command-open').click();
  await expect(page.getByTestId('global-search-open')).toBeVisible();
  const transitionDuration = await page.getByTestId('global-search-open').evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.01);
  await page.getByTestId('global-search-open').click();
  await expect(page.getByTestId('global-search-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('global-search-dialog')).toHaveCount(0);
});

test('gateway source remains explicitly unavailable and never falls back to the simulator', {
  annotation: {
    type: 'expected-browser-error',
    description: 'ERR_CONNECTION_REFUSED'
  }
}, async ({ page }) => {
  await page.goto('/?gatewayUrl=http://127.0.0.1:65531');
  await openTechnicalWorkspace(page, 'iot-open');
  await page.getByTestId('iot-source-gateway').click();
  await expect(page.getByTestId('iot-gateway-unavailable')).toContainText('البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة');
  await expect(page.getByTestId('iot-workspace')).toHaveAttribute('data-network', 'http-sse');
  await expect(page.getByTestId('iot-local-only-label')).toHaveCount(0);
});
