import type { Page } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';

const packages = [
  {
    projectId: 'PROJECT-REFERENCE-EXHIBITION-001',
    eventType: 'exhibition',
    eventId: 'EVENT-EXHIBITION-DEMO-001',
    venueId: 'VENUE-EXHIBITION-DEMO-001',
    entityId: 'ZONE-EXH-002',
    routeId: 'ROUTE-EXH-001',
    decisionId: 'DECISION-EXH-001',
    resultEventId: 'EVENT-EXHIBITION-001',
    scenarioId: 'scenario-exhibition-readiness',
    projectionProfileId: 'projection-profile-exhibition'
  },
  {
    projectId: 'PROJECT-REFERENCE-CONFERENCE-001',
    eventType: 'conference',
    eventId: 'EVENT-CONFERENCE-DEMO-001',
    venueId: 'VENUE-CONFERENCE-DEMO-001',
    entityId: 'ZONE-CONF-001',
    routeId: 'ROUTE-CONF-001',
    decisionId: 'DECISION-CONF-001',
    resultEventId: 'EVENT-CONFERENCE-001',
    scenarioId: 'scenario-conference-readiness',
    projectionProfileId: 'projection-profile-conference'
  },
] as const;

function projectWorkspacePath(current: typeof packages[number], workspace: string): string {
  return `/?project=${current.projectId}&event=${current.eventId}&workspace=${workspace}`;
}

async function openConfiguration(page: Page) {
  await openTechnicalWorkspace(page, 'configuration-open');
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
}

async function activate(page: Page, eventType: typeof packages[number]['eventType']) {
  const current = packages.find((candidate) => candidate.eventType === eventType)!;
  await page.goto(projectWorkspacePath(current, 'configuration'));
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await page.getByTestId(`event-package-select-${eventType}`).click();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
  await page.getByTestId('event-package-activate').click();
}

