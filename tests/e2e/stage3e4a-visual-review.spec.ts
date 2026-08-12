import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const reviewRoot = process.env.STAGE3E4A_REVIEW_DIR
  ?? path.join(process.env.HOME ?? '/Users/mayadeen', 'Downloads', 'mayadeen-stage-3e4a-kap-candidate-spatial-intake-review');
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const kapUrl = `/?project=${projectId}&event=${eventId}&venue=${venueId}&workspace=spatial-authoring`;
const candidateLayerId = 'SOURCE-LAYER-KAP-CANDIDATE-ZONING';

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

async function captureViewport(page: Page, directory: string, filename: string, state: string, records: ScreenshotRecord[]) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required for founder-review screenshots.');
  const filePath = path.join(directory, filename);
  await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
  const bytes = await readFile(filePath);
  records.push({
    file: filename,
    state,
    width: viewport.width,
    height: viewport.height,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}

async function scrollAndCapture(page: Page, locatorTestId: string, directory: string, filename: string, state: string, records: ScreenshotRecord[]) {
  await page.getByTestId(locatorTestId).evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(80);
  await captureViewport(page, directory, filename, state, records);
}

test('captures the complete Stage 3E.4A founder review surface', async ({ page }, testInfo) => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await page.goto('/?workspace=portfolio');
  await expect(page.getByTestId(`project-card-${projectId}`)).toBeVisible();
  await scrollAndCapture(page, `project-card-${projectId}`, directory, '01-kap-project-portfolio-card.png', 'KAP project portfolio card', records);
  await page.getByTestId(`project-source-readiness-${projectId}`).focus();
  await scrollAndCapture(page, `project-source-readiness-${projectId}`, directory, '02-source-readiness-summary.png', 'source readiness summary with eleven candidates and open gates', records);

  await page.getByTestId('source-authority-open').click();
  await expect(page.getByTestId('candidate-spatial-intake')).toBeVisible();
  await page.getByTestId('source-layer-SOURCE-LAYER-KAP-CANDIDATE-ZONING').click();
  await expect(page.getByTestId('optional-local-source-image')).toHaveAttribute('data-preview-state', 'ready');
  await scrollAndCapture(page, 'drive-permission-risk', directory, '02a-drive-permission-critical-risk.png', 'unresolved anonymous-writer source-integrity risk', records);
  await scrollAndCapture(page, 'candidate-zoning-overlay', directory, '03-candidate-zoning-full-view.png', 'candidate zoning overlay and eleven numbered markers', records);
  await page.getByTestId('candidate-marker-9').click();
  await scrollAndCapture(page, 'candidate-entity-inspector', directory, '04-candidate-entity-selection.png', 'candidate entity selection and authority details', records);

  await page.getByTestId('candidate-marker-6').click();
  await page.getByTestId('mapping-terminology-conflict').focus();
  await scrollAndCapture(page, 'mapping-terminology-conflict', directory, '05-mapping-terminology-conflict.png', 'Tunnel versus Walkway terminology conflict', records);
  await page.getByTestId('mapping-ZONE-ARRIVAL-001').focus();
  await scrollAndCapture(page, 'mapping-ZONE-ARRIVAL-001', directory, '06-mapping-one-to-many-arrival.png', 'one-to-many arrival mapping', records);
  await page.getByTestId('mapping-unresolved-show').focus();
  await scrollAndCapture(page, 'mapping-unresolved-show', directory, '07-mapping-unresolved-show.png', 'unresolved show relationship without guessed match', records);
  await page.getByTestId('mapping-unassigned-entities').focus();
  await scrollAndCapture(page, 'mapping-unassigned-entities', directory, '08-mapping-unassigned-entities.png', 'three candidate entities awaiting independent review', records);

  await scrollAndCapture(page, 'missing-geometry-controls', directory, '09-missing-scale-crs-controls.png', 'missing scale CRS approval and calibration', records);
  await scrollAndCapture(page, 'source-authority-matrix', directory, '10-source-authority-matrix.png', 'source authority matrix and prohibited uses', records);

  await page.getByTestId('source-layer-SOURCE-LAYER-KAP-WORKING-CAD').click();
  await scrollAndCapture(page, 'working-cad-duplicate-confirmation', directory, '11-working-cad-duplicate-confirmation.png', 'working CAD duplicate confirmation without false revision', records);

  await page.getByTestId('source-layer-SOURCE-LAYER-KAP-CONCEPT-MASTERPLAN').click();
  await expect(page.getByTestId('optional-local-source-image')).toHaveAttribute('data-preview-state', 'ready');
  await scrollAndCapture(page, 'concept-masterplan-layer', directory, '12-concept-reference-layer.png', 'concept A-T reference with non-technical authority', records);

  await page.getByTestId('source-layer-SOURCE-LAYER-KAP-FIELD-EVIDENCE').click();
  await scrollAndCapture(page, 'field-evidence-catalog', directory, '13-field-evidence-catalog.png', 'metadata-only field evidence inventory', records);
  await page.getByTestId('gps-privacy-disclosure').focus();
  await scrollAndCapture(page, 'gps-privacy-disclosure', directory, '14-gps-privacy-disclosure.png', 'GPS and personal-data disclosure', records);

  await page.getByTestId('source-layer-SOURCE-LAYER-KAP-VISITOR-MAP').click();
  await scrollAndCapture(page, 'missing-visitor-map', directory, '15-missing-visitor-map.png', 'missing illustrated visitor map gate', records);

  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/local-assets/kap/kaga-zoning-candidate.jpg*', (route) => route.abort());
  await page.goto(`${kapUrl}&sourceLayer=${candidateLayerId}`);
  await expect(page.getByTestId('local-preview-missing')).toBeVisible();
  await scrollAndCapture(page, 'local-preview-missing', directory, '16-missing-local-preview-safe-state.png', 'build-safe state without optional local preview', records);

  await page.unrouteAll({ behavior: 'wait' });
  await page.goto('/?project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&venue=VENUE-EXHIBITION-DEMO-001&workspace=spatial-authoring');
  await expect(page.getByTestId('cad-project-isolation-error')).toBeVisible();
  await scrollAndCapture(page, 'cad-project-isolation-error', directory, '17-cross-project-isolation.png', 'cross-project source isolation', records);

  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3E.4A',
    projectId,
    eventId,
    venueId,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
