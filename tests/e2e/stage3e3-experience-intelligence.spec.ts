import type { Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

const kapReviewUrl = '/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=experience';
const demoReviewUrl = '/?project=PROJECT-DEMO-EXPERIENCE-001&event=EVENT-DEMO-EXPERIENCE-001&workspace=experience';
const conferenceReviewUrl = '/?project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&workspace=experience';

async function openKapExperience(page: Page): Promise<void> {
  await page.goto(kapReviewUrl);
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-KAP-OPENING-2026');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-event-id', 'EVENT-KAP-OPENING-2026');
}

test('portfolio exposes the KAP candidate without operational demo metrics', async ({ page }) => {
  await page.goto('/');
  const portfolio = page.getByTestId('neutral-launcher');
  const kapCard = page.getByTestId('project-card-PROJECT-KAP-OPENING-2026');
  await expect(portfolio).toBeVisible();
  await expect(kapCard).toContainText('افتتاح وتدشين حدائق الملك عبدالله');
  await expect(kapCard).toContainText('حقيقي مرشح');
  await expect(kapCard).toContainText('مصادر عمل مرشحة موثقة');
  await expect(kapCard).not.toContainText('%');
  await kapCard.getByTestId('spatial-command-open').click();
  await expect(page.getByTestId('spatial-command-workspace')).toBeVisible();
  await expect(page).toHaveURL(/workspace=spatial-command/);
  await expect(page).toHaveURL(/mode=experience/);
});

test('direct KAP link opens the candidate without command-center or demo-data flash', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __mayadeenForbiddenDom?: string[] };
    state.__mayadeenForbiddenDom = [];
    const scan = () => {
      const text = document.body?.innerText ?? '';
      for (const token of ['ZONE-001', 'متوسط الجاهزية المحلي', 'إشارات حرجة محلية', 'النظام المحلي مستقر']) {
        if (text.includes(token) && !state.__mayadeenForbiddenDom?.includes(token)) state.__mayadeenForbiddenDom?.push(token);
      }
      if (document.querySelector('[data-testid="operational-command-center"]')) state.__mayadeenForbiddenDom?.push('operational-command-center');
    };
    const start = () => {
      scan();
      new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  });
  await openKapExperience(page);
  await expect(page.getByTestId('visual-screen-experience')).not.toContainText('بيئة تشغيل تجريبية عامة');
  const forbidden = await page.evaluate(() => (window as unknown as { __mayadeenForbiddenDom?: string[] }).__mayadeenForbiddenDom ?? []);
  expect(forbidden).toEqual([]);
});

test('KAP keeps candidate status while the permanent project-scoped navigation remains available', async ({ page }) => {
  await openKapExperience(page);
  await expect(page.getByTestId('system-status')).toContainText('حزمة تجربة مرشحة');
  await expect(page.locator('header').first()).toContainText('لا تفعيل لخط الأساس');
  await expect(page.locator('header').first()).not.toContainText('النظام المحلي مستقر');
  await expect(page.getByTestId('command-open')).toBeVisible();
  await expect(page.getByTestId('spatial-open')).toBeVisible();
  await expect(page.getByTestId('technical-drawer-open')).toBeVisible();
  for (const testId of ['readiness-open', 'decisions-open', 'validation-open', 'panel-toggle-dashboard', 'panel-toggle-inspector']) {
    await expect(page.getByTestId(testId)).toHaveCount(0);
  }
});

test('explicit local demo selection and browser history remain synchronized', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scene-viewport')).toHaveCount(0);
  await page.getByTestId('launcher-command-open').click();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
  await expect(page).toHaveURL(/project=PROJECT-DEMO-LOCAL-001/);
  await page.goBack();
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId('operational-command-center')).toBeVisible();
});

test('KAP identity, inferred year, five logical stages, and absent geometry remain explicit', async ({ page }) => {
  await openKapExperience(page);
  const workspace = page.getByTestId('visual-screen-experience');
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toContainText('حدائق الملك عبدالله');
  await expect(workspace).toContainText('افتتاح وتدشين');
  await expect(workspace).toContainText('السنة مستنتجة');
  await expect(workspace).toContainText('غير معتمد مكانيًا');
  await expect(workspace.locator('.vd-journey-progress button')).toHaveCount(5);
  await expect(page.locator('[data-geometry-pin], [data-route-geometry]')).toHaveCount(0);
  await expect(workspace).not.toContainText('ZONE-001');
  await expect(workspace).not.toContainText('78%');
});

