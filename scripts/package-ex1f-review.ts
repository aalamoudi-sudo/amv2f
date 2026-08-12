import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { kapExperienceDeliveryReadinessProjection, kapFourDayExperienceTruthProjection } from '../src/data/experienceReviewProjections';

interface CaptureState {
  file: string;
  labelAr: string;
  url: string;
  workspace: 'experience' | 'rehearsal' | 'portfolio';
  prepare?: (page: Page) => Promise<void>;
}

interface ScreenshotRecord {
  file: string;
  labelAr: string;
  width: number;
  height: number;
  sha256: string;
}

interface VisualDifferenceRecord {
  view: string;
  resolution: string;
  beforeFile: string;
  afterFile: string;
  changedPixelPercent: number;
  meanAbsoluteChannelDelta: number;
}

interface ComparisonSpec {
  view: string;
  baselineFile: string;
  baselineOutputFile: string;
  afterFile: string;
  labelAr: string;
}

const origin = process.env.EX1F_REVIEW_ORIGIN ?? 'http://127.0.0.1:4196';
const bundleName = 'mayadeen-stage-ex1f-wave-a1-founder-visual-wow-review';
const reviewRoot = path.join(os.homedir(), 'Downloads', bundleName);
const zipPath = `${reviewRoot}.zip`;
const repositoryRoot = process.cwd();
const waveABaselineRoot = process.env.EX1F_WAVE_A_BASELINE_ROOT ?? path.join(os.homedir(), 'Downloads', 'mayadeen-stage-ex1f-wave-a-visual-production-review');
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const trackedStatus = execFileSync('git', ['status', '--short', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (trackedStatus) throw new Error('EX.1F review packaging requires a clean committed worktree.');

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const experience = (query: string) => `${origin}/?workspace=experience-twin&${scope}&${query}`;
const states: CaptureState[] = [
  { file: '01-a1-experience-entry.png', labelAr: 'مدخل KAP المكاني والهوية التنفيذية المختصرة', workspace: 'experience', url: experience('experienceMode=overview') },
  { file: '02-a1-story-map.png', labelAr: 'خريطة القصة المهيمنة وخط الشخصية النشط', workspace: 'experience', url: experience('experienceMode=story&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&journey=JOURNEY-KAP-PRESS-2026&step=STEP-KAP-PRESS-PRESS-CONFERENCE&mapMode=story&viewMode=map-focus') },
  { file: '03-a1-persona-journey.png', labelAr: 'رحلة الشخصية وشريط اللحظة السينمائي', workspace: 'experience', url: experience('experienceMode=journey&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&mapMode=story&viewMode=map-focus') },
  { file: '04-a1-client-presentation.png', labelAr: 'عرض العميل بمرتكز بصري مكاني', workspace: 'experience', url: experience('experienceMode=presentation&presentationStep=8') },
  { file: '05-a1-experience-command.png', labelAr: 'اللحظة المكانية نفسها مع كشف طبقات القيادة', workspace: 'experience', url: experience('experienceMode=story&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP&journey=JOURNEY-KAP-REGIONAL-2026&step=STEP-KAP-REGIONAL-AGES&entity=ENTITY-KAP-OP-006&mapMode=story&viewMode=map-focus'), prepare: async (page) => {
    await page.getByTestId('experience-behind-the-experience').click();
    const reveal = page.getByTestId('experience-command-reveal');
    for (let index = 0; index < 5; index += 1) await reveal.getByRole('button', { name: /اكشف الطبقة التالية/ }).click();
  } },
  { file: '06-a1-unresolved-break.png', labelAr: 'فجوة سردية غير محسومة دون خط مزيف', workspace: 'experience', url: experience('experienceMode=journey&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026&step=STEP-KAP-ROYAL-MAIN-SHOW&mapMode=story&viewMode=map-focus') },
  { file: '07-a1-all-relationships-analysis.png', labelAr: 'كل العلاقات كطبقة تحليل اختيارية', workspace: 'experience', url: experience('experienceMode=story&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&mapMode=story&viewMode=map-focus'), prepare: async (page) => { await page.getByTestId('story-map-all-relationships').click(); } },
  { file: '08-a1-missing-production-3d.png', labelAr: 'حالة 3D الاحترافية الجاهزة للاستبدال بالأصل', workspace: 'experience', url: experience('experienceMode=scenes&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&mapMode=web3d&viewMode=scene-focus') },
  { file: '09-a1-truth-on-demand.png', labelAr: 'الحقيقة والتفاصيل عند الطلب', workspace: 'experience', url: experience('experienceMode=story&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-AGES&mapMode=story&viewMode=map-focus'), prepare: async (page) => { await page.getByTestId('experience-truth-open').click(); } },
  { file: '10-a1-built-next.png', labelAr: 'ما تم وما التالي دون تغيير مساري التسليم', workspace: 'experience', url: experience('experienceMode=delivery') }
];

const comparisons: ComparisonSpec[] = [
  { view: 'experience-entry', baselineFile: '01-wave-a-premium-entry.png', baselineOutputFile: '00-wave-a-experience-entry.png', afterFile: '01-a1-experience-entry.png', labelAr: 'قبل A.1 · مدخل التجربة' },
  { view: 'story-map', baselineFile: '04-story-map-dominant.png', baselineOutputFile: '00-wave-a-story-map.png', afterFile: '02-a1-story-map.png', labelAr: 'قبل A.1 · خريطة القصة' },
  { view: 'persona-journey', baselineFile: '03-day1-persona-journey.png', baselineOutputFile: '00-wave-a-persona-journey.png', afterFile: '03-a1-persona-journey.png', labelAr: 'قبل A.1 · رحلة الشخصية' },
  { view: 'client-presentation', baselineFile: '11-client-presentation.png', baselineOutputFile: '00-wave-a-client-presentation.png', afterFile: '04-a1-client-presentation.png', labelAr: 'قبل A.1 · عرض العميل' },
  { view: 'experience-command', baselineFile: '08-command-readiness-truth.png', baselineOutputFile: '00-wave-a-experience-command.png', afterFile: '05-a1-experience-command.png', labelAr: 'قبل A.1 · القيادة' }
];

const resolutions = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }] as const;

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('Invalid PNG screenshot.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function compareScreenshots(page: Page, beforePath: string, afterPath: string): Promise<Omit<VisualDifferenceRecord, 'view' | 'resolution' | 'beforeFile' | 'afterFile'>> {
  const before = `data:image/png;base64,${readFileSync(beforePath).toString('base64')}`;
  const after = `data:image/png;base64,${readFileSync(afterPath).toString('base64')}`;
  return page.evaluate(async ({ beforeUrl, afterUrl }) => {
    const beforeImage = document.createElement('img');
    const afterImage = document.createElement('img');
    beforeImage.src = beforeUrl;
    afterImage.src = afterUrl;
    await Promise.all([beforeImage.decode(), afterImage.decode()]);
    if (beforeImage.width !== afterImage.width || beforeImage.height !== afterImage.height) throw new Error('Before and after screenshots have different dimensions.');
    const canvas = document.createElement('canvas');
    canvas.width = beforeImage.width;
    canvas.height = beforeImage.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas comparison is unavailable.');
    context.drawImage(beforeImage, 0, 0);
    const beforePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(afterImage, 0, 0);
    const afterPixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let changedPixels = 0;
    let channelDelta = 0;
    for (let index = 0; index < beforePixels.length; index += 4) {
      const red = Math.abs(beforePixels[index] - afterPixels[index]);
      const green = Math.abs(beforePixels[index + 1] - afterPixels[index + 1]);
      const blue = Math.abs(beforePixels[index + 2] - afterPixels[index + 2]);
      if (Math.max(red, green, blue) >= 12) changedPixels += 1;
      channelDelta += red + green + blue;
    }
    const pixelCount = canvas.width * canvas.height;
    return {
      changedPixelPercent: Number(((changedPixels / pixelCount) * 100).toFixed(3)),
      meanAbsoluteChannelDelta: Number((channelDelta / (pixelCount * 3)).toFixed(3))
    };
  }, { beforeUrl: before, afterUrl: after });
}

