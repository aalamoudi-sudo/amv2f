import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

interface ReviewState {
  file: string;
  labelAr: string;
  query: string;
  targetTestId: string;
  prepare?: (page: Page) => Promise<void>;
}

const root = process.cwd();
const origin = process.env.EX1F_WAVE_B_REVIEW_ORIGIN ?? 'http://127.0.0.1:4196';
const bundleName = 'mayadeen-ex1f-wave-b-majed-v11-route-review';
const reviewRoot = path.join(os.homedir(), 'Downloads', bundleName);
const zipPath = `${reviewRoot}.zip`;
const scope = 'workspace=experience-twin&project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const resolutions = [{ width: 1_366, height: 768 }, { width: 1_920, height: 1_080 }, { width: 2_560, height: 1_080 }] as const;
const delivery = 'experienceMode=delivery&deliveryView=routes';
const states: ReviewState[] = [
  { file: '01-intake-overview.png', labelAr: 'حزمة تشغيل واحدة مستلمة بلا قبول أو ربط', query: 'experienceMode=delivery&deliveryView=overview', targetTestId: 'delivery-overview' },
  { file: '02-workers-journey.png', labelAr: 'رحلة العاملين المرشحة في 31 أكتوبر', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-10-31&deliveryJourney=JOURNEY-KAP-20261031-WORKERS-V11`, targetTestId: 'delivery-route-review' },
  { file: '03-leadership-journey.png', labelAr: 'رحلة القيادة المرشحة في 2 نوفمبر', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-11-02&deliveryJourney=JOURNEY-KAP-20261102-LEADERSHIP-V11`, targetTestId: 'delivery-route-review' },
  { file: '04-media-duration-clarified.png', labelAr: 'رحلة الإعلام 275 دقيقة بمحاسبة شاملة متتبعة', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-11-03&deliveryJourney=JOURNEY-KAP-20261103-MEDIA-V11`, targetTestId: 'delivery-route-review' },
  { file: '05-november-1-route-not-applicable.png', labelAr: 'تصحيح عدم انطباق رحلة 1 نوفمبر', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-11-01`, targetTestId: 'v11-route-not-applicable-20261101' },
  { file: '06-v02-v11-comparison.png', labelAr: 'تعايش V.02 وV.11 دون استبدال تلقائي', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-10-31&deliveryJourney=JOURNEY-KAP-20261031-WORKERS-V11`, targetTestId: 'v02-v11-coexistence', prepare: async (page) => { await page.getByTestId('v02-v11-coexistence').scrollIntoViewIfNeeded(); } },
  { file: '07-operational-gaps.png', labelAr: 'الفجوات التشغيلية وسلطات المسار', query: `${delivery}&deliveryJourneyDay=DAY-KAP-2026-11-03&deliveryJourney=JOURNEY-KAP-20261103-MEDIA-V11`, targetTestId: 'delivery-route-review', prepare: async (page) => { await page.locator('.delivery-route-gaps summary').click(); await page.locator('.delivery-route-gaps').scrollIntoViewIfNeeded(); } },
  { file: '08-client-route-disclosure.png', labelAr: 'عرض العميل يخفي تفاصيل المسار ويظهر حالة المرشح', query: 'experienceMode=presentation&presentationStep=11', targetTestId: 'experience-client-presentation' }
];

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function dimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error('Invalid PNG screenshot.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const tracked = execFileSync('git', ['status', '--short', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).trim();
if (tracked) throw new Error('Wave B visual review packaging requires a clean committed feature worktree.');
const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
rmSync(reviewRoot, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(reviewRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const hashes = new Set<string>();
const externalRequests = new Set<string>();
let screenshotCount = 0;
try {
  for (const resolution of resolutions) {
    const resolutionName = `${resolution.width}x${resolution.height}`;
    const directory = path.join(reviewRoot, 'screenshots', resolutionName);
    mkdirSync(directory, { recursive: true });
    const page = await browser.newPage({ viewport: resolution, deviceScaleFactor: 1, locale: 'ar-SA', colorScheme: 'light', reducedMotion: 'reduce' });
    const browserErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('request', (request) => {
      const target = new URL(request.url());
      if (['http:', 'https:'].includes(target.protocol) && !['127.0.0.1', 'localhost'].includes(target.hostname)) externalRequests.add(request.url());
    });
    const screenshots: Array<{ file: string; labelAr: string; width: number; height: number; sha256: string }> = [];
    for (const state of states) {
      await page.goto(`${origin}/?${scope}&${state.query}`, { waitUntil: 'networkidle' });
      await page.getByTestId(state.targetTestId).waitFor({ state: 'visible' });
      if (state.prepare) await state.prepare(page);
      const workspaceText = await page.getByTestId('experience-twin-workspace').innerText();
      if (workspaceText.includes('/Users/') || workspaceText.includes('private-input/')) throw new Error(`Private source path visible in ${state.file}`);
      if (state.file === '08-client-route-disclosure.png' && /450|1400|255|275|JOURNEY-KAP/u.test(workspaceText)) throw new Error('Client presentation exposed restricted route detail.');
      const filePath = path.join(directory, state.file);
      await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
      const bytes = readFileSync(filePath);
      const size = dimensions(bytes);
      const hash = sha256(bytes);
      if (size.width !== resolution.width || size.height !== resolution.height) throw new Error(`Wrong screenshot dimensions: ${state.file}`);
      if (hashes.has(hash)) throw new Error(`Duplicate screenshot SHA-256: ${state.file} at ${resolutionName}`);
      hashes.add(hash);
      screenshots.push({ file: state.file, labelAr: state.labelAr, ...size, sha256: hash });
      screenshotCount += 1;
    }
    if (browserErrors.length) throw new Error(`Browser errors at ${resolutionName}:\n${browserErrors.join('\n')}`);
    writeFileSync(path.join(directory, 'screenshots.json'), `${JSON.stringify({ featureCommit, resolution: resolutionName, screenshots }, null, 2)}\n`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (externalRequests.size) throw new Error(`External requests detected:\n${[...externalRequests].join('\n')}`);

const docs = [
  'docs/experience-twin/ex1f-wave-b-majed-v11-intake.md',
  'docs/experience-twin/kap-20261101-founder-truth-correction.md',
  'docs/experience-twin/kap-v11-journey-register.md',
  'docs/experience-twin/kap-v11-duration-reconciliation.md',
  'docs/experience-twin/kap-v11-founder-duration-accounting-clarification.md',
  'docs/experience-twin/kap-route-source-comparison-v02-v11.md',
  'docs/experience-twin/kap-route-authority-and-gap-register.md'
];
mkdirSync(path.join(reviewRoot, 'documentation'), { recursive: true });
for (const file of docs) copyFileSync(path.join(root, file), path.join(reviewRoot, 'documentation', path.basename(file)));
writeFileSync(path.join(reviewRoot, 'intake-result.json'), `${JSON.stringify({
  workPackage: 'Stage EX.1F Wave B Majed V.11 intake',
  status: 'READY_FOR_FOUNDER_WAVE_B_ROUTE_REVIEW',
  featureCommit,
  source: {
    safeFilename: 'اقتراحات الدخول V.11.pdf',
    byteSize: 3_201_469,
    sha256: 'a5befcff7e2bb8b44c09123fe7fb730eec79bd57bd37398fa9a09753e55b5377',
    pageCount: 7,
    authority: 'operational-team-supplied-working-candidate',
    packageStatus: 'received-validated-working-candidate',
    founderReview: 'pending'
  },
  journeys: 6,
  candidateTouchpoints: 6,
  openConflicts: 2,
  resolvedDurationConflicts: 6,
  operationalGaps: 24,
  resolvedDurationGaps: 2,
  realPackageCounts: { received: 1, fingerprintVerified: 1, founderApproved: 0, operationallyApproved: 0 },
  routeCounts: { approved: 0, canonicalSpatialRoutes: 0 },
  operationalReadiness: 'cannot-determine',
  rawSourcesIncluded: 0,
  privatePathsIncluded: 0,
  privateContactDataIncluded: 0,
  gpsIncluded: 0,
  secretsIncluded: 0
}, null, 2)}\n`);
writeFileSync(path.join(reviewRoot, 'review-manifest.json'), `${JSON.stringify({ resolutions, screenshotCount, uniqueScreenshotHashes: hashes.size }, null, 2)}\n`);
execFileSync('zip', ['-q', '-r', zipPath, bundleName], { cwd: path.dirname(reviewRoot) });
execFileSync('unzip', ['-t', zipPath], { stdio: 'ignore' });
const zipHash = sha256(readFileSync(zipPath));
process.stdout.write(`${JSON.stringify({ status: 'READY_FOR_FOUNDER_WAVE_B_ROUTE_REVIEW', zipPath, sha256: zipHash, screenshotCount, uniqueScreenshotHashes: hashes.size }, null, 2)}\n`);
