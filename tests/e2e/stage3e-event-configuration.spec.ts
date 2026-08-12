import type { Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

type ReferenceEventType = 'exhibition' | 'conference' | 'festival';

const projectContextByEventType: Record<ReferenceEventType, { projectId: string; eventId: string }> = {
  exhibition: { projectId: 'PROJECT-REFERENCE-EXHIBITION-001', eventId: 'EVENT-EXHIBITION-DEMO-001' },
  conference: { projectId: 'PROJECT-REFERENCE-CONFERENCE-001', eventId: 'EVENT-CONFERENCE-DEMO-001' },
  festival: { projectId: 'PROJECT-REFERENCE-FESTIVAL-001', eventId: 'EVENT-FESTIVAL-DEMO-001' }
};

function projectWorkspacePath(eventType: ReferenceEventType, workspace: string): string {
  const context = projectContextByEventType[eventType];
  return `/?project=${context.projectId}&event=${context.eventId}&workspace=${workspace}`;
}

async function openConfiguration(page: Page, eventType: Exclude<ReferenceEventType, 'festival'> = 'exhibition') {
  await page.goto(projectWorkspacePath(eventType, 'configuration'));
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
}

async function selectPackage(page: Page, eventType: ReferenceEventType) {
  await page.getByTestId(`event-package-select-${eventType}`).click();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
}

async function activatePackage(page: Page, eventType: Exclude<ReferenceEventType, 'festival'>) {
  await selectPackage(page, eventType);
  await page.getByTestId('event-package-activate').click();
  await expect(page.getByTestId('package-active-identity')).not.toContainText('لم تُفعّل');
}

test('configuration workspace is lazy-loaded, Arabic RTL, and honestly classified', async ({ page }) => {
  const scriptRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scriptRequests.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  expect(scriptRequests.some((url) => url.includes('EventConfigurationWorkspace-'))).toBe(false);
  await openTechnicalWorkspace(page, 'configuration-open');
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await expect.poll(() => scriptRequests.some((url) => url.includes('EventConfigurationWorkspace-'))).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('package-demo-classification')).toContainText('بيانات تجريبية مؤقتة');
  await expect(page.getByTestId('package-demo-classification')).toContainText('ليست فعالية تشغيلية حية');
  await expect(page.getByTestId('package-demo-classification')).toContainText('لا يوجد اعتماد إنتاجي');
});

test('exhibition package validates and atomically drives the current platform', async ({ page }) => {
  await openConfiguration(page);
  await activatePackage(page, 'exhibition');
  await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
  await expect(page.getByTestId('package-entity-list')).toContainText('HALL-EXH-001');
  await expect(page.getByTestId('package-route-list')).toContainText('ROUTE-EXH-002');
  await expect(page.getByTestId('package-readiness-list')).toContainText('ZONE-EXH-002');
  await expect(page.getByTestId('package-decision-list')).toContainText('DECISION-EXH-001');
});

test('conference package validates and changes roles, routes, readiness, and decisions', async ({ page }) => {
  await openConfiguration(page, 'conference');
  await activatePackage(page, 'conference');
  await expect(page.getByTestId('package-active-identity')).toContainText('مؤتمر');
  await expect(page.getByTestId('package-role-authority')).toContainText('مشغل برنامج المؤتمر');
  await expect(page.getByTestId('package-route-list')).toContainText('المتحدثون');
  await expect(page.getByTestId('package-readiness-list')).toContainText('ZONE-CONF-001');
  await expect(page.getByTestId('package-decision-list')).toContainText('DECISION-CONF-002');
});

test('festival package remains previewable but cannot activate inside another project', async ({ page }) => {
  await openConfiguration(page);
  await selectPackage(page, 'festival');
  await expect(page.getByTestId('package-entity-list')).toContainText('STAGE-FEST-002');
  await expect(page.getByTestId('package-route-list')).toContainText('الاستجابة والتجمع');
  await expect(page.getByTestId('package-readiness-list')).toContainText('ZONE-FEST-003');
  await expect(page.getByTestId('package-decision-list')).toContainText('DECISION-FEST-001');
  await expect(page.getByTestId('package-project-mismatch')).toBeVisible();
  await expect(page.getByTestId('event-package-activate')).toBeDisabled();
  await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
});