async function waitForState(page: Page, state: CaptureState): Promise<void> {
  await page.goto(state.url, { waitUntil: 'networkidle' });
  if (state.workspace === 'portfolio') await page.getByTestId('neutral-launcher').waitFor({ state: 'visible' });
  if (state.workspace === 'experience') await page.getByTestId('experience-twin-workspace').waitFor({ state: 'visible' });
  if (state.workspace === 'rehearsal') await page.getByTestId('experience-rehearsal-workspace').waitFor({ state: 'visible' });
  await page.locator('[data-testid="experience-asset-loading"], [data-testid="experience-scene-loading"]').first().waitFor({ state: 'detached', timeout: 5_000 }).catch(() => undefined);
  if (state.prepare) await state.prepare(page);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

function bundleMetrics() {
  const assetRoot = path.join(repositoryRoot, 'dist', 'assets');
  return readdirSync(assetRoot).filter((file) => /\.(js|css)$/.test(file)).sort().map((file) => {
    const bytes = readFileSync(path.join(assetRoot, file));
    return { file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  });
}

function initialBundleGzipBytes(metrics: ReturnType<typeof bundleMetrics>): number {
  const index = readFileSync(path.join(repositoryRoot, 'dist', 'index.html'), 'utf8');
  const initialFiles = new Set([...index.matchAll(/assets\/([^"']+\.(?:js|css))/g)].map((match) => match[1]));
  return metrics.filter((item) => initialFiles.has(item.file)).reduce((sum, item) => sum + item.gzipBytes, 0);
}

rmSync(reviewRoot, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(reviewRoot, { recursive: true });
if (!existsSync(path.join(waveABaselineRoot, 'review-manifest.json'))) throw new Error('The reviewed Wave A baseline package is unavailable.');

const browser = await chromium.launch({ headless: true });
const allHashes = new Set<string>();
const externalRequests = new Set<string>();
const visualDifferences: VisualDifferenceRecord[] = [];
let screenshotCount = 0;
try {
  for (const resolution of resolutions) {
    const resolutionName = `${resolution.width}x${resolution.height}`;
    const directory = path.join(reviewRoot, 'screenshots', resolutionName);
    mkdirSync(directory, { recursive: true });
    const page = await browser.newPage({ viewport: resolution, deviceScaleFactor: 1, locale: 'ar-SA', colorScheme: 'light', reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => {
      const target = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(target.hostname)) externalRequests.add(request.url());
    });
    const records: ScreenshotRecord[] = [];
    for (const comparison of comparisons) {
      const beforeSource = path.join(waveABaselineRoot, 'screenshots', resolutionName, comparison.baselineFile);
      const beforeDestination = path.join(directory, comparison.baselineOutputFile);
      copyFileSync(beforeSource, beforeDestination);
      const beforeBytes = readFileSync(beforeDestination);
      const beforeDimensions = pngDimensions(beforeBytes);
      const beforeHash = sha256(beforeBytes);
      if (beforeDimensions.width !== resolution.width || beforeDimensions.height !== resolution.height) throw new Error(`Wrong baseline dimensions: ${comparison.view} at ${resolutionName}`);
      if (allHashes.has(beforeHash)) throw new Error(`Duplicate baseline screenshot SHA-256: ${comparison.view} at ${resolutionName}`);
      allHashes.add(beforeHash);
      records.push({ file: comparison.baselineOutputFile, labelAr: comparison.labelAr, width: beforeDimensions.width, height: beforeDimensions.height, sha256: beforeHash });
      screenshotCount += 1;
    }
    for (const state of states) {
      await waitForState(page, state);
      const filePath = path.join(directory, state.file);
      await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
      const bytes = readFileSync(filePath);
      const dimensions = pngDimensions(bytes);
      const hash = sha256(bytes);
      if (dimensions.width !== resolution.width || dimensions.height !== resolution.height) throw new Error(`Wrong dimensions: ${state.file}`);
      if (allHashes.has(hash)) throw new Error(`Duplicate screenshot SHA-256: ${state.file}`);
      allHashes.add(hash);
      records.push({ file: state.file, labelAr: state.labelAr, width: dimensions.width, height: dimensions.height, sha256: hash });
      screenshotCount += 1;
    }
    for (const comparison of comparisons) {
      const difference = await compareScreenshots(page, path.join(directory, comparison.baselineOutputFile), path.join(directory, comparison.afterFile));
      if (difference.changedPixelPercent < 12) throw new Error(`Wave A.1 composition change is not material for ${comparison.view} at ${resolutionName}: ${difference.changedPixelPercent}%`);
      visualDifferences.push({ view: comparison.view, resolution: resolutionName, beforeFile: comparison.baselineOutputFile, afterFile: comparison.afterFile, ...difference });
    }
    if (errors.length) throw new Error(`Browser errors at ${resolutionName}:\n${errors.join('\n')}`);
    writeFileSync(path.join(directory, 'screenshots.json'), `${JSON.stringify({ featureCommit, resolution: resolutionName, screenshots: records }, null, 2)}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}

if (externalRequests.size) throw new Error(`External network requests detected:\n${[...externalRequests].join('\n')}`);

const documentation = [
  'docs/experience-twin/stage-ex1f-wave-a-visual-production-shell.md',
  'docs/experience-twin/stage-ex1f-wave-a1-founder-visual-hierarchy.md',
  'docs/experience-twin/stage-ex1f-final-integrated-review.md',
  'docs/experience-twin/ex1f-source-reconciliation-register.md',
  'docs/experience-twin/ex1f-four-day-truth-matrix.md',
  'docs/experience-twin/ex1f-persona-journey-register.md',
  'docs/experience-twin/ex1f-content-candidate-register.md',
  'docs/experience-twin/ex1f-conflict-and-resolution-register.md',
  'docs/experience-twin/ex1f-360-3d-asset-intake-status.md',
  'docs/experience-twin/ex1f-client-presentation-guide.md',
  'docs/experience-twin/ex1f-founder-acceptance-checklist.md',
  'docs/experience-twin/ex1f-remaining-inputs.md',
  'docs/architecture-decisions/ADR-EX005-final-integrated-experience-twin.md',
  'docs/architecture-decisions/ADR-EX006-controlled-experience-delivery-intake.md'
];
const documentationDirectory = path.join(reviewRoot, 'documentation');
mkdirSync(documentationDirectory, { recursive: true });
for (const relativePath of documentation) copyFileSync(path.join(repositoryRoot, relativePath), path.join(documentationDirectory, path.basename(relativePath)));
copyFileSync(path.join(repositoryRoot, 'pilot-input/manifests/kap-ex1f-source-reconciliation-v1.json'), path.join(reviewRoot, 'kap-ex1f-source-reconciliation-v1.json'));
copyFileSync(path.join(repositoryRoot, 'pilot-input/manifests/kap-ex1f-source-reconciliation-v2.json'), path.join(reviewRoot, 'kap-ex1f-source-reconciliation-v2.json'));
copyFileSync(path.join(repositoryRoot, 'pilot-input/manifests/kap-operational-delivery-manifest-template-v1.json'), path.join(reviewRoot, 'kap-operational-delivery-manifest-template-v1.json'));
copyFileSync(path.join(repositoryRoot, 'pilot-input/manifests/kap-studio-3d-delivery-manifest-template-v1.json'), path.join(reviewRoot, 'kap-studio-3d-delivery-manifest-template-v1.json'));

const metrics = bundleMetrics();
const totalGzipBytes = metrics.reduce((sum, item) => sum + item.gzipBytes, 0);
const initialGzipBytes = initialBundleGzipBytes(metrics);
const waveAReviewManifest = JSON.parse(readFileSync(path.join(waveABaselineRoot, 'review-manifest.json'), 'utf8')) as { featureCommit: string };
const waveABundleReview = JSON.parse(readFileSync(path.join(waveABaselineRoot, 'bundle-metrics.json'), 'utf8')) as { comparison: { waveA: { initialGzipBytes: number; totalGzipBytes: number } } };
const waveABundle = waveABundleReview.comparison.waveA;
const bundleComparison = {
  baselineCommit: waveAReviewManifest.featureCommit,
  waveA: waveABundle,
  waveA1: { initialGzipBytes, totalGzipBytes },
  delta: {
    initialGzipBytes: initialGzipBytes - waveABundle.initialGzipBytes,
    initialPercent: Number((((initialGzipBytes - waveABundle.initialGzipBytes) / waveABundle.initialGzipBytes) * 100).toFixed(3)),
    totalGzipBytes: totalGzipBytes - waveABundle.totalGzipBytes,
    totalPercent: Number((((totalGzipBytes - waveABundle.totalGzipBytes) / waveABundle.totalGzipBytes) * 100).toFixed(3))
  }
};
writeFileSync(path.join(reviewRoot, 'bundle-metrics.json'), `${JSON.stringify({ featureCommit, assets: metrics, totalBytes: metrics.reduce((sum, item) => sum + item.bytes, 0), totalGzipBytes, initialGzipBytes, comparison: bundleComparison }, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'visual-difference.json'), `${JSON.stringify({ thresholdPercent: 12, comparisons: visualDifferences }, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'before-after-comparison.md'), [
  '# Wave A.1 Before / After',
  '',
  '- Five reviewed Wave A compositions are preserved beside the corresponding A.1 views at every required resolution.',
  '- Comparisons cover the entry, Story Map, persona journey, Client Presentation and Experience-to-Command moment.',
  '- `visual-difference.json` records each pixel-level comparison and enforces a 12% minimum composition delta.',
  '',
  'Pixel difference is supporting visual evidence, not founder acceptance. A.1 does not promote source, route, scene or readiness truth.',
  ''
].join('\n'));

const manifest = {
  stage: 'EX.1F Wave A.1',
  status: 'READY_FOR_FOUNDER_VISUAL_WOW_REVIEW',
  featureCommit,
  mainBaseline: '894fa504e331e6cf890753db8726b2e4de6e5bc1',
  projectionId: kapFourDayExperienceTruthProjection.projectionId,
  projectionHash: kapFourDayExperienceTruthProjection.contentHash,
  sourceCount: 3,
  sourceFactCount: kapFourDayExperienceTruthProjection.sourceFacts.length,
  conflictCount: kapFourDayExperienceTruthProjection.sourceConflicts.length,
  dayCount: 4,
  destinationCount: 11,
  rehearsalCounts: kapFourDayExperienceTruthProjection.preservedCounts,
  clientPresentationStepCount: 14,
  deliveryLanes: kapExperienceDeliveryReadinessProjection.lanes,
  operationalManifestAccepted: false,
  studio3DManifestAccepted: false,
  operationalReadiness: 'cannot-determine',
  kapPanoramaAvailable: false,
  kapProductionGlbAvailable: false,
  rawSourceIncluded: false,
  restrictedHseDetailsIncluded: false,
  piiIncluded: false,
  gpsIncluded: false,
  credentialsIncluded: false,
  externalNetworkRequests: 0,
  screenshotCount,
  uniqueScreenshotHashCount: allHashes.size,
  visualDifferences,
  resolutions: resolutions.map((resolution) => `${resolution.width}x${resolution.height}`),
  silentWalkthroughIncluded: false,
  silentWalkthroughReason: 'لم تتوفر أداة تسجيل محلية قائمة دون إضافة تبعية؛ لم يُحجب التسليم.'
};
writeFileSync(path.join(reviewRoot, 'review-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'README.md'), [
  '# Mayadeen Stage EX.1F Wave A.1 Founder Visual Review',
  '',
  'حزمة مراجعة لتصحيح الهرمية البصرية وهيمنة السطح المكاني وتجربة العرض التنفيذي.',
  'KAP remains operationally cannot-determine. No route, geometry, HSE, opening,',
  '360, production 3D, live-data, or Stage 4 claim is made.',
  '',
  'Raw PDF, DWG, video, panorama, GLB and restricted HSE details are excluded.',
  ''
].join('\n'));

const textFiles = [path.join(reviewRoot, 'README.md'), path.join(reviewRoot, 'review-manifest.json'), path.join(reviewRoot, 'bundle-metrics.json'), path.join(reviewRoot, 'visual-difference.json'), path.join(reviewRoot, 'before-after-comparison.md'), path.join(reviewRoot, 'kap-ex1f-source-reconciliation-v1.json'), path.join(reviewRoot, 'kap-ex1f-source-reconciliation-v2.json'), path.join(reviewRoot, 'kap-operational-delivery-manifest-template-v1.json'), path.join(reviewRoot, 'kap-studio-3d-delivery-manifest-template-v1.json'), ...documentation.map((relativePath) => path.join(documentationDirectory, path.basename(relativePath)))];
for (const filePath of textFiles) {
  const text = readFileSync(filePath, 'utf8');
  if (/\/Users\//.test(text) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) || /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i.test(text) || /"(?:latitude|longitude|coordinates|gpsLatitude|gpsLongitude)"\s*:/i.test(text)) throw new Error(`Sensitive data found: ${path.basename(filePath)}`);
}

const forbiddenExtensions = new Set(['.pdf', '.dwg', '.dxf', '.xlsx', '.pptx', '.heic', '.heif', '.mp4', '.mov', '.glb', '.gltf']);
for (const directory of readdirSync(path.join(reviewRoot, 'screenshots'))) {
  const records = JSON.parse(readFileSync(path.join(reviewRoot, 'screenshots', directory, 'screenshots.json'), 'utf8')) as { screenshots: ScreenshotRecord[] };
  if (records.screenshots.length !== states.length + comparisons.length) throw new Error(`Incomplete screenshot manifest: ${directory}`);
}
const allReviewFiles = execFileSync('find', [reviewRoot, '-type', 'f'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
if (allReviewFiles.some((file) => forbiddenExtensions.has(path.extname(file).toLowerCase()))) throw new Error('Forbidden raw source or model entered the review package.');
if (statSync(reviewRoot).isSymbolicLink()) throw new Error('Review root cannot be a symlink.');

execFileSync('zip', ['-X', '-q', '-r', zipPath, bundleName], { cwd: path.dirname(reviewRoot) });
execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' });
const zipHash = sha256(readFileSync(zipPath));
process.stdout.write(`${JSON.stringify({ status: 'review-package-ready', path: zipPath, sha256: zipHash, screenshotCount, uniqueScreenshotHashCount: allHashes.size, dimensionsVerified: true, unzipVerified: true, externalNetworkRequests: 0 }, null, 2)}\n`);
