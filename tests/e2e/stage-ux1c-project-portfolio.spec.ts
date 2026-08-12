import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const kapProjectId = 'PROJECT-KAP-OPENING-2026';
const kapEventId = 'EVENT-KAP-OPENING-2026';
const referenceProjectId = 'PROJECT-REFERENCE-EXHIBITION-001';
const projectPreferenceKey = 'mayadeen-project-portfolio-preferences:v1';

function projectUrl(workspace: 'executive' | 'spatial' | 'experience'): string {
  return `/?project=${kapProjectId}&event=${kapEventId}&workspace=${workspace}`;
}

async function expectPortfolio(page: Page): Promise<void> {
  const portfolio = page.getByTestId('neutral-launcher');
  await expect(portfolio).toBeVisible();
  await expect(portfolio).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'المشاريع', exact: true })).toBeVisible();
}

async function openKap(page: Page): Promise<void> {
  await page.goto('/?workspace=portfolio');
  const card = page.getByTestId(`project-card-${kapProjectId}`);
  await card.getByRole('button', { name: /فتح المشروع/ }).click();
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
}

test('portfolio is the neutral Arabic entry and keeps candidate, demo, and reference truth distinct', async ({ page }) => {
  await page.goto('/');
  await expectPortfolio(page);

  const kapCard = page.getByTestId(`project-card-${kapProjectId}`);
  await expect(kapCard).toContainText('مرشح');
  await expect(kapCard).toContainText('حقيقي مرشح');
  await expect(kapCard).toContainText('مصادر عمل مرشحة موثقة');
  await expect(kapCard).not.toContainText('founder-approved-working-source');
  await expect(kapCard).not.toContainText('%');

  const demoCard = page.getByTestId(`project-card-${referenceProjectId}`);
  await expect(demoCard).toContainText('ديمو');
  await expect(demoCard).toContainText('حزمة مرجعية خيالية');
  await expect(page.getByTestId('project-card-PROJECT-REFERENCE-CONFERENCE-001')).toContainText('مرجع');
  await expect(page.getByTestId('project-card-PROJECT-REFERENCE-FESTIVAL-001')).toContainText('مؤرشف');

  await page.getByTestId('project-search').fill('حدائق الملك عبدالله');
  await expect(kapCard).toBeVisible();
  await expect(demoCard).toHaveCount(0);
  await page.getByTestId('project-search').fill('لا يوجد مشروع بهذا الاسم');
  await expect(page.getByTestId('project-empty-state')).toBeVisible();
  await expect(page.getByTestId('project-empty-state')).toContainText('لم يُفتح مشروع بديل تلقائيًا');
});

test('KAP deep links restore the candidate project across executive, spatial, and experience workspaces', async ({ page }) => {
  await page.goto(projectUrl('executive'));
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', kapProjectId);
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-event-id', kapEventId);
  await expect(page.getByTestId('project-switcher-trigger')).toContainText('حقيقي مرشح');
  await expect(page.getByTestId('system-status')).toContainText('حزمة تجربة مرشحة');
  await expect(page.locator('header').first()).not.toContainText('النظام المحلي مستقر');

  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await expect(page).toHaveURL(/workspace=spatial/);
  await expect(page.getByTestId('spatial-review-canvas')).toContainText('لا توجد خريطة 2D معتمدة');

  await page.getByTestId('experience-open').click();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page).toHaveURL(/workspace=experience/);
  await expect(page.getByTestId('visual-screen-experience')).toContainText('رحلة مرشحة');

  await page.reload();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-theme-id', 'THEME-KAP-HYBRID-LIGHT-CANDIDATE');
});