test.describe('Stage 3E.1 authoritative runtime', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(projectWorkspacePath(packages[0], 'configuration'));
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  });

  test('every activatable reference project drives all enabled capabilities without cross-event leakage', async ({ page }) => {
    test.setTimeout(180_000);
    let previous: typeof packages[number] | undefined;
    for (const current of packages) {
      await activate(page, current.eventType);
      await expect(page.getByTestId('package-active-identity')).toContainText(current.eventId.split('-')[1] === 'EXHIBITION' ? 'معرض' : current.eventId.split('-')[1] === 'CONFERENCE' ? 'مؤتمر' : 'مهرجان');

      await page.getByTestId('command-open').click();
      await expect(page.getByTestId(`zone-list-item-${current.entityId}`)).toBeVisible();
      await expect(page.getByTestId(`route-toggle-${current.routeId}`)).toBeVisible();
      await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');
      await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-spatial-size', /\d/);
      if (previous) {
        await expect(page.getByTestId(`zone-list-item-${previous.entityId}`)).toHaveCount(0);
        await expect(page.getByTestId(`route-toggle-${previous.routeId}`)).toHaveCount(0);
      }

      await page.getByTestId('readiness-open').click();
      await expect(page.getByTestId(`readiness-zone-row-${current.entityId}`)).toBeVisible();
      await page.getByTestId('readiness-view-plan').click();
      await expect(page.getByTestId('readiness-view-plan')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId(`readiness-2d-zone-${current.entityId}`)).toBeVisible();
      await expect(page.getByTestId('readiness-2d-plan')).toHaveAttribute('data-spatial-bounds', /\d/);
      await page.getByTestId('readiness-view-3d').click();
      await expect(page.getByTestId('readiness-view-3d')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-scene-ready', 'true');

      await page.getByTestId('decisions-open').click();
      await expect(page.getByTestId(`decision-row-${current.decisionId}`)).toBeVisible();
      await expect(page.getByTestId('decision-center')).toHaveAttribute('data-event-id', current.eventId);
      await expect(page.getByTestId('decision-center')).toHaveAttribute('data-venue-id', current.venueId);
      await page.getByTestId('decision-create-open').click();
      await page.getByTestId('decision-create-title').fill(`قرار نطاق ${current.eventType}`);
      await page.getByTestId('decision-create-description').fill('قرار محلي لاختبار عزل الفعالية والموقع.');
      await page.getByTestId('decision-create-entity').fill(current.entityId);
      await page.getByTestId('decision-create-owner').fill('مالك قرار محلي');
      await page.getByTestId('decision-create-responsible').fill('مسؤول تنفيذ محلي');
      await page.getByTestId('decision-create-submit').click();
      await expect(page.getByTestId('decision-details')).toContainText(current.eventId);
      await expect(page.getByTestId('decision-details')).toContainText(current.venueId);

      await page.getByTestId('command-open').click();
      await expect(page.getByTestId('scenario-select')).toHaveValue(current.scenarioId);
      await page.getByTestId('scenario-start').click();
      await expect(page.getByTestId('scenario-progress')).not.toHaveAttribute('style', 'width: 0%;');
      await expect(page.getByTestId('scene-viewport')).toHaveAttribute('data-selected-entity', new RegExp(current.eventType === 'exhibition' ? 'EXH' : current.eventType === 'conference' ? 'CONF' : 'FEST'));

      await openTechnicalWorkspace(page, 'integration-open');
      await expect(page.getByTestId('integration-active-context')).toContainText(current.eventId);
      await expect(page.getByTestId('integration-workspace')).toHaveAttribute('data-venue-id', current.venueId);
      await expect(page.getByTestId('integration-runtime-source')).toBeVisible();
      await page.getByTestId('simulate-valid').click();
      await expect(page.getByTestId(`event-${current.resultEventId}`)).toBeVisible();

      await openTechnicalWorkspace(page, 'projection-open');
      await expect(page.getByTestId('projection-toolbar')).toHaveAttribute('data-projection-profile-id', current.projectionProfileId);
      await expect(page.getByTestId('active-projection-profile')).toContainText('معاينة محلية بلا معايرة');
      await page.getByTestId('projection-close').click();
      await openConfiguration(page);
      previous = current;
    }
  });

  test('cross-project activation is blocked and reset preserves the selected project runtime', async ({ page }) => {
    await activate(page, 'exhibition');
    await activate(page, 'conference');
    await page.getByTestId('event-package-select-exhibition').click();
    await expect(page.getByTestId('package-project-mismatch')).toBeVisible();
    await expect(page.getByTestId('event-package-activate')).toBeDisabled();
    await page.getByTestId('package-reset').click();
    await expect(page.getByTestId('package-active-identity')).toContainText('مؤتمر');
    await expect(page.getByTestId('selected-package-definition')).toContainText('EVENT-PACKAGE-CONFERENCE-DEMO');

    await page.getByTestId('decisions-open').click();
    await page.getByTestId('decision-reset-demo').click();
    await expect(page.getByTestId('decision-center')).toHaveAttribute('data-event-id', 'EVENT-CONFERENCE-DEMO-001');
    await openConfiguration(page);
    await expect(page.getByTestId('package-active-identity')).toContainText('مؤتمر');
  });

  test('deeply malformed JSON remains preview-only and returns Arabic blocking errors', async ({ page }) => {
    await page.getByTestId('package-json-input').fill(JSON.stringify({
      packageId: 'EVENT-PACKAGE-MALFORMED',
      spatialConfiguration: { modelReferences: [{}] },
      requirementConfiguration: [null],
      temporaryDemoSeedData: { readinessRecords: 'wrong' }
    }));
    await page.getByTestId('package-json-preview').click();
    await expect(page.getByTestId('package-validation-issues')).toContainText('بنية الحزمة غير صالحة');
    await expect(page.getByTestId('event-package-activate')).toBeDisabled();
    await expect(page.getByTestId('package-active-identity')).toContainText('معرض');
  });
});
