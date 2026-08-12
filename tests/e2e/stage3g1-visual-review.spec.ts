import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const bundleName = 'mayadeen-stage-3g1-kap-real-operational-readiness-pack-review';
const reviewRoot = process.env.STAGE3G1_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl = `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;

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
  await page.waitForTimeout(180);
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

async function captureFocused(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[],
  testId: string
) {
  const subject = page.getByTestId(testId);
  const previousStyle = await subject.getAttribute('style');
  await subject.evaluate((element) => {
    element.style.outline = '4px solid #a25e2e';
    element.style.outlineOffset = '6px';
  });
  await capture(page, directory, file, state, records);
  await subject.evaluate((element, style) => {
    if (style === null) {
      element.removeAttribute('style');
      return;
    }
    element.setAttribute('style', style);
  }, previousStyle);
}

async function openPack(page: Page, view = 'summary') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toBeVisible();
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toHaveAttribute('dir', 'rtl');
}

test('captures twenty-one distinct Stage 3G.1 founder-review states', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await openPack(page);
  await capture(page, directory, '01-executive-pack-summary.png', 'Executive pack summary', records);

  await captureFocused(
    page,
    directory,
    '02-operational-readiness-cannot-determine.png',
    'Cannot-determine operational readiness',
    records,
    'operational-readiness-cannot-determine'
  );

  await captureFocused(
    page,
    directory,
    '03-pack-preparation-metrics.png',
    'Transparent pack-preparation metrics',
    records,
    'pack-preparation-metrics'
  );

  await page.getByTestId('readiness-pack-view-sources').click();
  await capture(page, directory, '04-source-traceability.png', 'Source traceability registry', records);

  await page.getByTestId('source-trace-open-SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001').click();
  await capture(page, directory, '05-governance-slide-trace.png', 'Governance slide and shape trace', records);
  await page.getByRole('button', { name: 'إغلاق محدد المصدر' }).click();

  const employee = page.getByTestId('source-record-SOURCE-ASSET-KAP-EMPLOYEE-XLSX-001');
  await employee.scrollIntoViewIfNeeded();
  await employee.getByRole('button', { name: 'حدود السلطة' }).click();
  await capture(page, directory, '06-employee-source-limitation.png', 'Employee-source authority and minimization boundary', records);

  await page.getByTestId('readiness-pack-view-workstreams').click();
  await capture(page, directory, '07-workstream-matrix.png', 'Workstream matrix and execution conflict', records);

  await page.getByTestId('readiness-pack-view-authorities').click();
  await capture(page, directory, '08-authority-matrix.png', 'Separated authority matrix', records);

  const hse = page.getByTestId('authority-hse-authority-unknown');
  await hse.scrollIntoViewIfNeeded();
  await hse.getByRole('button').click();
  await capture(page, directory, '09-missing-hse-authority.png', 'Missing HSE authority', records);
  await page.getByRole('button', { name: 'إغلاق مسودة القرار' }).click();

  const opening = page.getByTestId('authority-opening-authority-unknown');
  await opening.scrollIntoViewIfNeeded();
  await capture(page, directory, '10-missing-opening-authority.png', 'Missing opening authority', records);

  await page.getByTestId('readiness-pack-view-evidence').click();
  await capture(page, directory, '11-evidence-contract.png', 'Evidence verification approval and acceptance contract', records);

  await page.getByTestId('readiness-pack-view-requirements').click();
  await page.getByTestId('readiness-pack-requirement-REQ-KAP-SCOPE-OFFICIAL-OPENING-PATH').click();
  await capture(page, directory, '12-requirement-detail.png', 'Requirement detail with evidence and authority gaps', records);

  await page.getByTestId('readiness-pack-view-spatial').click();
  await page.getByTestId('spatial-requirement-REQ-KAP-SCOPE-TRANSPORT-TOURS-MEDIA').click();
  await capture(page, directory, '13-spatial-relationship.png', 'Existing candidate spatial relationship', records);

  await page.getByTestId('spatial-requirement-REQ-KAP-SCOPE-TECHNICAL-ARTISTIC-SHOWS').click();
  await capture(page, directory, '14-unresolved-spatial-scope.png', 'Unresolved spatial scope without fallback marker', records);

  await page.getByRole('button', { name: 'مسودة قرار من العائق' }).click();
  await capture(page, directory, '15-decision-draft.png', 'Decision draft with no readiness mutation', records);
  await page.getByRole('button', { name: 'إغلاق مسودة القرار' }).click();

  await page.getByTestId('readiness-pack-view-requirements').click();
  await page.getByTestId('readiness-pack-requirement-REQ-KAP-GOV-STRATEGIC-OBJECTIVE').click();
  await page.getByTestId('candidate-edit-open').click();
  await capture(page, directory, '16-candidate-edit.png', 'Candidate-only requirement editing', records);

  await page.getByLabel('تعريف الإكمال المرشح').fill('إصدار موثق مع سجل مراجعة واعتماد تسليم، دون ادعاء إنجاز ميداني.');
  await page.getByLabel('سبب التغيير الإلزامي').fill('توضيح تعريف الإكمال المرشح للمراجعة المؤسسية.');
  await page.getByTestId('candidate-edit-preview').click();
  await capture(page, directory, '17-revision-diff.png', 'Immutable candidate revision before and after diff', records);
  await page.getByTestId('candidate-edit-apply').click();

  await page.getByTestId('readiness-pack-view-eligibility').click();
  await page.getByTestId('candidate-freeze-attempt').click();
  await capture(page, directory, '18-blocked-freeze.png', 'Freeze blocked by eligibility gates', records);

  await page.getByTestId('candidate-rollback-r1').click();
  await capture(page, directory, '19-rollback-to-r1.png', 'Rollback to immutable revision 1', records);

  await page.getByRole('button', { name: 'الحقيقة التقنية' }).click();
  await capture(page, directory, '20-technical-truth-drawer.png', 'Technical pack and source fingerprints', records);
  await page.getByRole('button', { name: 'إغلاق الحقيقة التقنية' }).click();

  await page.getByTestId('readiness-pack-view-requirements').click();
  await page.getByLabel('تصنيف المصدر').selectOption('template-proposed');
  await capture(page, directory, '21-full-authoring-view.png', 'Full-page authoring view with excluded template proposals', records);

  expect(records).toHaveLength(21);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1',
    projectId,
    eventId,
    venueId,
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint: '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc',
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