test('project switching is explicit, keyboard accessible, and prevents KAP data or theme leakage', async ({ page }) => {
  await openKap(page);
  await page.getByTestId('project-switcher-trigger').click();
  await expect(page.getByTestId('project-switcher-search')).toBeFocused();
  await page.getByTestId('project-switcher-search').fill('معرض الآفاق');
  await page.getByTestId('project-switcher-search').press('Enter');
  await expect(page.getByTestId('project-switch-loading')).toBeVisible();
  await expect(page.getByTestId('executive-overview')).toBeVisible();

  const shell = page.locator('main[data-project-id]');
  await expect(shell).toHaveAttribute('data-project-id', referenceProjectId);
  await expect(shell).toHaveAttribute('data-event-id', 'EVENT-EXHIBITION-DEMO-001');
  await expect(shell).toHaveAttribute('data-theme-id', 'THEME-MAYADEEN-NEUTRAL-FALLBACK');
  await expect(page.getByTestId('project-switcher-trigger')).toContainText('ديمو');
  await expect(page.locator('.project-kap-workspace')).toHaveCount(0);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('VENUE-KAP-001');
  expect(bodyText).not.toContain('ZONE-ARRIVAL-001');
  expect(bodyText).not.toContain('THEME-KAP-HYBRID-LIGHT-CANDIDATE');

  await page.getByTestId('project-switcher-trigger').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('project-switcher-trigger')).toBeFocused();
});

test('returning to portfolio keeps only a validated recent-project preference and never auto-opens it', async ({ page }) => {
  await openKap(page);
  await page.getByTestId('launcher-open').click();
  await expectPortfolio(page);
  await expect(page).toHaveURL(/workspace=portfolio/);
  await expect(page.getByTestId('recent-projects')).toContainText('افتتاح وتدشين حدائق الملك عبدالله');
  await expect(page.locator('main[data-project-id]')).toHaveCount(0);

  await page.reload();
  await expectPortfolio(page);
  await expect(page.getByTestId('recent-projects')).toBeVisible();
  await page.getByTestId('recent-projects').getByRole('button', { name: /افتتاح وتدشين/ }).click();
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();

  await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify({
    lastProjectId: 'PROJECT-UNKNOWN',
    recentProjectIds: ['PROJECT-UNKNOWN'],
    lastOpenedAtByProject: { 'PROJECT-UNKNOWN': new Date().toISOString() }
  })), projectPreferenceKey);
  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId('portfolio-no-project-state')).toBeVisible();
  await expect(page.getByTestId('recent-projects')).toHaveCount(0);
});

test('invalid and missing project links fail safely without demo fallback', async ({ page }) => {
  await page.goto('/?project=PROJECT-UNKNOWN&event=EVENT-UNKNOWN&workspace=executive');
  await expectPortfolio(page);
  await expect(page.getByTestId('portfolio-context-message')).toContainText('معرّف المشروع غير معروف');
  await expect(page).toHaveURL(/workspace=portfolio/);
  await expect(page).not.toHaveURL(/PROJECT-REFERENCE/);

  await page.goto('/?workspace=executive');
  await expectPortfolio(page);
  await expect(page.getByTestId('portfolio-context-message')).toContainText('مشروعًا صريحًا');
  await expect(page.getByTestId('executive-overview')).toHaveCount(0);
});

test('browser history restores project-scoped workspaces and portfolio without stale selection', async ({ page }) => {
  await openKap(page);
  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();

  await page.getByTestId('launcher-open').click();
  await expectPortfolio(page);
  await page.goBack();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', kapProjectId);
});

test('project switcher remains usable without navigation cropping at the supported viewport', async ({ page }) => {
  await openKap(page);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect(page.getByTestId('project-switcher-trigger')).toBeVisible();
  await page.getByTestId('project-switcher-trigger').click();
  const menu = page.getByTestId('project-switcher-menu');
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('portfolio starts the existing project-authoring workflow without selecting a project', async ({ page }) => {
  await page.goto('/?workspace=portfolio');
  await page.getByTestId('portfolio-start-authoring').click();
  await expect(page).toHaveURL(/workspace=authoring/);
  await expect(page).toHaveURL(/intent=new-project/);
  await expect(page.getByTestId('pilot-authoring-workspace')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'none');
});