test('2D, 3D, entity catalog, and routes visibly change without rebuilding the core', async ({ page }) => {
  await openConfiguration(page);
  await selectPackage(page, 'exhibition');
  await expect(page.getByTestId('package-2d-preview').locator('[data-testid^="readiness-2d-zone-"]')).toHaveCount(3);
  await expect(page.getByTestId('package-3d-preview').getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
  const exhibition2d = await page.getByTestId('package-2d-preview').screenshot();
  const exhibition3d = await page.getByTestId('package-3d-preview').screenshot();
  const exhibitionCatalog = await page.getByTestId('package-entity-list').innerText();
  const exhibitionRoutes = await page.getByTestId('package-route-list').innerText();

  await selectPackage(page, 'festival');
  await expect(page.getByTestId('package-3d-preview').getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', /FEST/);
  const festival2d = await page.getByTestId('package-2d-preview').screenshot();
  const festival3d = await page.getByTestId('package-3d-preview').screenshot();
  expect(festival2d.equals(exhibition2d)).toBe(false);
  expect(festival3d.equals(exhibition3d)).toBe(false);
  expect(await page.getByTestId('package-entity-list').innerText()).not.toBe(exhibitionCatalog);
  expect(await page.getByTestId('package-route-list').innerText()).not.toBe(exhibitionRoutes);
});

test('activated decisions remain scoped to the selected event instance', async ({ page }) => {
  await openConfiguration(page, 'conference');
  await activatePackage(page, 'conference');
  await page.getByTestId('decisions-open').click();
  await expect(page.getByTestId('decision-center')).toBeVisible();
  await expect(page.getByTestId('decision-row-DECISION-CONF-001')).toBeVisible();
  await expect(page.getByTestId('decision-row-DECISION-EXH-001')).toHaveCount(0);
  await expect(page.getByTestId('decision-row-DECISION-FEST-001')).toHaveCount(0);
});

test('operational packs explain dependencies and integration profiles remain local', async ({ page }) => {
  await openConfiguration(page);
  await selectPackage(page, 'festival');
  await expect(page.getByTestId('package-operational-packs')).toContainText('الأساس المكاني');
  await expect(page.getByTestId('package-dependencies')).toContainText('يعتمد على');
  await expect(page.getByTestId('package-role-authority')).toContainText('غير ملزم إنتاجياً');
  await expect(page.getByTestId('package-integration-profiles')).toContainText('لا شبكة ولا حزمة مورّد');
  await expect(page.getByTestId('package-integration-profiles')).toContainText('طابور معاينة محلي');
  await expect(page.getByTestId('package-integration-profiles')).not.toContainText('queue-local-preview');
});

test('invalid package and unknown venue are blocked without replacing the active package', async ({ page }) => {
  await openConfiguration(page);
  await activatePackage(page, 'exhibition');
  const activeBefore = await page.getByTestId('package-active-identity').innerText();
  await page.getByTestId('simulate-invalid-package').click();
  await expect(page.getByTestId('package-validation-issues')).toContainText('الموقع المرتبط بمثيل الفعالية غير موجود');
  await expect(page.getByTestId('event-package-activate')).toBeDisabled();
  expect(await page.getByTestId('package-active-identity').innerText()).toBe(activeBefore);
});

test('missing operational-pack dependency is explained in Arabic and cannot activate', async ({ page }) => {
  await openConfiguration(page);
  await page.getByTestId('simulate-missing-dependency').click();
  await expect(page.getByTestId('package-validation-issues')).toContainText('تحتاج إلى تفعيل');
  await expect(page.getByTestId('event-package-activate')).toBeDisabled();
});

test('project context blocks cross-project activation and reset preserves its runtime', async ({ page }) => {
  await openConfiguration(page);
  await activatePackage(page, 'exhibition');
  await selectPackage(page, 'conference');
  await expect(page.getByTestId('package-project-mismatch')).toBeVisible();
  await expect(page.getByTestId('event-package-activate')).toBeDisabled();
  await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
  await page.getByTestId('package-rollback').click();
  await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
  await page.getByTestId('package-reset').click();
  await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
  await expect(page.getByTestId('selected-package-definition')).toContainText('EVENT-PACKAGE-EXHIBITION-DEMO');
});

test('project switching preserves stored baseline and clears scenario overlay', async ({ page }) => {
  await openConfiguration(page);
  await activatePackage(page, 'exhibition');
  const persistedAfterActivation = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(persistedAfterActivation).not.toContain('SITE-EXH-001');
  expect(persistedAfterActivation).not.toContain('SITE-001');
  await page.getByTestId('command-open').click();
  await page.getByTestId('scenario-start').click();
  await expect(page.getByTestId('scenario-message')).toBeVisible();
  await page.goto(projectWorkspacePath('conference', 'command'));
  await expect(page.getByTestId('zone-list-item-ZONE-CONF-001')).toBeVisible();
  await expect(page.getByTestId('scenario-start')).toBeVisible();
  await expect(page.getByTestId('scenario-message')).toContainText('لا يوجد سيناريو نشط حالياً');
  const persistedAfterSwitch = await page.evaluate(() => window.localStorage.getItem('mayadeen-event-intelligence-twin:v1'));
  expect(persistedAfterSwitch).not.toContain('EXH');
});

test('Stage 3D integration laboratory still runs after a package activation', async ({ page }) => {
  await openConfiguration(page, 'conference');
  await activatePackage(page, 'conference');
  await openTechnicalWorkspace(page, 'integration-open');
  await expect(page.getByTestId('integration-workspace')).toBeVisible();
  await expect(page.getByTestId('integration-active-context')).toContainText('EVENT-CONFERENCE-DEMO-001');
  await expect(page.getByTestId('integration-workspace')).toHaveAttribute('data-venue-id', 'VENUE-CONFERENCE-DEMO-001');
  await page.getByTestId('simulate-valid').click();
  await expect(page.getByTestId('operational-event-stream').locator('[data-testid^="event-EVENT-"]')).toHaveCount(1);
  await expect(page.getByTestId('integration-validation-results')).toContainText('قُبل الحدث');
});

test('configuration layout remains readable at both command-center viewports', async ({ page }, testInfo) => {
  await openConfiguration(page);
  await selectPackage(page, 'festival');
  expect(testInfo.project.name).toMatch(/1920x1080|2560x1080/);
  await expect(page.getByTestId('event-package-library')).toBeVisible();
  await expect(page.getByTestId('package-validation-status')).toBeVisible();
  await expect(page.getByTestId('package-2d-preview')).toBeVisible();
  await expect(page.getByTestId('package-3d-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const primaryControlsFit = await page.getByTestId('event-package-activate').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.right <= window.innerWidth + 1 && rect.left >= -1;
  });
  expect(primaryControlsFit).toBe(true);
});
