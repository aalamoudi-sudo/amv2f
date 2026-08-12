import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';

export interface BrowserErrors {
  consoleErrors: string[];
  pageErrors: string[];
}

export const test = base.extend<{ browserErrors: BrowserErrors }>({
  browserErrors: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const onConsole = (message: ConsoleMessage) => {
        if (message.type() !== 'error') {
          return;
        }

        const location = message.location();
        const source = location.url ? ` (${location.url}:${location.lineNumber ?? 0})` : '';
        consoleErrors.push(`[console.error] ${message.text()}${source}`);
      };
      const onPageError = (error: Error) => {
        pageErrors.push(`[pageerror] ${error.stack ?? error.message}`);
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      await use({ consoleErrors, pageErrors });

      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      // A test may document a narrowly scoped, expected browser transport error
      // (for example an SSE socket intentionally interrupted to prove recovery).
      // All other console and page errors remain test failures.
      const expectedPatterns = testInfo.annotations
        .filter((annotation) => annotation.type === 'expected-browser-error' && annotation.description)
        .map((annotation) => new RegExp(annotation.description!));
      const errors = [...consoleErrors, ...pageErrors].filter((error) =>
        !expectedPatterns.some((pattern) => pattern.test(error))
      );
      if (errors.length === 0) {
        return;
      }

      const report = errors.join('\n\n');
      await testInfo.attach('browser-errors', {
        body: report,
        contentType: 'text/plain'
      });
      throw new Error(`Browser errors detected during ${testInfo.title}:\n${report}`);
    },
    { auto: true }
  ]
});

export { expect };

export async function enterOperationalCommand(page: Page) {
  const commandCenter = page.getByTestId('operational-command-center');
  const launcherAction = page.getByTestId('launcher-command-open');
  const commandAction = page.getByTestId('command-open');

  await expect.poll(async () =>
    (await commandCenter.isVisible()) || (await launcherAction.isVisible()) || (await commandAction.isVisible())
  ).toBe(true);

  if (await commandCenter.isVisible()) return;
  if (await launcherAction.isVisible()) {
    await launcherAction.click();
  } else {
    await commandAction.click();
  }

  await expect(page).toHaveURL(/workspace=command/);
  await expect(commandCenter).toBeVisible();
}

/**
 * Technical workspaces are intentionally behind the explicit administration
 * drawer. Keeping this helper in the E2E contract verifies that tests follow
 * the operator path instead of relying on hidden legacy shortcuts.
 */
export async function openTechnicalWorkspace(page: Page, testId: 'integration-open' | 'iot-open' | 'configuration-open' | 'pilot-authoring-open' | 'projection-open' | 'visual-system-open') {
  const target = page.getByTestId(testId);
  const portfolio = page.getByTestId('neutral-launcher');
  const technicalDrawerTrigger = page.getByTestId('technical-drawer-open');
  await expect.poll(async () => (await portfolio.isVisible()) || (await target.isVisible()) || (await technicalDrawerTrigger.isVisible())).toBe(true);
  if (await portfolio.isVisible()) await enterOperationalCommand(page);
  if (!await target.isVisible()) {
    await technicalDrawerTrigger.click();
  }
  await expect(target).toBeVisible();
  await target.click();
}