test('executive, spatial, and experience workspaces remain one project-scoped journey', async ({ page }) => {
  await openKapExperience(page);
  await page.getByTestId('executive-open').click();
  await expect(page.getByTestId('visual-screen-executive')).toBeVisible();
  await page.getByTestId('spatial-open').click();
  await expect(page.getByTestId('visual-screen-spatial')).toBeVisible();
  await expect(page.getByTestId('spatial-review-canvas')).toContainText('لا توجد خريطة 2D معتمدة');
  await page.getByTestId('experience-open').click();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
});

test('journey selection, playback, reset, and projection preview are controlled', async ({ page }) => {
  await openKapExperience(page);
  await page.getByTestId('journey-stage-2').click();
  await expect(page.locator('.vd-story-copy h2')).toContainText('ممر العصور');
  await page.getByTestId('journey-play').click();
  await expect(page.getByTestId('journey-play')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('journey-pause').click();
  await expect(page.getByTestId('journey-pause')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('journey-reset').click();
  await expect(page.getByTestId('journey-stage-1')).toHaveAttribute('aria-current', 'step');
  await page.getByTestId('projection-preview-open').click();
  await expect(page.getByTestId('projection-preview')).toContainText('ليست معايرة');
  await page.getByTestId('projection-preview-close').click();
  await expect(page.getByTestId('projection-preview')).toHaveCount(0);
});

test('explicit demo experience renders its own content without KAP identity', async ({ page }) => {
  await page.goto(demoReviewUrl);
  const workspace = page.getByTestId('experience-workspace');
  await expect(workspace).toHaveAttribute('data-event-id', 'EVENT-DEMO-EXPERIENCE-001');
  await expect(workspace).toContainText('حزمة عرض تجريبية عامة');
  await expect(page.getByTestId('system-status')).toContainText('حزمة تجريبية صريحة');
  await expect(workspace).not.toContainText('EVENT-KAP-OPENING-2026');
  await expect(page.getByTestId('journey-rail').getByRole('button')).toHaveCount(3);
});

test('reference experience remains isolated through the generic engine', async ({ page }) => {
  await page.goto(conferenceReviewUrl);
  const workspace = page.getByTestId('experience-workspace');
  await expect(workspace).toHaveAttribute('data-event-id', 'EVENT-CONFERENCE-TEST-001');
  await expect(workspace).toContainText('مؤتمر مرجعي غير مرتبط');
  await expect(page.getByTestId('system-status')).toContainText('حزمة مرجعية');
  await expect(workspace).not.toContainText('حدائق الملك عبدالله');
  await expect(workspace).not.toContainText('حزمة عرض تجريبية عامة');
});

test('KAP candidate preview does not mutate persisted operational baseline and reload restores project context', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  await openKapExperience(page);
  await page.getByTestId('journey-stage-3').click();
  await page.reload();
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-KAP-OPENING-2026');
  const after = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(after).toBe(before);
  await expect(page.getByTestId('system-status')).toContainText('حزمة تجربة مرشحة');
});

test('switching from the local demo to KAP clears demo entities and status', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('launcher-command-open').click();
  await expect(page.getByTestId('scene-viewport')).toBeVisible();
  await page.goto(kapReviewUrl);
  await expect(page.getByTestId('visual-screen-experience')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('ZONE-001');
  await expect(page.locator('header').first()).not.toContainText('النظام المحلي مستقر');
});

test('invalid experience link fails safely in the portfolio without activating a fallback', async ({ page }) => {
  await page.goto('/?workspace=experience&event=EVENT-UNKNOWN');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.getByTestId('portfolio-context-message')).toContainText('مشروعًا صريحًا');
  await expect(page.getByTestId('experience-workspace')).toHaveCount(0);
  await expect(page.getByTestId('visual-screen-experience')).toHaveCount(0);
});

test('authoring, readiness, decisions, and integration remain reachable through an explicit demo project', async ({ page }) => {
  await page.goto('/');
  await openTechnicalWorkspace(page, 'pilot-authoring-open');
  await expect(page.getByTestId('pilot-authoring-workspace')).toBeVisible();
  await page.getByTestId('launcher-open').click();
  await page.getByTestId('launcher-command-open').click();
  await page.getByTestId('readiness-open').click();
  await expect(page.getByTestId('readiness-workspace')).toBeVisible();
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
});
