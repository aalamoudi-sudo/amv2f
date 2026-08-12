import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const bundleName = 'mayadeen-stage-3g0-evidence-derived-readiness-command-review';
const reviewRoot = process.env.STAGE3G0_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const readinessUrl = `/?workspace=readiness&project=${projectId}&event=${eventId}&venue=${venueId}`;

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.waitForTimeout(220);
}

async function capture(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[]
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required for review capture.');
  await settle(page);
  const destination = path.join(directory, file);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled', caret: 'hide' });
  const bytes = await readFile(destination);
  records.push({
    file,
    state,
    width: viewport.width,
    height: viewport.height,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}

async function openKap(page: Page) {
  await page.goto(readinessUrl);
  await expect(page.getByTestId('readiness-command-workspace')).toBeVisible();
}

test('captures twenty distinct Stage 3G.0 founder-review states', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto('/?workspace=readiness&project=PROJECT-DEMO-LOCAL-001&event=EVENT-DEMO-001&venue=VENUE-DEMO-001');
  await expect(page.getByTestId('legacy-readiness-compatibility')).toBeVisible();
  await capture(page, directory, '01-before-legacy-percentage-workspace.png', 'Before: legacy temporary-demo percentage workspace', records);

  await openKap(page);
  await capture(page, directory, '02-executive-readiness-overview.png', 'Evidence-derived executive overview', records);

  await page.getByTestId('readiness-blocker-BLOCKER-KAP-EXECUTION-ASSIGNMENT-CONFLICT').click();
  await capture(page, directory, '03-kap-unassessed-with-authority-conflict.png', 'KAP unassessed posture with selected governance conflict', records);

  await page.getByTestId('readiness-search-toggle').click();
  await page.getByRole('textbox', { name: 'البحث في قيادة الجاهزية' }).fill('متطلب غير موجود');
  await capture(page, directory, '04-empty-search-state.png', 'Project-local empty search state without fallback', records);
  await page.getByTestId('readiness-search-toggle').click();

  await page.getByTestId('readiness-view-matrix').click();
  await capture(page, directory, '05-requirement-matrix.png', 'Requirement matrix with unknown states', records);

  await page.getByTestId('readiness-workstream-filter').selectOption('WORKSTREAM-KAP-EXECUTION');
  await capture(page, directory, '06-workstream-filter.png', 'Execution workstream filter and source conflict', records);

  await page.getByTestId('readiness-workstream-filter').selectOption('all');
  await page.getByRole('textbox', { name: 'بحث في متطلبات الجاهزية' }).fill('المقياس');
  await capture(page, directory, '07-approved-cad-pending-calibration.png', 'Approved CAD source with scale verification pending', records);

  await page.getByTestId('readiness-view-flow').click();
  await capture(page, directory, '08-source-missing-flow.png', 'KAP operational requirement source missing', records);

  await page.getByTestId('readiness-policy-preview').selectOption('evidence-submitted');
  await capture(page, directory, '09-evidence-submitted.png', 'Evidence submitted but not verified', records);

  await page.getByTestId('readiness-policy-preview').selectOption('verification-pending');
  await capture(page, directory, '10-verification-pending.png', 'Independent verification pending', records);

  await page.getByTestId('readiness-policy-preview').selectOption('internal-approval-pending');
  await capture(page, directory, '11-internal-approval-pending.png', 'Mayadeen internal approval pending', records);

  await page.getByTestId('readiness-policy-preview').selectOption('client-acceptance-pending');
  await capture(page, directory, '12-client-acceptance-pending.png', 'Client acceptance pending independently', records);

  await page.getByTestId('readiness-policy-preview').selectOption('expired-evidence');
  await capture(page, directory, '13-expired-evidence.png', 'Expired evidence invalidates downstream trust', records);

  await page.getByTestId('readiness-view-governance').click();
  await capture(page, directory, '14-governance-authority-mapping.png', 'Approved governance source and authority separation', records);

  await page.getByTestId('readiness-view-map').click();
  await capture(page, directory, '15-zone-map-linked-readiness.png', 'Candidate spatial context linked to readiness', records);

  await page.getByTestId('readiness-search-toggle').click();
  await page.getByRole('textbox', { name: 'البحث في قيادة الجاهزية' }).fill('ممر العصور');
  await page.getByRole('option').filter({ hasText: 'ممر العصور' }).click();
  await capture(page, directory, '16-selected-spatial-entity.png', 'Selected candidate entity with no readiness inference', records);

  await page.getByTestId('readiness-view-overview').click();
  await page.getByTestId('create-readiness-decision-draft').click();
  await capture(page, directory, '17-decision-draft-from-blocker.png', 'Unapproved decision draft with no readiness mutation', records);
  await page.getByTestId('readiness-decision-draft').getByRole('button', { name: 'إغلاق' }).click();

  await page.getByTestId('readiness-technical-drawer-open').click();
  await capture(page, directory, '18-technical-source-truth-drawer.png', 'Approved source hashes and truth boundary', records);

  await page.getByTestId('readiness-authoring-reason').fill('معاينة مراجعة محلية لملكية المتطلب.');
  await page.getByTestId('readiness-authoring-preview').click();
  await capture(page, directory, '19-local-authoring-before-after.png', 'Local authoring preview and deterministic before-after diff', records);

  await page.getByRole('button', { name: 'إغلاق تفاصيل الحقيقة' }).click();
  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await capture(page, directory, '20-portfolio-readiness-entry.png', 'KAP portfolio card with direct readiness command entry', records);

  expect(records).toHaveLength(20);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.0',
    projectId,
    eventId,
    venueId,
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
