import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type Page, type TestInfo } from '@playwright/test';
import { expect, test, openTechnicalWorkspace } from './test-fixtures';
import { captureSceneScreenshot, readSceneFingerprint, readSceneMetrics, waitForSceneVisible } from './scene-visibility';

async function resetBrowserState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('command-open').click();
  await waitForSceneVisible(page);
}

function reviewDirectoryFor(testInfo: TestInfo): string {
  const directory = path.join(process.cwd(), 'test-results', 'legacy-visual', 'command-center', testInfo.project.name);
  mkdirSync(directory, { recursive: true });
  return directory;
}

async function pauseScenarioAtFirstStep(page: Page, scenarioId: string, expectedMessage: string) {
  const scenarioSelect = page.getByTestId('scenario-select');

  if ((await scenarioSelect.inputValue()) === scenarioId) {
    await page.getByTestId('scenario-start').click();
  } else {
    // Selecting a different scenario starts it; a second start would leave the first timer racing the pause action.
    await scenarioSelect.selectOption(scenarioId);
  }

  const pauseButton = page.getByRole('button', { name: 'إيقاف مؤقت' });
  await expect(pauseButton).toBeEnabled();
  await pauseButton.click();
  await expect(page.getByText('متوقف مؤقتاً', { exact: true })).toBeVisible();
  await expect(page.getByTestId('scenario-message')).toContainText(expectedMessage);
}

test('visual review captures only rendered operational scenes', async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect([1920, 2560]).toContain(viewport?.width);
  expect(viewport?.height).toBe(1080);

  const reviewDirectory = reviewDirectoryFor(testInfo);
  await page.goto('/');
  await resetBrowserState(page);

  await captureSceneScreenshot(page, path.join(reviewDirectory, '01-initial-command-center.png'));

  await page.getByTestId('zone-list-item-ZONE-002').click();
  await captureSceneScreenshot(page, path.join(reviewDirectory, '02-selected-operational-zone.png'));

  await page.getByTestId('status-select').selectOption('highRisk');
  await page.getByTestId('readiness-input').evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = '42';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('status-select')).toHaveValue('highRisk');
  await expect(page.getByTestId('readiness-input')).toHaveValue('42');
  await captureSceneScreenshot(page, path.join(reviewDirectory, '03-zone-status-readiness-changed.png'));

  const evacuationRouteToggle = page.getByTestId('route-toggle-ROUTE-002');
  await evacuationRouteToggle.check();
  await expect(evacuationRouteToggle).toBeChecked();
  await captureSceneScreenshot(page, path.join(reviewDirectory, '04-routes-visible.png'));

  await pauseScenarioAtFirstStep(page, 'visitorJourney', 'بدء رحلة الزائر');
  await captureSceneScreenshot(page, path.join(reviewDirectory, '05-visitor-journey-running.png'));

  await pauseScenarioAtFirstStep(page, 'evacuation', 'تفعيل حالة طوارئ');
  await captureSceneScreenshot(page, path.join(reviewDirectory, '06-evacuation-running.png'));

  await page.getByTestId('view-mode-top').click();
  await expect(page.getByTestId('view-mode-top')).toHaveAttribute('aria-pressed', 'true');
  await captureSceneScreenshot(page, path.join(reviewDirectory, '07-top-plan-view.png'));

  await page.getByTestId('view-mode-operator').click();
  await expect(page.getByTestId('view-mode-operator')).toHaveAttribute('aria-pressed', 'true');
  await captureSceneScreenshot(page, path.join(reviewDirectory, '08-perspective-operator-view.png'));

  const projectionRouteDefinitionToggle = page.getByTestId('route-toggle-ROUTE-002');
  if (!(await projectionRouteDefinitionToggle.isChecked())) {
    await projectionRouteDefinitionToggle.check();
  }
  await expect(projectionRouteDefinitionToggle).toBeChecked();
  await openTechnicalWorkspace(page, 'projection-open');
  await expect(page.getByTestId('projection-mode')).toBeVisible();
  const projectionRoutesToggle = page.getByTestId('projection-routes-toggle');
  if ((await projectionRoutesToggle.getAttribute('aria-pressed')) === 'true') {
    await projectionRoutesToggle.click();
  }
  await expect(projectionRoutesToggle).toHaveAttribute('aria-pressed', 'false');
  const projectionWithoutRoutesScreenshot = await captureSceneScreenshot(
    page,
    path.join(reviewDirectory, '09-projection-mode.png')
  );
  const projectionWithoutRoutesFingerprint = await readSceneFingerprint(page);

  await projectionRoutesToggle.click();
  await expect(projectionRoutesToggle).toHaveAttribute('aria-pressed', 'true');
  const projectionWithRoutesScreenshot = await captureSceneScreenshot(
    page,
    path.join(reviewDirectory, '10-projection-routes-enabled.png')
  );
  const projectionWithRoutesFingerprint = await readSceneFingerprint(page);
  expect(projectionWithRoutesFingerprint).not.toBe(projectionWithoutRoutesFingerprint);
  expect(projectionWithRoutesScreenshot.equals(projectionWithoutRoutesScreenshot)).toBe(false);

  await page.getByTestId('projection-clean-open').click();
  await expect(page.getByTestId('projection-mode')).toHaveAttribute('data-projection-clean', 'true');
  await expect(page.getByTestId('projection-toolbar')).toBeHidden();
  await captureSceneScreenshot(page, path.join(reviewDirectory, '14-projection-clean-output.png'));
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('projection-mode')).toBeHidden();
  await waitForSceneVisible(page);

  await page.reload();
  await waitForSceneVisible(page);
  await captureSceneScreenshot(page, path.join(reviewDirectory, '11-command-center-after-reload.png'));

  await page.getByTestId('panel-toggle-dashboard').click();
  await page.getByTestId('panel-toggle-inspector').click();
  await expect(page.getByRole('complementary', { name: 'لوحة التشغيل' }).getByRole('button', { name: 'فتح لوحة التشغيل' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'لوحة التفاصيل' }).getByRole('button', { name: 'فتح لوحة التفاصيل' })).toBeVisible();
  await captureSceneScreenshot(page, path.join(reviewDirectory, '12-collapsed-panel-command-center.png'));

  await page.getByTestId('panel-toggle-dashboard').click();
  await page.getByTestId('panel-toggle-inspector').click();
  await page.getByTestId('zone-list-item-ZONE-005').click();
  await page.getByRole('button', { name: 'إعادة ضبط الكاميرا' }).click();
  await captureSceneScreenshot(page, path.join(reviewDirectory, '13-selected-zone-focus.png'));

  const metrics = await readSceneMetrics(page);
  expect(metrics.contentRatio).toBeGreaterThan(0.08);
  expect(metrics.whiteRatio).toBeLessThan(0.75);
});
