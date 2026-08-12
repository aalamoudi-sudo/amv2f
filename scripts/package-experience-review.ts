import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { kapExperienceTwinPackId } from '../src/data/experienceTwinIds';

interface CaptureState {
  file: string;
  labelAr: string;
  url: string;
  prepare?: (page: Page) => Promise<void>;
}

interface ScreenshotRecord {
  file: string;
  labelAr: string;
  width: number;
  height: number;
  sha256: string;
}

const origin = process.env.EXPERIENCE_REVIEW_ORIGIN ?? 'http://127.0.0.1:4192';
const bundleName = 'mayadeen-stage-ex1a-additive-four-day-experience-twin-review';
const reviewRoot = path.join(os.homedir(), 'Downloads', bundleName);
const zipPath = `${reviewRoot}.zip`;
const repositoryRoot = process.cwd();
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceHash = '9663f853eda07ac131a0390968b0ff5e3cf4e0d6e72137050b15a18daac8099d';
const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const basic = `${scope}&scenario=SCENARIO-KAP-BASIC-2026`;
const day1 = `${basic}&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026`;
const day2 = `${basic}&day=DAY-KAP-2026-11-01&persona=PERSONA-KAP-ROYAL-VIP&journey=JOURNEY-KAP-ROYAL-2026`;
const day3 = `${basic}&day=DAY-KAP-2026-11-02&persona=PERSONA-KAP-REGIONAL-LEADERSHIP&journey=JOURNEY-KAP-REGIONAL-2026`;
const day4 = `${basic}&day=DAY-KAP-2026-11-03&persona=PERSONA-KAP-MEDIA-CONTENT&journey=JOURNEY-KAP-PRESS-2026`;
const url = (query: string) => `${origin}/?workspace=experience-twin&${query}`;
const states: CaptureState[] = [
  { file: '01-portfolio-entry.png', labelAr: 'مدخل المحفظة', url: `${origin}/?workspace=portfolio` },
  { file: '02-four-day-overview.png', labelAr: 'نظرة الأيام الأربعة', url: url(`${day1}&step=STEP-KAP-PREOPEN-ARRIVAL&lens=experience&mapMode=illustrated&viewMode=split`) },
  { file: '03-day1-family-journey.png', labelAr: 'اليوم الأول ورحلة العائلات', url: url(`${day1}&step=STEP-KAP-PREOPEN-AGES&lens=experience&mapMode=illustrated&viewMode=scene-focus`) },
  { file: '04-day2-royal-journey.png', labelAr: 'اليوم الثاني والرحلة الملكية', url: url(`${day2}&step=STEP-KAP-ROYAL-ARRIVAL&lens=protocol&mapMode=illustrated&viewMode=split`) },
  { file: '05-day3-regional-journey.png', labelAr: 'اليوم الثالث ورحلة القيادة الإقليمية', url: url(`${day3}&step=STEP-KAP-REGIONAL-AGES&lens=executive&mapMode=illustrated&viewMode=split`) },
  { file: '06-day4-media-journey.png', labelAr: 'اليوم الرابع ورحلة الإعلام', url: url(`${day4}&step=STEP-KAP-PRESS-PRESS-CONFERENCE&lens=content-and-show&mapMode=illustrated&viewMode=split`) },
  { file: '07-scenario-comparison.png', labelAr: 'مقارنة السيناريو الاحتفالي', url: url(`${scope}&scenario=SCENARIO-KAP-CELEBRATORY-2026&lens=executive&mapMode=illustrated&viewMode=split`) },
  { file: '08-persona-selection.png', labelAr: 'اختيار شخصية القيادات الإقليمية', url: url(`${day3}&step=STEP-KAP-REGIONAL-ARRIVAL&lens=experience&mapMode=operational&viewMode=map-focus`) },
  { file: '09-experience-lens.png', labelAr: 'عدسة عِش التجربة', url: url(`${day1}&step=STEP-KAP-PREOPEN-MODEL&lens=experience&mapMode=operational&viewMode=split`) },
  { file: '10-operations-lens.png', labelAr: 'عدسة التشغيل', url: url(`${day1}&step=STEP-KAP-PREOPEN-TOUR&lens=operations&mapMode=operational&viewMode=split`) },
  { file: '11-readiness-decision-lens.png', labelAr: 'عدسة الجاهزية والقرارات', url: url(`${day1}&step=STEP-KAP-PREOPEN-RECOGNITION&lens=readiness-and-decisions&mapMode=operational&viewMode=split`) },
  { file: '12-candidate-map.png', labelAr: 'الخريطة التشغيلية المرشحة', url: url(`${day1}&step=STEP-KAP-PREOPEN-AGES&entity=ENTITY-KAP-OP-006&lens=operations&mapMode=operational&viewMode=map-focus`) },
  { file: '13-gate-to-gate-timeline.png', labelAr: 'تسلسل البوابة إلى البوابة', url: url(`${day4}&step=STEP-KAP-PRESS-DINNER&lens=experience&mapMode=illustrated&viewMode=split`) },
  { file: '14-render-reference.png', labelAr: 'مرجع التصميم المرشح', url: url(`${day1}&step=STEP-KAP-PREOPEN-MODEL&lens=source-truth&mapMode=illustrated&viewMode=scene-focus`) },
  { file: '15-missing-360.png', labelAr: 'حالة مصدر 360 المفقود', url: url(`${day1}&step=STEP-KAP-PREOPEN-ARRIVAL&lens=source-truth&mapMode=panorama&viewMode=split`) },
  { file: '16-missing-web3d.png', labelAr: 'حالة نموذج Web3D المفقود', url: url(`${day1}&step=STEP-KAP-PREOPEN-ARRIVAL&lens=source-truth&mapMode=web3d&viewMode=split`) },
  { file: '17-source-truth-drawer.png', labelAr: 'درج حقيقة المصدر', url: url(`${day1}&step=STEP-KAP-PREOPEN-ARRIVAL&lens=source-truth&mapMode=illustrated&viewMode=split&drawer=truth`) },
  { file: '18-separate-ceremony-contexts.png', labelAr: 'سياقا 1 نوفمبر المنفصلان بلا رحلة تشغيلية', url: url(`${day2}&step=STEP-KAP-ROYAL-ARRIVAL&lens=protocol&mapMode=operational&viewMode=map-focus`) },
  { file: '19-unresolved-show.png', labelAr: 'العرض غير المحسوم مكانيًا', url: url(`${day2}&step=STEP-KAP-ROYAL-MAIN-SHOW&lens=readiness-and-decisions&mapMode=operational&viewMode=split`) },
  { file: '20-fictional-conference.png', labelAr: 'مرجع مؤتمر خيالي معزول', url: `${origin}/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001` }
];
const resolutions = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }] as const;

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('Invalid PNG screenshot.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function waitForWorkspace(page: Page, state: CaptureState): Promise<void> {
  await page.goto(state.url, { waitUntil: 'networkidle' });
  if (state.file.startsWith('01-')) await page.getByTestId('neutral-launcher').waitFor({ state: 'visible' });
  else await page.getByTestId('experience-twin-workspace').waitFor({ state: 'visible' });
  await page.locator('[data-testid="experience-asset-loading"], [data-testid="experience-scene-loading"]').first().waitFor({ state: 'detached', timeout: 5_000 }).catch(() => undefined);
  if (state.prepare) await state.prepare(page);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

rmSync(reviewRoot, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(reviewRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const allHashes = new Set<string>();
let screenshotCount = 0;
try {
  for (const resolution of resolutions) {
    const resolutionName = `${resolution.width}x${resolution.height}`;
    const directory = path.join(reviewRoot, 'screenshots', resolutionName);
    mkdirSync(directory, { recursive: true });
    const page = await browser.newPage({ viewport: resolution, deviceScaleFactor: 1, locale: 'ar-SA', colorScheme: 'light' });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const records: ScreenshotRecord[] = [];
    for (const state of states) {
      await waitForWorkspace(page, state);
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
    if (errors.length) throw new Error(`Browser errors at ${resolutionName}:\n${errors.join('\n')}`);
    writeFileSync(path.join(directory, 'screenshots.json'), `${JSON.stringify({ featureCommit, resolution: resolutionName, screenshots: records }, null, 2)}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}

const documentation = [
  'docs/experience/stage-ex1a-additive-experience-twin-foundation.md',
  'docs/experience/experience-twin-domain-model.md',
  'docs/experience/four-day-digital-rehearsal.md',
  'docs/experience/experience-scene-asset-contract.md',
  'docs/experience/360-and-web3d-source-requirements.md',
  'docs/experience/kap-four-day-source-extraction.md',
  'docs/experience/kap-experience-input-gap-register.md',
  'docs/experience/studio-delivery-request.md',
  'docs/architecture-decisions/ADR-018-additive-experience-projection-layer.md'
];
const documentationDirectory = path.join(reviewRoot, 'documentation');
mkdirSync(documentationDirectory, { recursive: true });
for (const relativePath of documentation) copyFileSync(path.join(repositoryRoot, relativePath), path.join(documentationDirectory, path.basename(relativePath)));
copyFileSync(path.join(repositoryRoot, 'pilot-input/manifests/kap-experience-source-v1.json'), path.join(reviewRoot, 'kap-experience-source-v1.json'));

const manifest = {
  stage: 'EX.1A',
  status: 'READY_FOR_FOUNDER_STAGE_EX1A_REVIEW',
  featureCommit,
  startingMain: '894fa504e331e6cf890753db8726b2e4de6e5bc1',
  sourceId: 'SOURCE-KAP-PRESENTATION-V16-20260712',
  sourceSha256: sourceHash,
  packId: kapExperienceTwinPackId,
  scenarioCount: 4,
  detailedDayCount: 4,
  journeyStepCount: 40,
  experienceAreaCount: 8,
  candidateEntityReferenceCount: 11,
  operationalReadiness: 'cannot-determine',
  frozen: false,
  activated: false,
  baseline: false,
  realKapPanoramaAvailable: false,
  registeredKapWeb3dAvailable: false,
  screenshotCount,
  uniqueScreenshotHashCount: allHashes.size,
  resolutions: resolutions.map((resolution) => `${resolution.width}x${resolution.height}`),
  rawSourceIncluded: false,
  piiIncluded: false,
  gpsIncluded: false,
  credentialsIncluded: false
};
writeFileSync(path.join(reviewRoot, 'review-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'README.md'), [
  '# Mayadeen Stage EX.1A Founder Review',
  '',
  'This archive contains viewport screenshots, safe source metadata, and the',
  'Stage EX.1A architecture documents. The Experience Twin is an additive',
  'candidate projection and deterministic local rehearsal.',
  '',
  'KAP remains operationally cannot-determine. No baseline, geometry, route,',
  'readiness, decision, evidence, panorama, live-data, or Stage 4 claim is made.',
  '',
  'The raw PDF and native design sources are excluded.',
  ''
].join('\n'));

const textFiles = [path.join(reviewRoot, 'README.md'), path.join(reviewRoot, 'review-manifest.json'), path.join(reviewRoot, 'kap-experience-source-v1.json'), ...documentation.map((relativePath) => path.join(documentationDirectory, path.basename(relativePath)))];
for (const filePath of textFiles) {
  const text = readFileSync(filePath, 'utf8');
  if (/\/Users\//.test(text) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) || /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i.test(text) || /"(?:latitude|longitude|coordinates|gpsLatitude|gpsLongitude)"\s*:/i.test(text)) throw new Error(`Sensitive data found: ${path.basename(filePath)}`);
}

for (const directory of readdirSync(path.join(reviewRoot, 'screenshots'))) {
  const records = JSON.parse(readFileSync(path.join(reviewRoot, 'screenshots', directory, 'screenshots.json'), 'utf8')) as { screenshots: ScreenshotRecord[] };
  if (records.screenshots.length !== states.length) throw new Error(`Incomplete screenshot manifest: ${directory}`);
}
if (statSync(reviewRoot).isSymbolicLink()) throw new Error('Review root cannot be a symlink.');
execFileSync('zip', ['-X', '-q', '-r', zipPath, bundleName], { cwd: path.dirname(reviewRoot) });
execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' });
const zipHash = sha256(readFileSync(zipPath));
process.stdout.write(`${JSON.stringify({ status: 'review-package-ready', path: zipPath, sha256: zipHash, screenshotCount, uniqueScreenshotHashCount: allHashes.size, dimensionsVerified: true, unzipVerified: true }, null, 2)}\n`);
